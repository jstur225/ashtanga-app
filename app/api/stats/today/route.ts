import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatServerTiming, timed, type TimingMetric } from '@/lib/server-timing'

export const dynamic = 'force-dynamic'

// 禁止缓存，确保每次请求都返回最新数据
export const fetchCache = 'force-no-store'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const metrics: TimingMetric[] = []
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ count: 0 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 用北京时间生成今日日期，匹配客户端的 date 字段
    const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = beijingNow.toISOString().split('T')[0]

    // 1. 已绑定用户的练习次数
    const { result: practiceResult, durationMs: practiceMs } = await timed(() =>
      supabase
        .from('practice_records')
        .select('id')
        .eq('date', today)
    )
    metrics.push({ name: 'practice_records', durationMs: practiceMs })
    const practiceData = practiceResult.data
    const practiceError = practiceResult.error

    if (practiceError) {
      console.error('[Stats] Failed to fetch today count:', practiceError)
      const response = NextResponse.json({ count: 0 })
      response.headers.set('Server-Timing', formatServerTiming(metrics))
      return response
    }

    // 2. 无绑定设备的练习设备数
    const { result: deviceResult, durationMs: deviceMs } = await timed(() =>
      supabase
        .from('daily_user_activity')
        .select('uuid')
        .eq('date', today)
        .eq('has_practiced', true)
    )
    metrics.push({ name: 'daily_user_activity', durationMs: deviceMs })
    const deviceData = deviceResult.data
    const deviceError = deviceResult.error

    if (deviceError) {
      console.error('[Stats] Failed to fetch device practice count:', deviceError)
    }

    const boundCount = practiceData?.length || 0
    const unboundCount = deviceData?.length || 0

    const response = NextResponse.json({ count: boundCount + unboundCount })
    response.headers.set('Server-Timing', formatServerTiming(metrics))
    return response
  } catch (error) {
    console.error('[Stats] Error fetching today count:', error)
    return NextResponse.json({ count: 0 })
  }
}