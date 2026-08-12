import { NextRequest, NextResponse } from 'next/server'
import {
  authenticatePaymentRequest,
  createPaymentSupabaseClient,
  listPaymentOrdersForUser,
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

    const orders = await listPaymentOrdersForUser(supabase, user.id, 20)
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    console.error('membership payment order list failed', {
      message: error instanceof Error ? error.message : 'PAYMENT_ORDER_LIST_FAILED',
    })
    return jsonError('PAYMENT_ORDER_LIST_FAILED', 502)
  }
}
