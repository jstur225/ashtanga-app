import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 调试 API - 检查会员数据全链路
 * GET /api/debug/membership
 *
 * 支持 Authorization header（Bearer token）查特定用户
 * 也支持无 token 的全表概览
 */

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      env: {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_KEY,
        url: SUPABASE_URL?.slice(0, 30) + '...',
      },
      tables: {},
      user_specific: null,
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 检查 activation_codes 表
    const { data: codes, error: codesError } = await supabase
      .from('activation_codes')
      .select('code, type, used, used_at')
      .order('created_at', { ascending: false })
      .limit(10)

    results.tables.activation_codes = {
      exists: !codesError,
      error: codesError?.message,
      count: codes?.length || 0,
      recent_codes: codes || [],
    }

    // 检查 user_memberships 表（全量）
    const { data: allMemberships, error: membershipError } = await supabase
      .from('user_memberships')
      .select('id, user_id, email, type, started_at, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    results.tables.user_memberships = {
      exists: !membershipError,
      error: membershipError?.message,
      count: allMemberships?.length || 0,
      records: allMemberships || [],
    }

    // 检查视图
    const { data: viewData, error: viewError } = await supabase
      .from('user_membership_status')
      .select('*')
      .limit(20)

    results.tables.user_membership_status = {
      exists: !viewError,
      error: viewError?.message,
      count: viewData?.length || 0,
      records: viewData || [],
    }

    // 如果提供了 token，查特定用户
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      results.user_specific = {
        auth: {
          authenticated: !!user,
          error: authError?.message,
          userId: user?.id || null,
          email: user?.email || null,
        },
        profile: null,
        membership_by_view: null,
        membership_by_email: null,
        membership_by_profile_id: null,
      }

      if (user) {
        // 查 profile
        const { data: profiles, error: pError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)

        results.user_specific.profile = {
          found: profiles?.length || 0,
          error: pError?.message,
          data: profiles,
        }

        // 查视图
        if (profiles && profiles.length > 0) {
          const profileId = profiles[0].id
          const { data: viewResult, error: vError } = await supabase
            .from('user_membership_status')
            .select('*')
            .eq('user_id', profileId)
            .maybeSingle()

          results.user_specific.membership_by_view = {
            data: viewResult,
            error: vError?.message,
          }
        }

        // 查 email
        if (user.email) {
          const { data: emailResult, error: eError } = await supabase
            .from('user_memberships')
            .select('*')
            .eq('email', user.email)
            .order('expires_at', { ascending: false })
            .maybeSingle()

          results.user_specific.membership_by_email = {
            data: emailResult,
            error: eError?.message,
          }
        }

        // 查 profile_id
        if (profiles && profiles.length > 0) {
          const profileId = profiles[0].id
          const { data: pidResult, error: pidError } = await supabase
            .from('user_memberships')
            .select('*')
            .eq('user_id', profileId)
            .order('expires_at', { ascending: false })
            .maybeSingle()

          results.user_specific.membership_by_profile_id = {
            data: pidResult,
            error: pidError?.message,
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
