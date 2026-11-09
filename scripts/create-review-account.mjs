/**
 * 创建审核/体验账号（Supabase Admin API，跳过邮箱验证）
 *
 * 用法（在项目根目录）：
 *   $env:SUPABASE_SERVICE_ROLE_KEY='你的service_role key'
 *   $env:REVIEW_EMAIL='ashtanga.review@qq.com'
 *   $env:REVIEW_PASSWORD='Ashtanga8888'
 *   node scripts/create-review-account.mjs
 *
 * 默认邮箱/密码：ashtanga.review@qq.com / Ashtanga8888（可通过环境变量覆盖）
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const email = (process.env.REVIEW_EMAIL || 'ashtanga.review@qq.com').trim()
const password = process.env.REVIEW_PASSWORD || 'Ashtanga8888'

if (!url || !serviceKey) {
  console.error('缺少环境变量：NEXT_PUBLIC_SUPABASE_URL（可读 .env.local）和 SUPABASE_SERVICE_ROLE_KEY（后台 → Settings → API → service_role）')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // 跳过邮箱验证，注册即可用
})

if (error) {
  if (error.message && /already registered/i.test(error.message)) {
    console.log('⚠️ 该邮箱已存在。可改用其他邮箱，或用下面的 SQL 把已有用户设为已确认：')
    console.log(`update auth.users set email_confirmed_at = now() where email = '${email}';`)
  } else {
    console.error('创建失败：', error.message || error)
  }
  process.exit(1)
}

console.log('✅ 审核账号已创建')
console.log('   邮箱：', data.user?.email)
console.log('   用户ID：', data.user?.id)
console.log('   密码：', password)
console.log('   提示：登录后第一次访问会自动生成 user_profiles 资料行（无需手工建）')