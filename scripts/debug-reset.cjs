import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.test
const envPath = path.resolve('.env.test')
for (const l of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = l.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  const k = t.slice(0, i).trim()
  const v = t.slice(i + 1).trim()
  if (!process.env[k]) process.env[k] = v
}

async function main() {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // 1) anon 登录拿 userId
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data: authData, error: authErr } = await anon.auth.signInWithPassword({ email, password })
  if (authErr || !authData.user) { console.error('Login failed:', authErr?.message); process.exit(1) }
  const userId = authData.user.id
  console.log('userId:', userId)

  // 2) service_role 查当前数据量
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: before, error: beforeErr } = await admin.from('practice_records').select('id').eq('user_id', userId)
  console.log('Before delete:', before?.length, 'records, error:', beforeErr?.message)

  // 3) service_role 删除
  const { data: deleted, error: delErr } = await admin.from('practice_records').delete().eq('user_id', userId).select('id')
  console.log('Deleted:', deleted?.length, 'records, error:', delErr?.message)
  if (delErr) console.error('Delete error details:', JSON.stringify(delErr))
  if (deleted) console.log('Deleted IDs:', deleted.map((r: any) => r.id).join(', '))

  // 4) 删完再查
  const { data: after } = await admin.from('practice_records').select('id').eq('user_id', userId)
  console.log('After delete:', after?.length, 'records remaining')
}

main().catch(console.error)
