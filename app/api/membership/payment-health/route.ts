import { NextResponse } from 'next/server'
import { getWechatVirtualPayConfig } from '@/lib/wechat-virtual-pay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

const CONFIG_ERROR_CODES: Array<[RegExp, string]> = [
  [/NEXT_PUBLIC_SUPABASE_URL/, 'SUPABASE_URL_MISSING'],
  [/SUPABASE_(?:SERVICE_KEY|SERVICE_ROLE_KEY)/, 'SUPABASE_SERVICE_KEY_MISSING'],
  [/WECHAT_MINI_APP_ID/, 'WECHAT_MINI_APP_ID_INVALID'],
  [/WECHAT_MINI_APP_SECRET/, 'WECHAT_MINI_APP_SECRET_MISSING'],
  [/WECHAT_VIRTUAL_PAY_OFFER_ID/, 'WECHAT_VIRTUAL_PAY_OFFER_ID_INVALID'],
  [/WECHAT_VIRTUAL_PAY_ENV/, 'WECHAT_VIRTUAL_PAY_ENV_INVALID'],
  [/WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY/, 'WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY_MISSING'],
  [/WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY/, 'WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY_MISSING'],
]

function safeConfigErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return CONFIG_ERROR_CODES.find(([pattern]) => pattern.test(message))?.[1]
    || 'PAYMENT_CONFIGURATION_INVALID'
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      data: { ready: false, error_code: 'SUPABASE_URL_MISSING' },
    })
  }
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      success: true,
      data: { ready: false, error_code: 'SUPABASE_SERVICE_KEY_MISSING' },
    })
  }
  try {
    const config = getWechatVirtualPayConfig()
    return NextResponse.json({
      success: true,
      data: {
        ready: true,
        error_code: null,
        provider: 'wechat_virtual_pay',
        env: config.env,
        offer_id: config.offerId,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { ready: false, error_code: safeConfigErrorCode(error) },
    })
  }
}
