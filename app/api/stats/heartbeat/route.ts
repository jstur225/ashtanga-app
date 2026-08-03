import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getVerifiedUserId(request: NextRequest, supabase: SupabaseClient) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return null

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user?.id ?? null
}

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json()
    if (!uuid || !UUID_PATTERN.test(uuid)) {
      return NextResponse.json({ error: 'Invalid uuid' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const userId = await getVerifiedUserId(request, supabase)
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

    // 登录发生后，把当天匿名设备归并到经过 Supabase 校验的账号。
    // 单独 update 可以兼容数据库迁移先后短暂不一致的发布窗口。
    if (userId) {
      await supabase
        .from('daily_user_activity')
        .update({ user_id: userId })
        .eq('date', today)
        .eq('uuid', uuid)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // 静默失败，不影响用户
  }
}
