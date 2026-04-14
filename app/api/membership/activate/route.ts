import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  try {
    // 1. 验证用户登录
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MISSING_CODE' },
        { status: 400 }
      )
    }

    // 格式化激活码 (大写,去除空格)
    const formattedCode = code.toUpperCase().replace(/\s/g, '')

    // 3. 验证激活码格式 (XXXX-XXXX-XXXX)
    const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    if (!codePattern.test(formattedCode)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE_FORMAT' },
        { status: 400 }
      )
    }

    // 4. 查询激活码
    let activationCode
    try {
      const result = await supabase
        .from('activation_codes')
        .select('id, code, type, duration_days, used, used_by, expires_at')
        .eq('code', formattedCode)
        .single()

      if (result.error) {
        console.error('[Membership API] 查询激活码错误:', result.error)
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_ERROR',
            details: result.error.message,
            hint: '检查 activation_codes 表是否存在'
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

    // 5. 检查激活码是否已使用
    if (activationCode.used) {
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

    // 7. 查询用户当前会员状态
    let currentMembership: { is_active: boolean; expires_at: string | null } | null = null
    try {
      const { data, error } = await supabase
        .from('user_membership_status')
        .select('is_active, expires_at')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('[Membership API] 查询会员状态失败:', error)
        // 不阻止流程，按新会员处理
      } else {
        currentMembership = data
      }
    } catch (err: any) {
      console.error('[Membership API] 查询会员状态异常:', err)
      // 不阻止流程，按新会员处理
    }

    const now = new Date()

    // ⭐ 确保用户有 profile 记录
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let profileId: string

    if (!existingProfile) {
      console.log('[Membership API] 创建用户 profile:', user.id)
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || '用户',
          signature: '',
          is_pro: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select('id')
        .single()

      if (profileError || !newProfile) {
        console.error('[Membership API] 创建 profile 失败:', profileError)
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR', details: '创建用户资料失败: ' + (profileError?.message || '未知错误') },
          { status: 500 }
        )
      }
      profileId = newProfile.id
    } else {
      profileId = existingProfile.id
    }

    let newExpiresAt: Date
    let isNewMembership = false

    // 8. 计算新的到期时间
    if (currentMembership?.is_active && currentMembership.expires_at) {
      // 续费: 从原到期时间累加
      const currentExpiresAt = new Date(currentMembership.expires_at)
      newExpiresAt = new Date(currentExpiresAt.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
    } else {
      // 新开通: 从当前时间开始
      newExpiresAt = new Date(now.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
      isNewMembership = true
    }

    // 9. 创建会员记录
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: profileId,
        email: user.email,  // 保存邮箱方便查询
        type: activationCode.type,
        started_at: now.toISOString(),
        expires_at: newExpiresAt.toISOString(),
        activated_by_code_id: activationCode.id,
      })

    if (membershipError) {
      console.error('[Membership API] 创建会员记录失败:', membershipError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', details: membershipError.message },
        { status: 500 }
      )
    }

    // 10. 标记激活码为已使用
    const { error: updateError } = await supabase
      .from('activation_codes')
      .update({
        used: true,
        used_by: user.id,
        used_at: now.toISOString(),
      })
      .eq('id', activationCode.id)

    if (updateError) {
      console.error('[Membership API] 更新激活码状态失败:', updateError)
      // 不影响激活成功,记录错误即可
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
