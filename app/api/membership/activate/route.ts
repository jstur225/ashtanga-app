import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { ensureProfileAndGetId } from '@/lib/membership-utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ACTIVATION_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
const DAY_MS = 24 * 60 * 60 * 1000

interface ActivationCode {
  id: string
  code: string
  type: string
  duration_days: number
  used: boolean
  used_by?: string | null
  expires_at?: string | null
}

interface MembershipExpiry {
  newExpiresAt: Date
  isNewMembership: boolean
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
export async function POST(request: NextRequest) {
  try {
    const supabase = createMembershipClient()
    if (!supabase) return jsonError('CONFIG_ERROR', 500)

    const auth = await authenticateRequest(request, supabase)
    if ('response' in auth) return auth.response

    const parsedCode = await parseActivationCode(request)
    if ('response' in parsedCode) return parsedCode.response

    const activation = await getActivationCode(supabase, parsedCode.formattedCode)
    if ('response' in activation) return activation.response

    const profileId = await getProfileId(supabase, auth.user)
    if ('response' in profileId) return profileId.response

    const now = new Date()
    const currentLatestExpiry = await getCurrentLatestExpiry(supabase, profileId.value, now)
    const membershipExpiry = calculateMembershipExpiry(
      currentLatestExpiry,
      activation.code.duration_days,
      now,
    )

    const membershipCreated = await createMembershipRecord(
      supabase,
      profileId.value,
      auth.user,
      activation.code,
      membershipExpiry.newExpiresAt,
      now,
    )
    if ('response' in membershipCreated) return membershipCreated.response

    const activationConsumed = await consumeActivationCode(supabase, activation.code, now)
    if ('response' in activationConsumed) return activationConsumed.response

    return NextResponse.json({
      success: true,
      data: {
        expires_at: membershipExpiry.newExpiresAt.toISOString(),
        expires_at_formatted: membershipExpiry.newExpiresAt.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '.'),
        days: activation.code.duration_days,
        type: activation.code.type,
        is_new: membershipExpiry.isNewMembership,
      },
    })
  } catch {
    return jsonError('INTERNAL_ERROR', 500)
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

function createMembershipClient() {
  try {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch {
    return null
  }
}

async function authenticateRequest(request: NextRequest, supabase: SupabaseClient) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { response: jsonError('NOT_AUTHENTICATED', 401) }
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { response: jsonError('NOT_AUTHENTICATED', 401) }
    }
    return { user }
  } catch {
    return { response: jsonError('NOT_AUTHENTICATED', 401) }
  }
}

async function parseActivationCode(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { response: jsonError('INVALID_REQUEST', 400) }
  }

  const code = typeof body === 'object' && body && 'code' in body ? (body as { code?: unknown }).code : undefined
  if (!code || typeof code !== 'string') {
    return { response: jsonError('MISSING_CODE', 400) }
  }

  const formattedCode = code.toUpperCase().replace(/\s/g, '')
  if (!ACTIVATION_CODE_PATTERN.test(formattedCode)) {
    return { response: jsonError('INVALID_CODE_FORMAT', 400) }
  }

  return { formattedCode }
}

async function getActivationCode(supabase: SupabaseClient, formattedCode: string) {
  try {
    const result = await supabase
      .from('activation_codes')
      .select('id, code, type, duration_days, used, used_by, expires_at')
      .eq('code', formattedCode)
      .single()

    if (result.error) {
      return { response: jsonError('DATABASE_ERROR', 500) }
    }

    const activationCode = result.data as ActivationCode | null
    if (!activationCode) {
      return { response: jsonError('INVALID_CODE', 400) }
    }

    if (activationCode.used) {
      return { response: jsonError('CODE_USED', 400) }
    }

    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return { response: jsonError('CODE_EXPIRED', 400) }
    }

    return { code: activationCode }
  } catch {
    return { response: jsonError('DATABASE_ERROR', 500) }
  }
}

async function getProfileId(supabase: SupabaseClient, user: User) {
  try {
    return { value: await ensureProfileAndGetId(supabase, user) }
  } catch {
    return { response: jsonError('DATABASE_ERROR', 500) }
  }
}

async function getCurrentLatestExpiry(supabase: SupabaseClient, profileId: string, now: Date) {
  try {
    const { data, error } = await supabase
      .from('user_memberships')
      .select('expires_at')
      .eq('user_id', profileId)
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      return new Date(data[0].expires_at)
    }
  } catch {
    // Preserve existing fail-open behavior: membership lookup errors should not block activation.
  }

  return null
}

function calculateMembershipExpiry(
  currentLatestExpiry: Date | null,
  durationDays: number,
  now: Date,
): MembershipExpiry {
  if (currentLatestExpiry) {
    return {
      newExpiresAt: new Date(currentLatestExpiry.getTime() + durationDays * DAY_MS),
      isNewMembership: false,
    }
  }

  return {
    newExpiresAt: new Date(now.getTime() + durationDays * DAY_MS),
    isNewMembership: true,
  }
}

async function createMembershipRecord(
  supabase: SupabaseClient,
  profileId: string,
  user: User,
  activationCode: ActivationCode,
  newExpiresAt: Date,
  now: Date,
) {
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
      return { response: jsonError('DATABASE_ERROR', 500) }
    }

    return { ok: true }
  } catch {
    return { response: jsonError('DATABASE_ERROR', 500) }
  }
}

async function consumeActivationCode(
  supabase: SupabaseClient,
  activationCode: ActivationCode,
  now: Date,
) {
  try {
    // 不保存 used_by，避免外键约束问题。
    const result = await supabase
      .from('activation_codes')
      .update({
        used: true,
        used_at: now.toISOString(),
      })
      .eq('code', activationCode.code)
      .select()

    if (result.error) {
      return { response: jsonError('DATABASE_ERROR', 500) }
    }

    return { ok: true }
  } catch {
    return { response: jsonError('DATABASE_ERROR', 500) }
  }
}
