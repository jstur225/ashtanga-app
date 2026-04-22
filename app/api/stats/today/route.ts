import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const today = new Date().toISOString().split('T')[0]

    // 查询今日活跃用户数
    const { count, error } = await supabase
      .from('daily_user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)

    if (error) {
      console.error('[Stats] Failed to fetch today count:', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('[Stats] Error fetching today count:', error)
    return NextResponse.json({ count: 0 })
  }
}
