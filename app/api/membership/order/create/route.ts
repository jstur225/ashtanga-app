import { NextRequest, NextResponse } from 'next/server'
import {
  buildMiniProgramPaymentParams,
  createOutTradeNo,
  getPaymentPlan,
  getWechatPayConfig,
  requestWechatPay,
} from '@/lib/wechat-pay'
import {
  authenticatePaymentRequest,
  createPaymentOrder,
  createPaymentSupabaseClient,
  exchangeLoginCode,
  updatePaymentOrder,
} from '@/lib/payment-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function POST(request: NextRequest) {
  let orderId = ''
  let paymentSupabase: SupabaseClient | null = null
  try {
    const supabase = createPaymentSupabaseClient()
    paymentSupabase = supabase
    const user = await authenticatePaymentRequest(request, supabase)
    if (!user) return jsonError('NOT_AUTHENTICATED', 401)

    const body = await request.json().catch(() => null) as { plan?: unknown; code?: unknown } | null
    const plan = getPaymentPlan(body?.plan)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!plan || !code) return jsonError('INVALID_REQUEST', 400)

    const config = getWechatPayConfig()
    const openid = await exchangeLoginCode(code, config.appId, config.appSecret)
    const order = await createPaymentOrder(supabase, user, plan, createOutTradeNo())
    orderId = order.id

    const { data, requestId } = await requestWechatPay(
      'POST',
      '/v3/pay/transactions/jsapi',
      config,
      {
        appid: config.appId,
        mchid: config.mchId,
        description: plan.description,
        out_trade_no: order.out_trade_no,
        notify_url: config.notifyUrl,
        amount: { total: plan.amount_total, currency: 'CNY' },
        payer: { openid },
        attach: order.id,
      },
    )
    const prepayId = typeof data.prepay_id === 'string' ? data.prepay_id : ''
    if (!prepayId) throw new Error('WECHAT_PREPAY_ID_MISSING')
    await updatePaymentOrder(supabase, order.id, {
      status: 'prepay',
      prepay_id: prepayId,
    })

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        plan: plan.id,
        amount_total: plan.amount_total,
        ...buildMiniProgramPaymentParams(prepayId, config),
      },
      request_id: requestId || undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PAYMENT_CREATE_FAILED'
    const requestId = typeof error === 'object' && error && 'requestId' in error
      ? String(error.requestId || '')
      : ''
    console.error('wechat payment create failed', { orderId, message, requestId })
    if (paymentSupabase && orderId) {
      await updatePaymentOrder(paymentSupabase, orderId, {
        status: 'failed',
        fail_reason: message.slice(0, 500),
      }).catch(() => undefined)
    }
    if (/CONFIG|Missing|Invalid WECHAT|must be 32 bytes/.test(message)) {
      return jsonError('PAYMENT_NOT_CONFIGURED', 503)
    }
    return jsonError('PAYMENT_CREATE_FAILED', 502)
  }
}
