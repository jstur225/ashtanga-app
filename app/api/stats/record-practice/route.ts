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

    // 账号关联与练习标记分开写：即使数据库迁移稍后执行，
    // has_practiced 仍会按旧表结构正常记录。
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
