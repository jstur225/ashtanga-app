import crypto from 'node:crypto'

export type PaymentPlanId = 'quarter' | 'year'

export interface PaymentPlan {
  id: PaymentPlanId
  name: string
  amount_total: number
  duration_days: number
  description: string
  recommended: boolean
}
export interface WechatPayConfig {
  appId: string
  appSecret: string
  mchId: string
  merchantSerialNo: string
  merchantPrivateKey: string
  apiV3Key: string
  wechatPayPublicKeyId: string
  wechatPayPublicKey: string
  notifyUrl: string
}

export const PAYMENT_PLANS: Readonly<Record<PaymentPlanId, PaymentPlan>> = Object.freeze({
  quarter: Object.freeze({
    id: 'quarter',
    name: '季卡',
    amount_total: 1980,
    duration_days: 90,
    description: '熬汤日记 Pro 会员季卡（90天）',
    recommended: false,
  }),
  year: Object.freeze({
    id: 'year',
    name: '年卡',
    amount_total: 6980,
    duration_days: 365,
    description: '熬汤日记 Pro 会员年卡（365天）',
    recommended: true,
  }),
})

function decodePem(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`)
  const trimmed = value.trim()
  if (trimmed.includes('-----BEGIN')) return trimmed.replace(/\\n/g, '\n')
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim()
    if (decoded.includes('-----BEGIN')) return decoded
  } catch {
    // Fall through to the configuration error below.
  }
  throw new Error(`Invalid ${name}`)
}

export function getWechatPayConfig(): WechatPayConfig {
  const config: WechatPayConfig = {
    appId: process.env.WECHAT_MINI_APP_ID || '',
    appSecret: process.env.WECHAT_MINI_APP_SECRET || '',
    mchId: process.env.WECHAT_PAY_MCH_ID || '',
    merchantSerialNo: process.env.WECHAT_PAY_MERCHANT_SERIAL_NO || '',
    merchantPrivateKey: decodePem(
      process.env.WECHAT_PAY_PRIVATE_KEY_BASE64 || process.env.WECHAT_PAY_PRIVATE_KEY,
      'WECHAT_PAY_PRIVATE_KEY_BASE64',
    ),
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || '',
    wechatPayPublicKeyId: process.env.WECHAT_PAY_PUBLIC_KEY_ID || '',
    wechatPayPublicKey: decodePem(
      process.env.WECHAT_PAY_PUBLIC_KEY_BASE64 || process.env.WECHAT_PAY_PUBLIC_KEY,
      'WECHAT_PAY_PUBLIC_KEY_BASE64',
    ),
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
  }

  if (config.appId !== 'wx36f4826bc022d43f') throw new Error('Invalid WECHAT_MINI_APP_ID')
  if (config.mchId !== '1748730805') throw new Error('Invalid WECHAT_PAY_MCH_ID')
  if (!config.appSecret) throw new Error('Missing WECHAT_MINI_APP_SECRET')
  if (!config.merchantSerialNo) throw new Error('Missing WECHAT_PAY_MERCHANT_SERIAL_NO')
  if (!/^[A-Za-z0-9_]+$/.test(config.wechatPayPublicKeyId)) {
    throw new Error('Invalid WECHAT_PAY_PUBLIC_KEY_ID')
  }
  if (Buffer.byteLength(config.apiV3Key, 'utf8') !== 32) {
    throw new Error('WECHAT_PAY_API_V3_KEY must be 32 bytes')
  }
  if (!/^https:\/\//.test(config.notifyUrl)) throw new Error('Invalid WECHAT_PAY_NOTIFY_URL')
  return config
}

export function getPaymentPlan(value: unknown): PaymentPlan | null {
  return value === 'quarter' || value === 'year' ? PAYMENT_PLANS[value] : null
}

export function publicPaymentPlans() {
  return Object.values(PAYMENT_PLANS).map((plan) => ({
    ...plan,
    price: (plan.amount_total / 100).toFixed(1),
  }))
}

export function createOutTradeNo(now = Date.now()) {
  const timestamp = now.toString(36).toUpperCase()
  const random = crypto.randomBytes(6).toString('hex').toUpperCase()
  return `AST${timestamp}${random}`.slice(0, 32)
}

export function createNonce() {
  return crypto.randomBytes(16).toString('hex')
}

export function rsaSign(message: string, privateKey: string) {
  return crypto.sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64')
}

export function rsaVerify(message: string, signature: string, publicKey: string) {
  return crypto.verify(
    'RSA-SHA256',
    Buffer.from(message),
    publicKey,
    Buffer.from(signature, 'base64'),
  )
}

export function buildWechatAuthorization(
  method: string,
  canonicalUrl: string,
  body: string,
  config: WechatPayConfig,
) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = createNonce()
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${body}\n`
  const signature = rsaSign(message, config.merchantPrivateKey)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.merchantSerialNo}",signature="${signature}"`
}

export function verifyWechatResponse(
  timestamp: string | null,
  nonce: string | null,
  signature: string | null,
  serial: string | null,
  body: string,
  config: WechatPayConfig,
) {
  if (!timestamp || !nonce || !signature || serial !== config.wechatPayPublicKeyId) return false
  return rsaVerify(`${timestamp}\n${nonce}\n${body}\n`, signature, config.wechatPayPublicKey)
}

export function buildMiniProgramPaymentParams(prepayId: string, config: WechatPayConfig) {
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = createNonce()
  const packageValue = `prepay_id=${prepayId}`
  const paySign = rsaSign(
    `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`,
    config.merchantPrivateKey,
  )
  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA' as const,
    paySign,
  }
}

export function decryptWechatResource(resource: {
  algorithm?: string
  ciphertext?: string
  nonce?: string
  associated_data?: string
}, apiV3Key: string) {
  if (resource.algorithm !== 'AEAD_AES_256_GCM') throw new Error('Unsupported resource algorithm')
  if (!resource.ciphertext || !resource.nonce) throw new Error('Invalid encrypted resource')
  const encrypted = Buffer.from(resource.ciphertext, 'base64')
  if (encrypted.length <= 16) throw new Error('Invalid encrypted resource')
  const ciphertext = encrypted.subarray(0, encrypted.length - 16)
  const authTag = encrypted.subarray(encrypted.length - 16)
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(resource.nonce, 'utf8'),
  )
  decipher.setAuthTag(authTag)
  decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'))
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export async function requestWechatPay(
  method: 'GET' | 'POST',
  canonicalUrl: string,
  config: WechatPayConfig,
  payload?: unknown,
) {
  const body = payload === undefined ? '' : JSON.stringify(payload)
  const response = await fetch(`https://api.mch.weixin.qq.com${canonicalUrl}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: buildWechatAuthorization(method, canonicalUrl, body, config),
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  })
  const responseBody = await response.text()
  const requestId = response.headers.get('request-id') || response.headers.get('Request-ID') || ''
  if (!verifyWechatResponse(
    response.headers.get('wechatpay-timestamp'),
    response.headers.get('wechatpay-nonce'),
    response.headers.get('wechatpay-signature'),
    response.headers.get('wechatpay-serial'),
    responseBody,
    config,
  )) {
    throw Object.assign(new Error('WECHAT_RESPONSE_SIGNATURE_INVALID'), { requestId })
  }
  let data: Record<string, unknown> = {}
  try {
    data = responseBody ? JSON.parse(responseBody) : {}
  } catch {
    throw Object.assign(new Error('WECHAT_RESPONSE_INVALID'), { requestId })
  }
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : 'WECHAT_PAY_REQUEST_FAILED'
    throw Object.assign(new Error(message), {
      code: data.code,
      requestId,
      status: response.status,
    })
  }
  return { data, requestId }
}
