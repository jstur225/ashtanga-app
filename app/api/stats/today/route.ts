import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 禁止缓存，确保每次请求都返回最新数据
export const fetchCache = 'force-no-store'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 用北京时间生成今日日期，匹配客户端的 date 字段
    const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = beijingNow.toISOString().split('T')[0]

    // 1. 已绑定用户的练习次数
    const { data: practiceData, error: practiceError } = await supabase
      .from('practice_records')
      .select('id')
      .eq('date', today)

    if (practiceError) {
      console.error('[Stats] Failed to fetch today count:', practiceError)
      return NextResponse.json({ count: 0 })
    }

    // 2. 无绑定设备的练习设备数
    const { data: deviceData, error: deviceError } = await supabase
      .from('daily_user_activity')
      .select('uuid')
      .eq('date', today)
      .eq('has_practiced', true)

    if (deviceError) {
      console.error('[Stats] Failed to fetch device practice count:', deviceError)
    }

    const boundCount = practiceData?.length || 0
    const unboundCount = deviceData?.length || 0

    return NextResponse.json({ count: boundCount + unboundCount })
  } catch (error) {
    console.error('[Stats] Error fetching today count:', error)
    return NextResponse.json({ count: 0 })
  }
}
