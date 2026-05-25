import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json()
    if (!uuid) return NextResponse.json({ error: 'Missing uuid' }, { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 用北京时间生成今日日期（与 practice_records 客户端时区一致）
    const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = beijingNow.toISOString().split('T')[0]

    // 先尝试 update 已有记录
    const { data, error: updateError } = await supabase
      .from('daily_user_activity')
      .update({ has_practiced: true })
      .eq('date', today)
      .eq('uuid', uuid)
      .select('date')

    if (updateError) {
      console.error('[RecordPractice] Update failed:', updateError)
    }

    // 如果没有匹配的记录，insert 一条新的
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase
        .from('daily_user_activity')
        .insert({ date: today, uuid, has_practiced: true })

      if (insertError) {
        console.error('[RecordPractice] Insert failed:', insertError)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // 静默失败，不影响用户
  }
}
