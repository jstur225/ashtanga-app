import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 单张照片操作 API
 * PATCH /api/photos/:id - 软删除照片
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { deleted_at } = body

    // 3. 验证照片存在且属于当前用户（只查询未删除的照片）
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('photos')
      .select('id, user_id, practice_record_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingPhoto) {
      return NextResponse.json(
        { success: false, error: 'PHOTO_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (existingPhoto.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // 4. 执行软删除（使用 SECURITY DEFINER 函数绕过 RLS）
    const { data: deleteSuccess, error: deleteError } = await supabase.rpc(
      'soft_delete_photo',
      { p_photo_id: id, p_user_id: user.id }
    )

    if (deleteError) {
      console.error('[Photos API] 删除照片失败:', deleteError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (!deleteSuccess) {
      console.error('[Photos API] 照片删除未生效（可能已被删除或不存在）:', { photoId: id, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'DELETE_FAILED' },
        { status: 500 }
      )
    }

    console.log('[Photos API] 照片已软删除:', { photoId: id })

    // 5. 更新 practice_records 表的 photos 字段为空数组
    const { error: updateError } = await supabase
      .from('practice_records')
      .update({
        photos: JSON.stringify([]),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPhoto.practice_record_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Photos API] 更新记录 photos 字段失败:', updateError)
      // 不影响删除成功，只记录错误
    } else {
      console.log('[Photos API] 记录 photos 字段已清空:', { recordId: existingPhoto.practice_record_id })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[Photos API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
