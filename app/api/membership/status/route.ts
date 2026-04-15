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
    console.log('[Membership API] authHeader:', authHeader ? '存在' : '不存在')

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
    console.log('[Membership API] getUser 结果:', { hasUser: !!user, error: authError?.message })

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 2. 查询会员状态
    console.log('[Membership API] 查询会员状态, userId:', user.id)
    const { data: membership, error: membershipError } = await supabase
      .from('user_membership_status')
      .select('is_active, expires_at, days_remaining, membership_type')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('[Membership API] 查询结果:', { hasData: !!membership, error: membershipError?.message })

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
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Membership API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
