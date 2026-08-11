import crypto from 'node:crypto'
import type { PaymentPlan, PaymentPlanId } from '@/lib/wechat-pay'

export interface WechatVirtualPayConfig {
  appId: string
  appSecret: string
  offerId: string
  env: 0 | 1
  appKey: string
}

export interface VirtualPaymentOrder {
  order_id?: string
  wx_order_id?: string
  channel_order_id?: string
  wxpay_order_id?: string
  status?: number
  order_fee?: number
  paid_fee?: number
  paid_time?: number
  env_type?: number
  biz_meta?: string
}

const PRODUCT_IDS: Readonly<Record<PaymentPlanId, string>> = Object.freeze({
  quarter: 'pro90d',
  year: 'pro365d',
})

let accessTokenCache: { appId: string; token: string; expiresAt: number } | null = null

export function getWechatVirtualPayConfig(): WechatVirtualPayConfig {
  const appId = process.env.WECHAT_MINI_APP_ID || ''
  const appSecret = process.env.WECHAT_MINI_APP_SECRET || ''
  const offerId = process.env.WECHAT_VIRTUAL_PAY_OFFER_ID || ''
  const envRaw = process.env.WECHAT_VIRTUAL_PAY_ENV || ''
  if (appId !== 'wx36f4826bc022d43f') throw new Error('Invalid WECHAT_MINI_APP_ID')
  if (!appSecret) throw new Error('Missing WECHAT_MINI_APP_SECRET')
  if (offerId !== '1450603187') throw new Error('Invalid WECHAT_VIRTUAL_PAY_OFFER_ID')
  if (envRaw !== '0' && envRaw !== '1') throw new Error('Invalid WECHAT_VIRTUAL_PAY_ENV')

  const env = Number(envRaw) as 0 | 1
  const appKey = env === 1
    ? process.env.WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY || ''
    : process.env.WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY || ''
  if (!appKey) {
    throw new Error(env === 1
      ? 'Missing WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY'
      : 'Missing WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY')
  }
  return { appId, appSecret, offerId, env, appKey }
}

export function getVirtualProductId(planId: PaymentPlanId) {
  return PRODUCT_IDS[planId]
}

export function hmacSha256Hex(key: string, message: string) {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex')
}

export function buildVirtualPaymentParams(
  plan: PaymentPlan,
  outTradeNo: string,
  attach: string,
  sessionKey: string,
  config: WechatVirtualPayConfig,
) {
  const signData = JSON.stringify({
    offerId: config.offerId,
    buyQuantity: 1,
    env: config.env,
    currencyType: 'CNY',
    productId: getVirtualProductId(plan.id),
    goodsPrice: plan.amount_total,
    outTradeNo,
    attach,
  })
  return {
    signData,
    paySig: hmacSha256Hex(config.appKey, `requestVirtualPayment&${signData}`),
    signature: hmacSha256Hex(sessionKey, signData),
    mode: 'short_series_goods' as const,
  }
}

async function requestAccessToken(config: WechatVirtualPayConfig, force = false) {
  if (
    !force &&
    accessTokenCache?.appId === config.appId &&
    accessTokenCache.expiresAt > Date.now() + 60_000
  ) {
    return accessTokenCache.token
  }
  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', config.appId)
  url.searchParams.set('secret', config.appSecret)
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json() as {
    access_token?: string
    expires_in?: number
    errcode?: number
    errmsg?: string
  }
  if (!response.ok || data.errcode || !data.access_token) {
    throw new Error(data.errmsg || 'WECHAT_ACCESS_TOKEN_FAILED')
  }
  accessTokenCache = {
    appId: config.appId,
    token: data.access_token,
    expiresAt: Date.now() + Math.max(300, Number(data.expires_in || 7200) - 120) * 1000,
  }
  return data.access_token
}

async function requestVirtualPayApi<T>(
  path: string,
  payload: Record<string, unknown>,
  config: WechatVirtualPayConfig,
  retried = false,
): Promise<T> {
  const body = JSON.stringify(payload)
  const accessToken = await requestAccessToken(config, retried)
  const paySig = hmacSha256Hex(config.appKey, `${path}&${body}`)
  const url = new URL(`https://api.weixin.qq.com${path}`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('pay_sig', paySig)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  const data = await response.json() as T & { errcode?: number; errmsg?: string }
  if ([40001, 40014, 42001].includes(Number(data.errcode)) && !retried) {
    accessTokenCache = null
    return requestVirtualPayApi<T>(path, payload, config, true)
  }
  if (!response.ok || data.errcode) {
    const error = Object.assign(new Error(data.errmsg || 'WECHAT_VIRTUAL_PAY_REQUEST_FAILED'), {
      code: data.errcode,
      status: response.status,
    })
    throw error
  }
  return data
}

export async function queryVirtualPaymentOrder(
  openid: string,
  outTradeNo: string,
  config: WechatVirtualPayConfig,
) {
  const data = await requestVirtualPayApi<{ order?: VirtualPaymentOrder }>(
    '/xpay/query_order',
    { openid, env: config.env, order_id: outTradeNo },
    config,
  )
  if (!data.order) throw new Error('VIRTUAL_PAYMENT_ORDER_MISSING')
  return data.order
}

export async function notifyVirtualGoodsProvided(
  outTradeNo: string,
  config: WechatVirtualPayConfig,
) {
  await requestVirtualPayApi<Record<string, never>>(
    '/xpay/notify_provide_goods',
    { order_id: outTradeNo, env: config.env },
    config,
  )
}

export function normalizeVirtualOrderState(status: unknown) {
  const value = Number(status)
  if ([2, 3, 4].includes(value)) return 'paid'
  if ([5, 8].includes(value)) return 'refunded'
  if (value === 6) return 'closed'
  if (value === 7) return 'failed'
  return 'pending'
}
