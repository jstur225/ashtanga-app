import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 会员状态查询 API
 * GET /api/membership/status
 *
 * 响应:
 *   { success: true, data: { is_active: true, expires_at: "...", days_remaining: 85, type: "quarter" } }
 *   免费用户: { success: true, data: { is_active: false, expires_at: null, days_remaining: 0, type: null } }
 */

// GET - 查询会员状态
export async function GET(request: NextRequest) {
  try {
    console.log('[Membership API] 收到请求')

    // 检查环境变量
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[Membership API] 环境变量缺失:', { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_SERVICE_KEY })
      return NextResponse.json(
        { success: false, error: 'CONFIG_ERROR' },
        { status: 500 }
      )
    }

    // 1. 验证用户登录
    const authHeader = request.headers.get('authorization')
    console.log('[Membership API] authHeader:', authHeader ? `存在: ${authHeader.slice(0, 30)}...` : '不存在')

    if (!authHeader) {
      console.log('[Membership API] 错误: 没有 Authorization header')
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('[Membership API] 错误: Authorization header 格式不正确:', authHeader.slice(0, 20))
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[Membership API] Token 长度:', token.length, 'Token 前缀:', token.slice(0, 20))

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('[Membership API] getUser 结果:', { hasUser: !!user, error: authError?.message, errorName: authError?.name })

    if (authError || !user) {
      console.log('[Membership API] 认证失败:', { error: authError?.message, errorName: authError?.name })
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_AUTHENTICATED',
          debug: {
            authError: authError?.message,
            authErrorName: authError?.name,
            hasUser: !!user,
          }
        },
        { status: 401 }
      )
    }

    // 2. 查询会员状态
    console.log('[Membership API] 查询会员状态, userId:', user.id)

    // ⭐ 首先通过 user_id 查询 user_profiles 获取 profile id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('[Membership API] user_profiles 查询:', { hasProfile: !!userProfile, profileId: userProfile?.id, error: profileError?.message })

    let membershipQuery: any

    // 优先使用 profile id 查询，如果没有 profile 则尝试用 user.id
    const queryId = userProfile?.id || user.id
    console.log('[Membership API] 使用 queryId:', queryId)

    // 查询视图（视图中的 user_id 实际上是 user_profiles.id）
    const { data: membership, error: membershipError } = await supabase
      .from('user_membership_status')
      .select('is_active, expires_at, days_remaining, membership_type')
      .eq('user_id', queryId)
      .maybeSingle()

    console.log('[Membership API] 查询结果:', { hasData: !!membership, error: membershipError?.message, data: membership })

    if (membershipError) {
      console.error('[Membership API] 查询会员状态失败:', membershipError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // 3. 格式化响应（免费用户返回 is_active: false）
    const response = {
      success: true,
      data: {
        is_active: membership?.is_active ?? false,
        expires_at: membership?.expires_at ?? null,
        expires_at_formatted: membership?.expires_at
          ? new Date(membership.expires_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\//g, '.')
          : null,
        days_remaining: membership?.days_remaining ?? 0,
        type: membership?.membership_type ?? null,
      },
      // ⭐ 调试信息
      debug: {
        userId: user.id,
        profileId: userProfile?.id,
        queryId: queryId,
        hasMembershipData: !!membership,
        rawMembership: membership,
      },
    }

    console.log('[Membership API] 返回响应:', { isActive: response.data.is_active, hasDebug: true })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Membership API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
