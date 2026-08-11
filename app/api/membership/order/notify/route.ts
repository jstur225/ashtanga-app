import { NextRequest, NextResponse } from 'next/server'
import {
  decryptWechatResource,
  getWechatPayConfig,
  verifyWechatResponse,
} from '@/lib/wechat-pay'
import {
  createPaymentSupabaseClient,
  fulfillPaymentOrder,
} from '@/lib/payment-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

function notificationError(code: string, status: number) {
  return NextResponse.json({ code, message: code }, { status })
}
export async function POST(request: NextRequest) {
  try {
    const config = getWechatPayConfig()
    const rawBody = await request.text()
    const signatureValid = verifyWechatResponse(
      request.headers.get('wechatpay-timestamp'),
      request.headers.get('wechatpay-nonce'),
      request.headers.get('wechatpay-signature'),
      request.headers.get('wechatpay-serial'),
      rawBody,
      config,
    )
    if (!signatureValid) return notificationError('SIGNATURE_INVALID', 401)

    const notification = JSON.parse(rawBody) as {
      event_type?: string
      resource?: {
        algorithm?: string
        ciphertext?: string
        nonce?: string
        associated_data?: string
      }
    }
    if (notification.event_type !== 'TRANSACTION.SUCCESS' || !notification.resource) {
      return new NextResponse(null, { status: 204 })
    }
    const payment = JSON.parse(decryptWechatResource(notification.resource, config.apiV3Key)) as {
      appid?: string
      mchid?: string
      out_trade_no?: string
      transaction_id?: string
      trade_state?: string
      success_time?: string
      amount?: { total?: number; currency?: string }
    }
    if (
      payment.appid !== config.appId ||
      payment.mchid !== config.mchId ||
      payment.trade_state !== 'SUCCESS' ||
      !payment.out_trade_no ||
      !payment.transaction_id ||
      !payment.amount ||
      typeof payment.amount.total !== 'number' ||
      payment.amount.currency !== 'CNY'
    ) {
      return notificationError('PAYMENT_RESULT_INVALID', 400)
    }
    await fulfillPaymentOrder(createPaymentSupabaseClient(), {
      out_trade_no: payment.out_trade_no,
      transaction_id: payment.transaction_id,
      success_time: payment.success_time,
      amount: { total: payment.amount.total, currency: payment.amount.currency },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('wechat payment notification failed', {
      message: error instanceof Error ? error.message : 'UNKNOWN',
    })
    return notificationError('NOTIFICATION_FAILED', 500)
  }
}
