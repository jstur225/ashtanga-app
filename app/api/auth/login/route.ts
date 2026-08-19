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
  const password = typeof source.password === 'string' ? source.password : ''

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

  if (error || !session) {
    return json({ error: '邮箱或密码错误' }, 401)
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
