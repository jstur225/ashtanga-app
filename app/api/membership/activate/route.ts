import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureProfileAndGetId } from '@/lib/membership-utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 调试：检查环境变量
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[Membership API] 环境变量缺失:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_SERVICE_KEY,
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  })
}

/**
 * 会员激活 API
 * POST /api/membership/activate
 *
 * 请求体:
 *   { code: "XXXX-XXXX-XXXX" }
 *
 * 响应:
 *   成功: { success: true, data: { expires_at: "2025-07-14T10:30:00Z", days: 90, is_new: true } }
 *   失败: { success: false, error: "INVALID_CODE" | "CODE_USED" | "CODE_EXPIRED" }
 */

// POST - 激活会员
export async function POST(request: NextRequest) {
  console.log('[Membership API] 收到激活请求')

  try {
    // 1. 验证用户登录
    const authHeader = request.headers.get('authorization')
    console.log('[Membership API] authHeader:', authHeader ? '存在' : '不存在')

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED', debug: '缺少 Authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[Membership API] token 长度:', token.length)

    let supabase
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    } catch (e: any) {
      console.error('[Membership API] 创建 Supabase 客户端失败:', e)
      return NextResponse.json(
        { success: false, error: 'CONFIG_ERROR', debug: '创建 Supabase 客户端失败: ' + e.message },
        { status: 500 }
      )
    }

    console.log('[Membership API] 正在验证 token...')
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError) {
        console.error('[Membership API] 验证 token 失败:', authError)
        return NextResponse.json(
          { success: false, error: 'NOT_AUTHENTICATED', debug: 'Token 验证失败: ' + authError.message },
          { status: 401 }
        )
      }
      user = authUser
    } catch (e: any) {
      console.error('[Membership API] 验证 token 异常:', e)
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED', debug: 'Token 验证异常: ' + e.message },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED', debug: '用户不存在' },
        { status: 401 }
      )
    }

    console.log('[Membership API] 用户验证成功:', user.id)

    // 2. 解析请求体
    let body
    try {
      body = await request.json()
      console.log('[Membership API] 请求体:', body)
    } catch (e: any) {
      console.error('[Membership API] 解析请求体失败:', e)
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST', debug: '解析请求体失败: ' + e.message },
        { status: 400 }
      )
    }

    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MISSING_CODE' },
        { status: 400 }
      )
    }

    // 格式化激活码 (大写,去除空格)
    const formattedCode = code.toUpperCase().replace(/\s/g, '')
    console.log('[Membership API] 格式化后的激活码:', formattedCode)

    // 3. 验证激活码格式 (XXXX-XXXX-XXXX)
    const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    if (!codePattern.test(formattedCode)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE_FORMAT' },
        { status: 400 }
      )
    }

    // 4. 查询激活码
    console.log('[Membership API] 正在查询激活码...')
    let activationCode
    try {
      const result = await supabase
        .from('activation_codes')
        .select('id, code, type, duration_days, used, used_by, expires_at')
        .eq('code', formattedCode)
        .single()

      console.log('[Membership API] 查询激活码结果:', result)

      if (result.error) {
        console.error('[Membership API] 查询激活码错误:', result.error)
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_ERROR',
            details: result.error.message,
            debug: '查询激活码失败',
          },
          { status: 500 }
        )
      }
      activationCode = result.data
    } catch (err: any) {
      console.error('[Membership API] 查询激活码异常:', err)
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          details: err.message,
          debug: '查询激活码异常',
        },
        { status: 500 }
      )
    }

    if (!activationCode) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE' },
        { status: 400 }
      )
    }

    console.log('[Membership API] 查询到激活码:', { id: activationCode.id, used: activationCode.used, type: activationCode.type })

    // 5. 检查激活码是否已使用
    if (activationCode.used) {
      console.log('[Membership API] 激活码已被使用, used_by:', activationCode.used_by)
      return NextResponse.json(
        { success: false, error: 'CODE_USED' },
        { status: 400 }
      )
    }

    // 6. 检查激活码是否过期
    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'CODE_EXPIRED' },
        { status: 400 }
      )
    }

    // 7. 确保用户有 profile 记录，获取 profileId
    console.log('[Membership API] 确保 profile 存在...')
    let profileId: string
    try {
      profileId = await ensureProfileAndGetId(supabase, user)
    } catch (e: any) {
      console.error('[Membership API] profile 处理失败:', e)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', details: e.message },
        { status: 500 }
      )
    }

    console.log('[Membership API] 使用 profileId:', profileId)

    // 查询当前会员状态
    let currentMembership: { is_active: boolean; expires_at: string | null } | null = null
    try {
      const result = await supabase
        .from('user_membership_status')
        .select('is_active, expires_at')
        .eq('user_id', profileId)
        .maybeSingle()

      console.log('[Membership API] 查询会员状态结果:', result)

      if (result.error) {
        console.error('[Membership API] 查询会员状态失败:', result.error)
        // 不阻止流程，按新会员处理
      } else {
        currentMembership = result.data
        console.log('[Membership API] 当前会员状态:', currentMembership)
      }
    } catch (err: any) {
      console.error('[Membership API] 查询会员状态异常:', err)
      // 不阻止流程，按新会员处理
    }

    const now = new Date()

    let newExpiresAt: Date
    let isNewMembership = false

    // 8. 计算新的到期时间
    if (currentMembership?.is_active && currentMembership.expires_at) {
      // 续费: 从原到期时间累加
      const currentExpiresAt = new Date(currentMembership.expires_at)
      newExpiresAt = new Date(currentExpiresAt.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
      console.log('[Membership API] 续费, 原到期时间:', currentExpiresAt, '新到期时间:', newExpiresAt)
    } else {
      // 新开通: 从当前时间开始
      newExpiresAt = new Date(now.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
      isNewMembership = true
      console.log('[Membership API] 新开通, 到期时间:', newExpiresAt)
    }

    // 9. 创建会员记录
    console.log('[Membership API] 创建会员记录...')
    try {
      const result = await supabase
        .from('user_memberships')
        .insert({
          user_id: profileId,
          email: user.email,
          type: activationCode.type,
          started_at: now.toISOString(),
          expires_at: newExpiresAt.toISOString(),
          activated_by_code_id: activationCode.id,
        })

      console.log('[Membership API] 创建会员记录结果:', result)

      if (result.error) {
        console.error('[Membership API] 创建会员记录失败:', result.error)
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR', details: '创建会员记录失败: ' + result.error.message },
          { status: 500 }
        )
      }
    } catch (e: any) {
      console.error('[Membership API] 创建会员记录异常:', e)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', details: '创建会员记录异常: ' + e.message },
        { status: 500 }
      )
    }

    // 10. 标记激活码为已使用
    console.log('[Membership API] 标记激活码为已使用, code:', activationCode.code)
    try {
      // ⭐ 不保存 used_by 避免外键约束问题
      const result = await supabase
        .from('activation_codes')
        .update({
          used: true,
          used_at: now.toISOString(),
        })
        .eq('code', activationCode.code)
        .select()

      console.log('[Membership API] 更新激活码结果:', result)

      if (result.error) {
        console.error('[Membership API] 更新激活码状态失败:', result.error)
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR', details: '激活码状态更新失败: ' + result.error.message },
          { status: 500 }
        )
      }

      console.log('[Membership API] 激活码已成功标记为已使用')
    } catch (e: any) {
      console.error('[Membership API] 更新激活码异常:', e)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', details: '更新激活码异常: ' + e.message },
        { status: 500 }
      )
    }

    // 11. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        expires_at: newExpiresAt.toISOString(),
        expires_at_formatted: newExpiresAt.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '.'),
        days: activationCode.duration_days,
        type: activationCode.type,
        is_new: isNewMembership,
      },
    })
  } catch (error: any) {
    console.error('[Membership API] 服务器错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message,
        envCheck: {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SUPABASE_SERVICE_KEY,
        }
      },
      { status: 500 }
    )
  }
}
