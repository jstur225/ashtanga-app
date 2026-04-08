import { NextRequest, NextResponse } from 'next/server'

/**
 * 调试 API - 检查环境变量是否正确加载
 * GET /api/debug/env
 */
export async function GET(request: NextRequest) {
  // 检查 OSS 环境变量（不暴露 secret 的完整值）
  const ossConfig = {
    OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID
      ? `${process.env.OSS_ACCESS_KEY_ID.slice(0, 8)}...`
      : 'NOT SET',
    OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET
      ? 'SET (hidden)'
      : 'NOT SET',
    OSS_BUCKET: process.env.OSS_BUCKET || 'NOT SET',
    OSS_ENDPOINT: process.env.OSS_ENDPOINT || 'NOT SET',
    OSS_REGION: process.env.OSS_REGION || 'NOT SET',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SET (hidden)'
      : 'NOT SET',
  }

  // 检查哪些变量缺失
  const missing = Object.entries(ossConfig)
    .filter(([key, value]) => value === 'NOT SET')
    .map(([key]) => key)

  return NextResponse.json({
    success: true,
    config: ossConfig,
    missing: missing.length > 0 ? missing : [],
    allSet: missing.length === 0,
  })
}
