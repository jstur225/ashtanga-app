import { NextResponse } from 'next/server'
import { getWechatPayConfig } from '@/lib/wechat-pay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

const CONFIG_ERROR_CODES: Array<[RegExp, string]> = [
  [/NEXT_PUBLIC_SUPABASE_URL/, 'SUPABASE_URL_MISSING'],
  [/SUPABASE_(?:SERVICE_KEY|SERVICE_ROLE_KEY)/, 'SUPABASE_SERVICE_KEY_MISSING'],
  [/WECHAT_MINI_APP_ID/, 'WECHAT_MINI_APP_ID_INVALID'],
  [/WECHAT_MINI_APP_SECRET/, 'WECHAT_MINI_APP_SECRET_MISSING'],
  [/WECHAT_PAY_MCH_ID/, 'WECHAT_PAY_MCH_ID_INVALID'],
  [/WECHAT_PAY_MERCHANT_SERIAL_NO/, 'WECHAT_PAY_MERCHANT_SERIAL_NO_MISSING'],
  [/WECHAT_PAY_PRIVATE_KEY_BASE64/, 'WECHAT_PAY_PRIVATE_KEY_BASE64_INVALID'],
  [/WECHAT_PAY_API_V3_KEY/, 'WECHAT_PAY_API_V3_KEY_INVALID'],
  [/WECHAT_PAY_PUBLIC_KEY_ID/, 'WECHAT_PAY_PUBLIC_KEY_ID_INVALID'],
  [/WECHAT_PAY_PUBLIC_KEY_BASE64/, 'WECHAT_PAY_PUBLIC_KEY_BASE64_INVALID'],
  [/WECHAT_PAY_NOTIFY_URL/, 'WECHAT_PAY_NOTIFY_URL_INVALID'],
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
    getWechatPayConfig()
    return NextResponse.json({ success: true, data: { ready: true, error_code: null } })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { ready: false, error_code: safeConfigErrorCode(error) },
    })
  }
}
