import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeAuthEmail } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function credentialProbe(nonce: string, credential: string) {
  let first = 2166136261 >>> 0
  let second = 5381 >>> 0
  const value = `${nonce}\u0000${credential}`
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first ^= code
    first = Math.imul(first, 16777619) >>> 0
    second = (Math.imul(second, 33) ^ code) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return json({ error: '请求格式错误' }, 400)
  }

  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {}
  const email = normalizeAuthEmail(source.email)
  const password = typeof source.password === 'string' ? source.password : ''
  const diagnosticAttemptId = typeof source.diagnostic_attempt_id === 'string'
    ? source.diagnostic_attempt_id.slice(0, 100)
    : ''
  const diagnosticNonce = typeof source.diagnostic_nonce === 'string'
    ? source.diagnostic_nonce.slice(0, 100)
    : ''
  const diagnosticProbe = typeof source.diagnostic_probe === 'string'
    ? source.diagnostic_probe.slice(0, 32)
    : ''

  if (!email || !password) {
    return json({ error: '请输入邮箱和密码' }, 400)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: '登录服务暂不可用，请稍后再试' }, 503)
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  const session = data.session
  const diagnostics = {
    attempt_id: diagnosticAttemptId,
    credential_transport_match: Boolean(diagnosticNonce && diagnosticProbe) &&
      credentialProbe(diagnosticNonce, password) === diagnosticProbe,
    server_credential_character_count: Array.from(password).length,
    server_credential_utf8_byte_count: Buffer.byteLength(password, 'utf8'),
    supabase_project_ref: (() => {
      try {
        return new URL(supabaseUrl).hostname.split('.')[0] || ''
      } catch {
        return ''
      }
    })(),
    provider_error_code: error?.code || '',
    provider_error_status: error?.status || 0,
    provider_error_name: error?.name || '',
  }

  if (error || !session) {
    return json({ error: '邮箱或密码错误', diagnostics }, 401)
  }

  return json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: data.user || session.user,
    diagnostics,
  }, 200)
}
