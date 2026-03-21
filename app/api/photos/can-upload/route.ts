import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 检查是否可以上传照片
 * GET /api/photos/can-upload
 */
export async function GET(request: NextRequest) {
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

    // 2. 检查今日上传限额
    const { data: canUpload, error: limitError } = await supabase.rpc(
      'can_user_upload_today',
      { user_uuid: user.id, max_photos: 1 }
    )

    if (limitError) {
      console.error('[Photos API] 检查限额失败:', limitError)
      return NextResponse.json(
        { success: false, error: 'CHECK_LIMIT_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      canUpload: canUpload ?? false,
    })
  } catch (error) {
    console.error('[Photos API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
