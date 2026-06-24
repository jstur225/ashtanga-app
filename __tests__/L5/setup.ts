/**
 * L5 测试全局 setup：在所有测试运行前 fail-fast 校验环境变量
 *
 * 也负责在 worker 进程内加载 .env.test（vitest config 级加载不一定传递到 worker）。
 *
 * 防御：如果有人误跑 L5 测试但没有正确配置 .env.test，
 * 必须在调用任何 Supabase API 之前抛出（否则可能误操作生产数据库）。
 */
import { beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

// ==================== 内联 env 加载（确保 worker 进程也能读到） ====================

function loadEnvTest() {
  // 如果已经有了（config 级已加载），跳过
  if (process.env.TEST_USER_EMAIL) return

  const rootDir = path.resolve(__dirname, '../..')
  const envPath = path.resolve(rootDir, '.env.test')
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `[L5 setup] 缺少 .env.test（路径: ${envPath}）\n` +
        '请创建文件，包含：TEST_USER_EMAIL / TEST_USER_PASSWORD / SUPABASE_* 配置。',
    )
  }
  for (const rawLine of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvTest()

// ==================== 校验 ====================

const REQUIRED_ENV_VARS = [
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

beforeAll(() => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `[L5 setup] 缺少环境变量: ${missing.join(', ')}\n` +
        '请在项目根目录创建 .env.test',
    )
  }

  // 双重防御：测试账号必须是预定的那个
  const email = process.env.TEST_USER_EMAIL!
  const allowedTestDomains = ['@test.com', '+test', '@example.com', 'zaohezi2020@gmail.com']
  const isAllowed = allowedTestDomains.some((suffix) => email.includes(suffix))
  if (!isAllowed) {
    throw new Error(
      `[L5 setup] TEST_USER_EMAIL=${email} 不在测试白名单内。\n` +
        'L5 测试会真实重置该账号所有数据，禁止使用真实用户邮箱。',
    )
  }

  // service_role key 格式检查
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (serviceKey.length < 10 || serviceKey.includes('<复制')) {
    throw new Error(
      '[L5 setup] SUPABASE_SERVICE_ROLE_KEY 值不对，请确认已替换为真实的 service_role key\n' +
      '(从 Supabase 项目设置 → API → service_role key 复制)',
    )
  }
})
