import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// OSS 配置（从环境变量读取）
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || ''
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || ''
const OSS_BUCKET = process.env.OSS_BUCKET || ''
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || ''
const OSS_REGION = process.env.OSS_REGION || ''

// Supabase 服务密钥（用于验证用户）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 生成 OSS 预签名 URL
 * POST /api/oss-signature
 * Body: { fileName: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证 OSS 配置
    if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
      console.error('[OSS Signature] 配置缺失')
      return NextResponse.json(
        { success: false, error: 'OSS_CONFIG_MISSING' },
        { status: 500 }
      )
    }

    // 2. 验证用户登录状态
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('[OSS Signature] 认证失败:', authError)
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 3. 检查今日上传限额
    const { data: canUpload, error: limitError } = await supabase.rpc(
      'can_user_upload_today',
      { user_uuid: user.id, max_photos: 1 }
    )

    if (limitError) {
      console.error('[OSS Signature] 检查限额失败:', limitError)
      return NextResponse.json(
        { success: false, error: 'CHECK_LIMIT_FAILED' },
        { status: 500 }
      )
    }

    if (!canUpload) {
      return NextResponse.json(
        { success: false, error: 'DAILY_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // 4. 解析请求体
    const { fileName } = await request.json()
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'FILENAME_REQUIRED' },
        { status: 400 }
      )
    }

    // 5. 生成 OSS Key（路径：用户ID/日期/随机文件名）
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const fileExt = fileName.split('.').pop() || 'jpg'
    const randomName = uuidv4()
    const ossKey = `${user.id}/${dateStr}/${randomName}.${fileExt}`

    // 6. 生成预签名 URL（有效期 1 小时）
    const presignedUrl = generatePresignedUrl(ossKey)
    const ossUrl = `https://${OSS_BUCKET}.${OSS_ENDPOINT}/${ossKey}`

    // 7. 返回预签名 URL
    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        ossKey,
        ossUrl,
        expiresAt: Date.now() + 3600 * 1000, // 1小时后过期
      },
    })
  } catch (error) {
    console.error('[OSS Signature] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * 生成 OSS 预签名 URL
 * 使用阿里云 OSS 签名算法
 */
function generatePresignedUrl(ossKey: string): string {
  const date = new Date()
  date.setHours(date.getHours() + 1) // 1小时后过期
  const expiration = Math.floor(date.getTime() / 1000)

  // 构建签名
  const method = 'PUT'
  const contentMd5 = ''
  const contentType = 'application/octet-stream'
  const canonicalizedOSSHeaders = ''
  const canonicalizedResource = `/${OSS_BUCKET}/${ossKey}`

  const signString = [
    method,
    contentMd5,
    contentType,
    expiration,
    canonicalizedOSSHeaders,
    canonicalizedResource,
  ].join('\n')

  // HMAC-SHA1 签名
  const crypto = require('crypto')
  const signature = crypto
    .createHmac('sha1', OSS_ACCESS_KEY_SECRET)
    .update(signString)
    .digest('base64')

  // URL 编码签名（处理特殊字符）
  const encodedSignature = signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // 构建 URL（使用安全的 URL 编码）
  const urlSafeSignature = encodeURIComponent(signature)
    .replace(/%2F/g, '/')
    .replace(/%2B/g, '+')
    .replace(/%3D/g, '=')

  // 构建 URL
  const url = `https://${OSS_BUCKET}.${OSS_ENDPOINT}/${ossKey}?OSSAccessKeyId=${OSS_ACCESS_KEY_ID}&Expires=${expiration}&Signature=${urlSafeSignature}`

  return url
}
