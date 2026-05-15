import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json()
    if (!uuid) return NextResponse.json({ error: 'Missing uuid' }, { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 用北京时间生成今日日期
    const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = beijingNow.toISOString().split('T')[0]

    // upsert: 如果 uuid+date 已存在则更新 has_practiced = true，否则插入
    const { error } = await supabase
      .from('daily_user_activity')
      .upsert(
        { date: today, uuid, has_practiced: true },
        { onConflict: 'uuid,date' }
      )

    if (error) {
      console.error('[RecordPractice] Upsert failed:', error)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // 静默失败，不影响用户
  }
}
