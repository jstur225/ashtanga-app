import { NextRequest, NextResponse } from 'next/server'
import {
  createOutTradeNo,
  getPaymentPlan,
} from '@/lib/wechat-pay'
import {
  buildVirtualPaymentParams,
  getVirtualProductId,
  getWechatVirtualPayConfig,
} from '@/lib/wechat-virtual-pay'
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

    const config = getWechatVirtualPayConfig()
    const { openid, sessionKey } = await exchangeLoginCode(code, config.appId, config.appSecret)
    const productId = getVirtualProductId(plan.id)
    const order = await createPaymentOrder(supabase, user, plan, createOutTradeNo(), {
      productId,
      openid,
      env: config.env,
    })
    orderId = order.id
    await updatePaymentOrder(supabase, order.id, {
      status: 'prepay',
    })

    const paymentParams = buildVirtualPaymentParams(
      plan,
      order.out_trade_no,
      order.id,
      sessionKey,
      config,
    )

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        plan: plan.id,
        amount_total: plan.amount_total,
        product_id: productId,
        virtual_env: config.env,
        ...paymentParams,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PAYMENT_CREATE_FAILED'
    console.error('wechat virtual payment create failed', { orderId, message })
    if (paymentSupabase && orderId) {
      await updatePaymentOrder(paymentSupabase, orderId, {
        status: 'failed',
        fail_reason: message.slice(0, 500),
      }).catch(() => undefined)
    }
    if (/CONFIG|Missing|Invalid WECHAT/.test(message)) {
      return jsonError('PAYMENT_NOT_CONFIGURED', 503)
    }
    return jsonError('PAYMENT_CREATE_FAILED', 502)
  }
}
