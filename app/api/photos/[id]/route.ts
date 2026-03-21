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

    // 3. 验证照片存在且属于当前用户
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('photos')
      .select('id, user_id')
      .eq('id', id)
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

    // 4. 执行软删除（使用 SECURITY DEFINER 绕过 RLS）
    const { data: deleteResult, error: updateError } = await supabase.rpc(
      'delete_photo_debug',
      { p_photo_id: id, p_user_id: user.id }
    )

    if (updateError) {
      console.error('[Photos API] 删除照片失败:', updateError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (updateError) {
      console.error('[Photos API] 删除照片失败:', updateError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
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
