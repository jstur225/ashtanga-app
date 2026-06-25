import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureProfileAndGetId } from '@/lib/membership-utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

    let supabase
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'CONFIG_ERROR' },
        { status: 500 }
      )
    }

    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError) {
        return NextResponse.json(
          { success: false, error: 'NOT_AUTHENTICATED' },
          { status: 401 }
        )
      }
      user = authUser
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    let body
    try {
      body = await request.json()
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
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
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_ERROR',
          },
          { status: 500 }
        )
      }
      activationCode = result.data
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
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

    // 7. 确保用户有 profile 记录，获取 profileId
    let profileId: string
    try {
      profileId = await ensureProfileAndGetId(supabase, user)
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    const now = new Date()

    // 查询当前活跃会员的到期时间
    // ⭐ 直接查 user_memberships 表（不依赖视图），找出所有未过期的记录取 MAX(expires_at)
    let currentLatestExpiry: Date | null = null
    try {
      const { data: memberships, error } = await supabase
        .from('user_memberships')
        .select('expires_at')
        .eq('user_id', profileId)
        .gt('expires_at', now.toISOString()) // 只查尚未过期的
        .order('expires_at', { ascending: false })
        .limit(1)

      if (!error && memberships && memberships.length > 0) {
        currentLatestExpiry = new Date(memberships[0].expires_at)
      }
    } catch {}

    let newExpiresAt: Date
    let isNewMembership = false

    // 8. 计算新的到期时间
    if (currentLatestExpiry) {
      // 续费: 从当前最新到期时间累加
      newExpiresAt = new Date(currentLatestExpiry.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
    } else {
      // 新开通: 从当前时间开始
      newExpiresAt = new Date(now.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
      isNewMembership = true
    }

    // 9. 创建会员记录
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

      if (result.error) {
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // 10. 标记激活码为已使用
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

      if (result.error) {
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
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
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
