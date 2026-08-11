import { NextRequest, NextResponse } from 'next/server'
import {
  getWechatPayConfig,
  requestWechatPay,
} from '@/lib/wechat-pay'
import {
  authenticatePaymentRequest,
  createPaymentSupabaseClient,
  fulfillPaymentOrder,
  getPaymentOrderForUser,
  normalizeWechatOrderState,
  updatePaymentOrder,
} from '@/lib/payment-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}
export async function GET(request: NextRequest) {
  try {
    const supabase = createPaymentSupabaseClient()
    const user = await authenticatePaymentRequest(request, supabase)
    if (!user) return jsonError('NOT_AUTHENTICATED', 401)
    const orderId = request.nextUrl.searchParams.get('order_id') || ''
    if (!orderId) return jsonError('INVALID_REQUEST', 400)
    const order = await getPaymentOrderForUser(supabase, orderId, user.id)
    if (!order) return jsonError('ORDER_NOT_FOUND', 404)

    if (order.status === 'paid') {
      return NextResponse.json({
        success: true,
        data: { status: 'paid', order_id: order.id, membership_id: order.membership_id },
      })
    }
    if (['closed', 'failed', 'refunded'].includes(order.status)) {
      return NextResponse.json({
        success: true,
        data: { status: order.status, order_id: order.id, fail_reason: order.fail_reason },
      })
    }

    const config = getWechatPayConfig()
    const canonicalUrl = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.out_trade_no)}?mchid=${encodeURIComponent(config.mchId)}`
    const { data } = await requestWechatPay('GET', canonicalUrl, config)
    const state = normalizeWechatOrderState(data.trade_state)
    if (state === 'paid') {
      if (
        data.appid !== config.appId ||
        data.mchid !== config.mchId ||
        typeof data.transaction_id !== 'string' ||
        !data.amount ||
        typeof data.amount !== 'object'
      ) {
        return jsonError('PAYMENT_RESULT_INVALID', 502)
      }
      const amount = data.amount as { total?: unknown; currency?: unknown }
      const fulfilled = await fulfillPaymentOrder(supabase, {
        out_trade_no: order.out_trade_no,
        transaction_id: data.transaction_id,
        success_time: typeof data.success_time === 'string' ? data.success_time : undefined,
        amount: {
          total: Number(amount.total),
          currency: String(amount.currency || ''),
        },
      })
      return NextResponse.json({
        success: true,
        data: {
          status: 'paid',
          order_id: order.id,
          membership_id: fulfilled.membership_id,
          expires_at: fulfilled.expires_at,
        },
      })
    }
    if (state !== 'pending') {
      await updatePaymentOrder(supabase, order.id, {
        status: state,
        fail_reason: typeof data.trade_state_desc === 'string' ? data.trade_state_desc : null,
      })
    }
    return NextResponse.json({ success: true, data: { status: state, order_id: order.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PAYMENT_STATUS_FAILED'
    const requestId = typeof error === 'object' && error && 'requestId' in error
      ? String(error.requestId || '')
      : ''
    console.error('wechat payment status failed', { message, requestId })
    return jsonError('PAYMENT_STATUS_FAILED', 502)
  }
}
