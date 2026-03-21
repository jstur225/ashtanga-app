import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 获取练习记录的照片列表
 * GET /api/practice-records/:id/photos
 */

export async function GET(
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

    // 2. 验证记录存在且属于当前用户
    const { data: record, error: recordError } = await supabase
      .from('practice_records')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        { success: false, error: 'RECORD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 3. 查询照片列表（绕过 RLS）
    console.log('[Photos API] 查询照片:', { recordId: id, userId: user.id })

    // 先直接查询看看数据
    const { data: directPhotos, error: directError } = await supabase
      .from('photos')
      .select('*')
      .eq('practice_record_id', id)
      .is('deleted_at', null)

    console.log('[Photos API] 直接查询结果:', {
      count: directPhotos?.length || 0,
      error: directError?.message,
      firstRecord: directPhotos?.[0]
    })

    // 使用 SECURITY DEFINER 函数绕过 RLS
    const { data: photos, error: photosError } = await supabase.rpc(
      'get_record_photos_debug',
      { p_record_id: id, p_user_id: user.id }
    )

    console.log('[Photos API] RPC 查询结果:', { photosCount: photos?.length || 0, error: photosError?.message })

    if (photosError) {
      console.error('[Photos API] 查询照片失败:', photosError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        photos: photos || [],
      },
    })
  } catch (error) {
    console.error('[Photos API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
