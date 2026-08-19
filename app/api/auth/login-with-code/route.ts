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
  const code = typeof source.code === 'string' ? source.code.trim() : ''

  if (!email || !/^\d{6}$/.test(code)) {
    return json({ error: '请输入邮箱和 6 位验证码' }, 400)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: '登录服务暂不可用，请稍后再试' }, 503)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const now = new Date().toISOString()
  const { data: verification, error: verificationError } = await admin
    .from('verification_codes')
    .select('id')
    .eq('email', email)
    .eq('code', code)
    .eq('type', 'login')
    .eq('used', false)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (verificationError || !verification) {
    return json({ error: '验证码错误或已过期' }, 400)
  }

  const { data: consumed, error: consumeError } = await admin
    .from('verification_codes')
    .update({ used: true })
    .eq('id', verification.id)
    .eq('used', false)
    .select('id')
    .maybeSingle()

  if (consumeError || !consumed) {
    return json({ error: '验证码已使用，请重新获取' }, 409)
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    return json({ error: '登录会话创建失败，请重新获取验证码' }, 500)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await authClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })
  const session = data.session

  if (error || !session) {
    return json({ error: '登录会话创建失败，请重新获取验证码' }, 500)
  }

  return json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: data.user || session.user,
  }, 200)
}
