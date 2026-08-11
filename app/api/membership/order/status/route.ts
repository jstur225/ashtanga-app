import { NextRequest, NextResponse } from 'next/server'
import {
  getWechatVirtualPayConfig,
  normalizeVirtualOrderState,
  notifyVirtualGoodsProvided,
  queryVirtualPaymentOrder,
} from '@/lib/wechat-virtual-pay'
import {
  authenticatePaymentRequest,
  createPaymentSupabaseClient,
  fulfillPaymentOrder,
  getPaymentOrderForUser,
  updatePaymentOrder,
} from '@/lib/payment-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

function paidAtIso(value: unknown) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString()
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
    if (order.payment_provider !== 'wechat_virtual_pay' || !order.wechat_openid) {
      return jsonError('VIRTUAL_PAYMENT_ORDER_MIGRATION_REQUIRED', 409)
    }

    const config = getWechatVirtualPayConfig()
    if (order.virtual_env !== config.env) {
      return jsonError('VIRTUAL_PAYMENT_ENV_MISMATCH', 409)
    }

    if (order.status === 'paid') {
      if (!order.virtual_provided_at) {
        await notifyVirtualGoodsProvided(order.out_trade_no, config)
        await updatePaymentOrder(supabase, order.id, {
          virtual_provided_at: new Date().toISOString(),
        })
      }
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

    const virtualOrder = await queryVirtualPaymentOrder(
      order.wechat_openid,
      order.out_trade_no,
      config,
    )
    const state = normalizeVirtualOrderState(virtualOrder.status)
    if (state === 'paid') {
      const amount = Number(virtualOrder.order_fee)
      const transactionId = String(
        virtualOrder.wx_order_id ||
        virtualOrder.wxpay_order_id ||
        virtualOrder.channel_order_id ||
        '',
      )
      if (!transactionId || amount !== order.amount_total) {
        return jsonError('PAYMENT_RESULT_INVALID', 502)
      }
      const fulfilled = await fulfillPaymentOrder(supabase, {
        out_trade_no: order.out_trade_no,
        transaction_id: transactionId,
        success_time: paidAtIso(virtualOrder.paid_time),
        amount: { total: amount, currency: 'CNY' },
      })
      let deliveryPending = false
      try {
        await notifyVirtualGoodsProvided(order.out_trade_no, config)
        await updatePaymentOrder(supabase, order.id, {
          virtual_provided_at: new Date().toISOString(),
        })
      } catch (error) {
        deliveryPending = true
        console.error('wechat virtual goods delivery acknowledgement failed', {
          orderId: order.id,
          message: error instanceof Error ? error.message : 'UNKNOWN',
        })
      }
      return NextResponse.json({
        success: true,
        data: {
          status: 'paid',
          order_id: order.id,
          membership_id: fulfilled.membership_id,
          expires_at: fulfilled.expires_at,
          delivery_pending: deliveryPending,
        },
      })
    }
    if (state !== 'pending') {
      await updatePaymentOrder(supabase, order.id, {
        status: state,
        fail_reason: `virtual_order_status:${String(virtualOrder.status ?? '')}`,
      })
    }
    return NextResponse.json({ success: true, data: { status: state, order_id: order.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PAYMENT_STATUS_FAILED'
    const code = typeof error === 'object' && error && 'code' in error
      ? String(error.code || '')
      : ''
    console.error('wechat virtual payment status failed', { message, code })
    return jsonError('PAYMENT_STATUS_FAILED', 502)
  }
}
