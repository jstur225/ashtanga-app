import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      is_active: true,
      expires_at: '2025-07-14T00:00:00Z',
      expires_at_formatted: '2025.07.14',
      days_remaining: 85,
      type: 'quarter'
    },
    message: '测试会员状态 API'
  })
}
