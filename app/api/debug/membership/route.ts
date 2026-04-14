import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 调试 API - 检查数据库状态
 * GET /api/debug/membership
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
      codes: [],
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 检查 activation_codes 表
    const { data: codes, error: codesError } = await supabase
      .from('activation_codes')
      .select('code, type, used')
      .limit(5)

    results.tables.activation_codes = {
      exists: !codesError,
      error: codesError?.message,
      count: codes?.length || 0,
    }
    results.codes = codes || []

    // 检查 user_memberships 表
    const { count: membershipCount, error: membershipError } = await supabase
      .from('user_memberships')
      .select('*', { count: 'exact', head: true })

    results.tables.user_memberships = {
      exists: !membershipError,
      error: membershipError?.message,
      count: membershipCount,
    }

    // 检查视图
    const { data: viewData, error: viewError } = await supabase
      .from('user_membership_status')
      .select('user_id')
      .limit(1)

    results.tables.user_membership_status = {
      exists: !viewError,
      error: viewError?.message,
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
