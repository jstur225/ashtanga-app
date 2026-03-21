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

    // 3. 检查今日上传限额（临时改为10张用于测试）
    const { data: canUpload, error: limitError } = await supabase.rpc(
      'can_user_upload_today',
      { user_uuid: user.id, max_photos: 10 }
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
    const { fileName, mimeType } = await request.json()
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

    // 6. 生成预签名 URL（有效期 1 小时），使用实际的 MIME 类型
    const actualMimeType = mimeType || 'application/octet-stream'
    const presignedUrl = generatePresignedUrl(ossKey, actualMimeType)
    const ossUrl = `https://${OSS_BUCKET}.${OSS_ENDPOINT}/${ossKey}`

    // 7. 返回预签名 URL
    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        ossKey,
        ossUrl,
        mimeType: actualMimeType,
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
 * 生成 OSS 预签名 URL（阿里云官方签名算法）
 * 文档: https://help.aliyun.com/document_detail/31952.html
 */
function generatePresignedUrl(ossKey: string, contentType: string): string {
  // 过期时间：Unix 时间戳（秒）
  const expires = Math.floor(Date.now() / 1000) + 3600 // 1小时后过期

  // 构建签名字符串（5个部分，用换行符分隔）
  const verb = 'PUT'
  const contentMd5 = ''
  const canonicalizedOSSHeaders = ''
  const canonicalizedResource = `/${OSS_BUCKET}/${ossKey}`

  const signString = `${verb}\n${contentMd5}\n${contentType}\n${expires}\n${canonicalizedOSSHeaders}${canonicalizedResource}`

  // 打印调试信息
  console.log('[OSS Signature] Sign string:', JSON.stringify(signString))
  console.log('[OSS Signature] Content-Type:', contentType)
  console.log('[OSS Signature] AccessKey ID:', OSS_ACCESS_KEY_ID.slice(0, 8) + '...')
  console.log('[OSS Signature] Bucket:', OSS_BUCKET)
  console.log('[OSS Signature] Endpoint:', OSS_ENDPOINT)

  // HMAC-SHA1 签名
  const crypto = require('crypto')
  const signature = crypto
    .createHmac('sha1', OSS_ACCESS_KEY_SECRET)
    .update(signString)
    .digest('base64')

  // URL 编码签名
  const encodedSignature = encodeURIComponent(signature)

  // 构建 URL（注意 OSSAccessKeyId 的拼写）
  const url = `https://${OSS_BUCKET}.${OSS_ENDPOINT}/${ossKey}?OSSAccessKeyId=${encodeURIComponent(OSS_ACCESS_KEY_ID)}&Expires=${expires}&Signature=${encodedSignature}`

  console.log('[OSS Signature] Generated URL:', url.slice(0, 100) + '...')

  return url
}
