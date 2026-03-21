import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 照片元数据 CRUD API
 * POST /api/photos - 创建照片元数据
 */

// POST - 创建照片元数据
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
    const {
      practice_record_id,
      oss_url,
      oss_key,
      file_size,
      mime_type,
    } = body

    // 3. 验证必填字段
    if (!practice_record_id || !oss_url || !oss_key || !file_size) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      )
    }

    // 4. 检查今日上传限额（临时改为10张用于测试）
    const { data: canUpload, error: limitError } = await supabase.rpc(
      'can_user_upload_today',
      { user_uuid: user.id, max_photos: 10 }
    )

    if (limitError) {
      console.error('[Photos API] 检查限额失败:', limitError)
      return NextResponse.json(
        { success: false, error: 'CHECK_LIMIT_FAILED' },
        { status: 500 }
      )
    }

    if (!canUpload) {
      return NextResponse.json(
        { success: false, error: 'DAILY_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // 5. 检查记录是否已有照片
    const { data: existingPhotos, error: countError } = await supabase
      .from('photos')
      .select('id')
      .eq('practice_record_id', practice_record_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (countError) {
      console.error('[Photos API] 查询现有照片失败:', countError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (existingPhotos && existingPhotos.length >= 1) {
      return NextResponse.json(
        { success: false, error: 'RECORD_PHOTO_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // 6. 验证记录存在且属于当前用户
    const { data: record, error: recordError } = await supabase
      .from('practice_records')
      .select('id')
      .eq('id', practice_record_id)
      .eq('user_id', user.id)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        { success: false, error: 'RECORD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 7. 插入照片元数据
    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        practice_record_id,
        oss_url,
        oss_key,
        file_size,
        mime_type,
        display_order: 0,
      })
      .select('id, practice_record_id, oss_url, oss_key, file_size, mime_type, display_order, uploaded_at')
      .single()

    if (insertError) {
      console.error('[Photos API] 插入照片失败:', insertError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: photo,
    })
  } catch (error) {
    console.error('[Photos API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
