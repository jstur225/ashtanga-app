import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 通过 practice_record_id 和 oss_url 删除照片
 * POST /api/photos/delete-by-record
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body = await request.json()
    const { practice_record_id, oss_url } = body

    if (!practice_record_id || !oss_url) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      )
    }

    // 3. 查找并软删除照片
    const { data: photos, error: findError } = await supabase
      .from('photos')
      .select('id')
      .eq('practice_record_id', practice_record_id)
      .eq('user_id', user.id)
      .eq('oss_url', oss_url)
      .is('deleted_at', null)

    if (findError) {
      console.error('[Delete Photo] 查找照片失败:', findError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'PHOTO_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. 软删除照片
    const { error: updateError } = await supabase
      .from('photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photos[0].id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Delete Photo] 软删除失败:', updateError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // 5. 清空 practice_records.photos 字段
    const { error: recordError } = await supabase
      .from('practice_records')
      .update({
        photos: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', practice_record_id)
      .eq('user_id', user.id)

    if (recordError) {
      console.error('[Delete Photo] 清空记录 photos 字段失败:', recordError)
      // 不影响删除结果
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete Photo] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
