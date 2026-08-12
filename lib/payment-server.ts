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
  payment_provider: string | null
  product_id: string | null
  wechat_openid: string | null
  virtual_env: number | null
  virtual_provided_at: string | null
  created_at: string
  updated_at: string
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
  virtualPayment?: {
    productId: string
    openid: string
    env: 0 | 1
  },
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
      ...(virtualPayment ? {
        payment_provider: 'wechat_virtual_pay',
        product_id: virtualPayment.productId,
        wechat_openid: virtualPayment.openid,
        virtual_env: virtualPayment.env,
      } : {}),
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

export async function listPaymentOrdersForUser(
  supabase: SupabaseClient,
  authUserId: string,
  limit = 20,
) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
  const { data, error } = await supabase
    .from('payment_orders')
    .select('id,out_trade_no,plan,description,amount_total,currency,duration_days,status,paid_at,virtual_env,created_at')
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)
  if (error) throw new Error('PAYMENT_ORDER_LIST_FAILED')
  return (data || []) as Array<Pick<PaymentOrderRow,
    | 'id'
    | 'out_trade_no'
    | 'plan'
    | 'description'
    | 'amount_total'
    | 'currency'
    | 'duration_days'
    | 'status'
    | 'paid_at'
    | 'virtual_env'
    | 'created_at'
  >>
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
  if (!response.ok || data.errcode || !data.openid || !data.session_key) {
    throw new Error(data.errmsg || 'WECHAT_LOGIN_CODE_INVALID')
  }
  return { openid: data.openid, sessionKey: data.session_key }
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
