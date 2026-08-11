import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { ensureProfileAndGetId } from '@/lib/membership-utils'
import type { PaymentPlan } from '@/lib/wechat-pay'

export interface PaymentOrderRow {
  id: string
  out_trade_no: string
  auth_user_id: string
  profile_id: string
  email: string | null
  plan: string
  description: string
  amount_total: number
  currency: string
  duration_days: number
  status: string
  transaction_id: string | null
  paid_at: string | null
  membership_id: string | null
  fail_reason: string | null
}
export function createPaymentSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_PAYMENT_CONFIG_MISSING')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function authenticatePaymentRequest(request: NextRequest, supabase: SupabaseClient) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export async function createPaymentOrder(
  supabase: SupabaseClient,
  user: User,
  plan: PaymentPlan,
  outTradeNo: string,
) {
  const profileId = await ensureProfileAndGetId(supabase, user)
  const { data, error } = await supabase
    .from('payment_orders')
    .insert({
      out_trade_no: outTradeNo,
      auth_user_id: user.id,
      profile_id: profileId,
      email: user.email || null,
      plan: plan.id,
      description: plan.description,
      amount_total: plan.amount_total,
      currency: 'CNY',
      duration_days: plan.duration_days,
      status: 'created',
    })
    .select('*')
    .single()
  if (error || !data) throw new Error('PAYMENT_ORDER_CREATE_FAILED')
  return data as PaymentOrderRow
}

export async function updatePaymentOrder(
  supabase: SupabaseClient,
  orderId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('payment_orders')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw new Error('PAYMENT_ORDER_UPDATE_FAILED')
}

export async function getPaymentOrderForUser(
  supabase: SupabaseClient,
  orderId: string,
  authUserId: string,
) {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('id', orderId)
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) throw new Error('PAYMENT_ORDER_QUERY_FAILED')
  return data as PaymentOrderRow | null
}

export async function fulfillPaymentOrder(
  supabase: SupabaseClient,
  payment: {
    out_trade_no: string
    transaction_id: string
    success_time?: string
    amount: { total: number; currency: string }
  },
) {
  const { data, error } = await supabase.rpc('fulfill_membership_payment', {
    p_out_trade_no: payment.out_trade_no,
    p_transaction_id: payment.transaction_id,
    p_paid_at: payment.success_time || new Date().toISOString(),
    p_amount_total: payment.amount.total,
    p_currency: payment.amount.currency,
  })
  if (error || !data || !data[0]) {
    throw new Error(error?.message || 'PAYMENT_FULFILL_FAILED')
  }
  return data[0] as {
    order_id: string
    membership_id: string
    expires_at: string
    already_fulfilled: boolean
  }
}

export async function exchangeLoginCode(code: string, appId: string, appSecret: string) {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json() as {
    openid?: string
    session_key?: string
    errcode?: number
    errmsg?: string
  }
  if (!response.ok || data.errcode || !data.openid) {
    throw new Error(data.errmsg || 'WECHAT_LOGIN_CODE_INVALID')
  }
  return data.openid
}

export function normalizeWechatOrderState(value: unknown) {
  switch (value) {
    case 'SUCCESS': return 'paid'
    case 'CLOSED': return 'closed'
    case 'REFUND': return 'refunded'
    case 'PAYERROR': return 'failed'
    case 'USERPAYING':
    case 'NOTPAY':
    default: return 'pending'
  }
}
