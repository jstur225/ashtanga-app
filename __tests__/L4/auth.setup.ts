/**
 * globalSetup：登录测试账号，保存 storageState 供 auth-chromium project 复用。
 *
 * 通过 Supabase auth REST API 拿到 session，注入到 /practice 页面的 localStorage。
 * 缺少 .env.test 或登录失败时优雅降级（保存空白 state，auth tests 会被 skip）。
 */
import { chromium, FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

function loadEnvTest(): boolean {
  if (process.env.TEST_USER_EMAIL) return true
  const rootDir = path.resolve(__dirname, '../..')
  const envPath = path.resolve(rootDir, '.env.test')
  if (!fs.existsSync(envPath)) return false

  for (const rawLine of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
  return true
}

function getProjectRef(url: string): string {
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net|in)/)
  return m ? m[1] : 'anon'
}

async function saveEmptyState() {
  const authDir = path.resolve(__dirname, '../../playwright/.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  const authFile = path.join(authDir, 'user.json')
  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext()
    await ctx.storageState({ path: authFile })
  } finally {
    await browser.close()
  }
}

export default async function globalSetup(_config: FullConfig) {
  // 始终保证 auth file 存在，避免 storageState 找不到文件
  if (!loadEnvTest()) {
    console.warn('[L4 auth.setup] 无 .env.test，保存空白 state')
    await saveEmptyState()
    return
  }

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    console.warn('[L4 auth.setup] env 配置不完整，保存空白 state')
    await saveEmptyState()
    return
  }

  let session: any = null
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) session = await res.json()
    else console.warn(`[L4 auth.setup] 登录失败 (${res.status})，保存空白 state`)
  } catch (e) {
    console.warn('[L4 auth.setup] 登录异常，保存空白 state:', e)
  }

  if (!session?.access_token) {
    await saveEmptyState()
    return
  }

  const projectRef = getProjectRef(supabaseUrl)
  const storageKey = `sb-${projectRef}-auth-token`
  const storedValue = JSON.stringify({
    currentSession: session,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  })

  const authDir = path.resolve(__dirname, '../../playwright/.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  const authFile = path.join(authDir, 'user.json')

  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('http://localhost:3100/practice', { waitUntil: 'domcontentloaded' })
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: storedValue })
    await page.waitForTimeout(500)
    await ctx.storageState({ path: authFile })
  } finally {
    await browser.close()
  }
}
