import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json()
    if (!uuid) return NextResponse.json({ error: 'Missing uuid' }, { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = beijingNow.toISOString().split('T')[0]

    // 尝试插入（每用户每天只写一次）
    const { error: insertError } = await supabase
      .from('daily_user_activity')
      .insert({ date: today, uuid })

    if (!insertError) {
      // 插入成功 = 今天首次，检查是否全局新用户
      const { count } = await supabase
        .from('daily_user_activity')
        .select('*', { count: 'exact', head: true })
        .eq('uuid', uuid)

      // 只出现过 1 次（就是刚才插入的）= 新用户
      if (count === 1) {
        await supabase
          .from('daily_user_activity')
          .update({ is_new: true })
          .eq('date', today)
          .eq('uuid', uuid)
      }
    }
    // insertError 且 code=23505 = 今天的记录已存在，忽略即可

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // 静默失败，不影响用户
  }
}
