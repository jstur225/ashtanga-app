import crypto from 'crypto'

const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || ''
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || ''
const OSS_BUCKET = process.env.OSS_BUCKET || ''
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || ''

export interface OssDeleteResult {
  ok: boolean
  status?: number
  error?: string
}

interface OssConfig {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  endpoint: string
}

function getOssConfig(): OssConfig | null {
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_ENDPOINT) return null
  return {
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    endpoint: OSS_ENDPOINT,
  }
}

/**
 * 从规范 OSS URL（https://{bucket}.{endpoint}/{key}）中提取对象 key。
 * 非本 bucket/endpoint 的地址返回 null。
 */
export function extractOssKey(ossUrl: string): string | null {
  const config = getOssConfig()
  if (!config || !ossUrl) return null
  try {
    const cleanEndpoint = config.endpoint.replace(/^https?:\/\//, '')
    const prefix = `https://${config.bucket}.${cleanEndpoint}/`
    if (!ossUrl.startsWith(prefix)) return null
    const rest = ossUrl.slice(prefix.length).split('?')[0]
    if (!rest) return null
    return decodeURIComponent(rest)
  } catch {
    return null
  }
}

/**
 * 删除 OSS 对象（阿里云 V1 签名，Authorization 头）。
 * - 404 视为成功（对象本就不存在）
 * - 网络/权限失败返回 ok:false，由调用方决定是否降级
 */
export async function deleteOssObject(ossKey: string): Promise<OssDeleteResult> {
  const config = getOssConfig()
  if (!config) return { ok: false, error: 'OSS_CONFIG_MISSING' }
  if (!ossKey) return { ok: false, error: 'INVALID_OSS_KEY' }

  const date = new Date().toUTCString()
  const canonicalizedResource = `/${config.bucket}/${ossKey}`
  const stringToSign = `DELETE\n\n\n${date}\n${canonicalizedResource}`
  const signature = crypto
    .createHmac('sha1', config.accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  const cleanEndpoint = config.endpoint.replace(/^https?:\/\//, '')
  const encodedKey = ossKey.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  const url = `https://${config.bucket}.${cleanEndpoint}/${encodedKey}`

  const controller = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? null
    : new AbortController()
  const timeoutMs = 15000
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Date: date,
        Authorization: `OSS ${config.accessKeyId}:${signature}`,
      },
      signal: controller ? controller.signal : AbortSignal.timeout(timeoutMs),
    })
    if (response.status === 404) return { ok: true, status: response.status }
    if (response.ok) return { ok: true, status: response.status }
    const text = await response.text().catch(() => '')
    return { ok: false, status: response.status, error: text.slice(0, 200) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'OSS_DELETE_NETWORK_ERROR' }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * 按 OSS URL 删除对象；可传入用户 id 校验对象归属（key 前缀必须匹配），
 * 防止误删他人对象。
 */
export async function deleteOssObjectByUrl(
  ossUrl: string,
  ownerUserId?: string
): Promise<OssDeleteResult> {
  const ossKey = extractOssKey(ossUrl)
  if (!ossKey) return { ok: false, error: 'INVALID_OSS_URL' }
  if (ownerUserId && !ossKey.startsWith(`${ownerUserId}/`)) {
    return { ok: false, error: 'OSS_OWNERSHIP_MISMATCH' }
  }
  return deleteOssObject(ossKey)
}