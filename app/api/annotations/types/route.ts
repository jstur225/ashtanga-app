import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 创建 service role client
function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// 验证 token 并返回 user
async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = getServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// 获取用户 profile_id
async function getProfileId(userId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// 检查是否是 Pro 用户
async function checkPro(profileId: string): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_memberships')
    .select('expires_at')
    .eq('user_id', profileId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? new Date(data.expires_at) > new Date() : false
}

// ==================== GET — 获取用户所有标注类型 ====================
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

    const supabase = getServiceClient()
    const { data: types, error } = await supabase
      .from('annotation_types')
      .select('*')
      .eq('user_id', profileId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Annotations API] 查询标注类型失败:', error)
      return NextResponse.json({ success: false, error: 'QUERY_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: types ?? [] })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// ==================== POST — 创建标注类型 ====================
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
    const { label, color } = body

    if (!label?.trim() || !color) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 })
    }

    if (label.trim().length > 50) {
      return NextResponse.json({ success: false, error: 'LABEL_TOO_LONG' }, { status: 400 })
    }

    // 校验上限
    const supabase = getServiceClient()
    const { count } = await supabase
      .from('annotation_types')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
    const currentCount = count ?? 0
    const isPro = await checkPro(profileId)
    const maxTypes = isPro ? 9 : 1

    if (currentCount >= maxTypes) {
      return NextResponse.json({
        success: false,
        error: 'LIMIT_REACHED',
        max: maxTypes,
        isPro,
      }, { status: 403 })
    }

    // 创建
    const { data, error } = await supabase
      .from('annotation_types')
      .insert({
        user_id: profileId,
        label: label.trim(),
        color,
        sort_order: currentCount,
      })
      .select()
      .single()

    if (error) {
      // 唯一约束冲突（同名）
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'DUPLICATE_LABEL' }, { status: 409 })
      }
      console.error('[Annotations API] 创建标注类型失败:', error)
      return NextResponse.json({ success: false, error: 'CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
