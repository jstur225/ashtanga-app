import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * L5 测试专用 Supabase 客户端
 *
 * 设计要点：
 *   - 与生产客户端分开实例化，避免共享 session/缓存
 *   - 用 anon key 创建客户端（与浏览器一致），通过 signInWithPassword 获得 user session
 *   - service_role 客户端只在 reset 脚本里用，不暴露给测试用例
 *   - 每个测试文件 should 在 beforeAll 调用 resetTestAccount + signInTestUser
 */

let anonClient: SupabaseClient | null = null

function getUrls() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('[test-client] 缺少 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY')
  }
  return { url, anonKey }
}

function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    const { url, anonKey } = getUrls()
    anonClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return anonClient
}

export async function signInTestUser() {
  const client = getAnonClient()
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`[signInTestUser] 登录失败: ${error.message}`)
  }
  if (!data.user) {
    throw new Error('[signInTestUser] 登录返回空 user')
  }
  return { user: data.user, session: data.session }
}

export async function signOutTestUser() {
  await getAnonClient().auth.signOut()
}

export function getTestClient(): SupabaseClient {
  return getAnonClient()
}

export function getTestUserEmail(): string {
  return process.env.TEST_USER_EMAIL!
}
