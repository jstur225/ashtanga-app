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

// 校验标注类型属于当前用户
async function verifyOwnership(typeId: string, profileId: string): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('annotation_types')
    .select('id')
    .eq('id', typeId)
    .eq('user_id', profileId)
    .maybeSingle()
  return !!data
}

// ==================== PUT — 更新标注类型 ====================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    const { id } = await params

    // 校验所有权
    const owned = await verifyOwnership(id, profileId)
    if (!owned) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.label !== undefined) {
      if (!body.label.trim() || body.label.trim().length > 50) {
        return NextResponse.json({ success: false, error: 'INVALID_LABEL' }, { status: 400 })
      }
      updates.label = body.label.trim()
    }
    if (body.color !== undefined) {
      updates.color = body.color
    }
    updates.updated_at = new Date().toISOString()

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ success: false, error: 'NO_CHANGES' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('annotation_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'DUPLICATE_LABEL' }, { status: 409 })
      }
      console.error('[Annotations API] 更新标注类型失败:', error)
      return NextResponse.json({ success: false, error: 'UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// ==================== DELETE — 删除标注类型（CASCADE 删除所有关联日期标注） ====================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    const { id } = await params

    // 校验所有权
    const owned = await verifyOwnership(id, profileId)
    if (!owned) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('annotation_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Annotations API] 删除标注类型失败:', error)
      return NextResponse.json({ success: false, error: 'DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Annotations API] 服务器错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
