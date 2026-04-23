import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 近 24 小时练习人数（去重用户，无时区问题）
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('practice_records')
      .select('user_id')
      .gte('created_at', since)

    if (error) {
      console.error('[Stats] Failed to fetch today count:', error)
      return NextResponse.json({ count: 0 })
    }

    const uniqueUsers = new Set(data?.map(r => r.user_id))
    return NextResponse.json({ count: uniqueUsers.size })
  } catch (error) {
    console.error('[Stats] Error fetching today count:', error)
    return NextResponse.json({ count: 0 })
  }
}
