import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface MembershipData {
  is_active: boolean
  expires_at: string | null
  days_remaining: number
  membership_type: string | null
}

function calculateMembership(expiresAt: string | null, type: string | null): MembershipData | null {
  if (!expiresAt) return null
  const isActive = new Date(expiresAt) > new Date()
  return {
    is_active: isActive,
    expires_at: expiresAt,
    days_remaining: isActive
      ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
    membership_type: type,
  }
}

function formatResponse(membershipData: MembershipData | null) {
  return {
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
}

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, error: 'CONFIG_ERROR' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    let membershipData: MembershipData | null = null

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userProfile?.id) {
      const { data: byView } = await supabase
        .from('user_membership_status')
        .select('is_active, expires_at, days_remaining, membership_type')
        .eq('user_id', userProfile.id)
        .maybeSingle()

      if (byView) {
        membershipData = {
          is_active: byView.is_active,
          expires_at: byView.expires_at,
          days_remaining: byView.days_remaining,
          membership_type: byView.membership_type,
        }
      }
    }

    if (!membershipData && user.email) {
      const { data: byEmail } = await supabase
        .from('user_memberships')
        .select('expires_at, type')
        .eq('email', user.email)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      membershipData = calculateMembership(byEmail?.expires_at ?? null, byEmail?.type ?? null)
    }

    if (!membershipData && userProfile?.id) {
      const { data: byProfileId } = await supabase
        .from('user_memberships')
        .select('expires_at, type')
        .eq('user_id', userProfile.id)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      membershipData = calculateMembership(byProfileId?.expires_at ?? null, byProfileId?.type ?? null)
    }

    return NextResponse.json(formatResponse(membershipData))
  } catch {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
