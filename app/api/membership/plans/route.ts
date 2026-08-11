import { NextResponse } from 'next/server'
import { publicPaymentPlans } from '@/lib/wechat-pay'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({ success: true, data: publicPaymentPlans() })
}
