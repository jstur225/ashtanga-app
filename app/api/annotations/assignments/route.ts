import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = getServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

async function getProfileId(userId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ==================== GET — 按月查询标注 ====================
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // 格式: 2026-04

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: 'INVALID_MONTH' }, { status: 400 })
    }

    // 计算该月日期范围
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr)
    const mon = parseInt(monthStr)
    const startDate = `${year}-${monthStr}-01`
    const lastDay = new Date(year, mon, 0).getDate()
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

    const supabase = getServiceClient()

    // 1. 先查用户所有的标注类型 ID
    const { data: userTypes, error: typeError } = await supabase
      .from('annotation_types')
      .select('id, label, color')
      .eq('user_id', profileId)

    if (typeError) {
      console.error('[Annotations API] 查询标注类型失败:', typeError)
      return NextResponse.json({ success: false, error: 'QUERY_FAILED' }, { status: 500 })
    }

    if (!userTypes || userTypes.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const typeIds = userTypes.map(t => t.id)
    const typeMap = new Map(userTypes.map(t => [t.id, { label: t.label, color: t.color }]))

    // 2. 查该月标注
    const { data: annotations, error: annError } = await supabase
      .from('calendar_annotations')
      .select('*')
      .in('annotation_type_id', typeIds)
      .gte('date', startDate)
      .lte('date', endDate)

    if (annError) {
      console.error('[Annotations API] 查询标注失败:', annError)
      return NextResponse.json({ success: false, error: 'QUERY_FAILED' }, { status: 500 })
    }

    // 3. 组装数据：附带类型信息
    const enriched = (annotations ?? []).map(a => ({
      ...a,
      type: typeMap.get(a.annotation_type_id) ?? null,
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// ==================== POST — 添加标注（幂等：已存在则忽略） ====================
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    const body = await request.json()
    const { type_id, date } = body

    if (!type_id || !date) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 })
    }

    // 校验日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'INVALID_DATE' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // 校验标注类型属于当前用户
    const { data: typeData } = await supabase
      .from('annotation_types')
      .select('id')
      .eq('id', type_id)
      .eq('user_id', profileId)
      .maybeSingle()

    if (!typeData) {
      return NextResponse.json({ success: false, error: 'TYPE_NOT_FOUND' }, { status: 404 })
    }

    // 幂等添加
    const { data, error } = await supabase
      .from('calendar_annotations')
      .insert({ annotation_type_id: type_id, date })
      .select()
      .maybeSingle()

    if (error) {
      // 唯一约束冲突 → 已存在，忽略
      if (error.code === '23505') {
        return NextResponse.json({ success: true, data: null, already_exists: true })
      }
      console.error('[Annotations API] 添加标注失败:', error)
      return NextResponse.json({ success: false, error: 'CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// ==================== DELETE — 删除标注（幂等：不存在则忽略） ====================
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const type_id = searchParams.get('type_id')
    const date = searchParams.get('date')

    if (!type_id || !date) {
      return NextResponse.json({ success: false, error: 'MISSING_PARAMS' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // 校验标注类型属于当前用户
    const { data: typeData } = await supabase
      .from('annotation_types')
      .select('id')
      .eq('id', type_id)
      .eq('user_id', profileId)
      .maybeSingle()

    if (!typeData) {
      return NextResponse.json({ success: false, error: 'TYPE_NOT_FOUND' }, { status: 404 })
    }

    // 幂等删除
    const { error } = await supabase
      .from('calendar_annotations')
      .delete()
      .eq('annotation_type_id', type_id)
      .eq('date', date)

    if (error) {
      console.error('[Annotations API] 删除标注失败:', error)
      return NextResponse.json({ success: false, error: 'DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
