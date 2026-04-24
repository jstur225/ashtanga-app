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

    // 先尝试直接从 user_memberships 查（用 auth uid 的 email 匹配）
    // 也通过 user_profiles 链路查
    let membershipData: any = null

    // 方式1: 通过 user_profiles → 视图
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('[Membership API] user_profiles 查询:', { hasProfile: !!userProfile, profileId: userProfile?.id, error: profileError?.message })

    if (userProfile) {
      const { data, error } = await supabase
        .from('user_membership_status')
        .select('is_active, expires_at, days_remaining, membership_type')
        .eq('user_id', userProfile.id)
        .maybeSingle()
      if (!error && data) {
        membershipData = data
        console.log('[Membership API] 方式1(视图)命中:', data)
      }
    }

    // 方式2: 直接查 user_memberships 表（用 email 或 auth uid 匹配）
    if (!membershipData) {
      // 用 email 查
      const { data: byEmail, error: emailError } = await supabase
        .from('user_memberships')
        .select('expires_at, type')
        .eq('email', user.email)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('[Membership API] 方式2(email直查):', { data: byEmail, error: emailError?.message })

      if (byEmail) {
        const isActive = new Date(byEmail.expires_at) > new Date()
        const daysRemaining = isActive
          ? Math.ceil((new Date(byEmail.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0
        membershipData = {
          is_active: isActive,
          expires_at: byEmail.expires_at,
          days_remaining: daysRemaining,
          membership_type: byEmail.type,
        }
      }
    }

    // 方式3: 用 user_profiles.id 直接查 user_memberships 表
    if (!membershipData && userProfile) {
      const { data: byProfileId, error: pidError } = await supabase
        .from('user_memberships')
        .select('expires_at, type')
        .eq('user_id', userProfile.id)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('[Membership API] 方式3(profileId直查):', { data: byProfileId, error: pidError?.message })

      if (byProfileId) {
        const isActive = new Date(byProfileId.expires_at) > new Date()
        const daysRemaining = isActive
          ? Math.ceil((new Date(byProfileId.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0
        membershipData = {
          is_active: isActive,
          expires_at: byProfileId.expires_at,
          days_remaining: daysRemaining,
          membership_type: byProfileId.type,
        }
      }
    }

    console.log('[Membership API] 最终 membershipData:', membershipData)

    // 3. 格式化响应（免费用户返回 is_active: false）
    const responseData = {
      success: true,
      data: {
        is_active: membershipData?.is_active ?? false,
        expires_at: membershipData?.expires_at ?? null,
        expires_at_formatted: membershipData?.expires_at
          ? new Date(membershipData.expires_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\//g, '.')
          : null,
        days_remaining: membershipData?.days_remaining ?? 0,
        type: membershipData?.membership_type ?? null,
      },
    }

    console.log('[Membership API] 返回响应:', responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[Membership API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
