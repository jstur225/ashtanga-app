import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const today = new Date().toISOString().split('T')[0]

    // 查询今日练习人数（去重用户）
    const { data, error } = await supabase
      .from('practice_records')
      .select('uuid')
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59')

    if (error) {
      console.error('[Stats] Failed to fetch today count:', error)
      return NextResponse.json({ count: 0 })
    }

    // 去重统计
    const uniqueUsers = new Set(data?.map(r => r.uuid))
    return NextResponse.json({ count: uniqueUsers.size })
  } catch (error) {
    console.error('[Stats] Error fetching today count:', error)
    return NextResponse.json({ count: 0 })
  }
}
