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

    // 2.1 检查用户是否绑定邮箱
    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_REQUIRED' },
        { status: 403 }
      )
    }

    // 2.2 获取用户会员状态（先查 profile id，再查会员状态）
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const queryId = userProfile?.id || user.id

    const { data: membershipStatus, error: membershipError } = await supabase
      .from('user_membership_status')
      .select('is_active')
      .eq('user_id', queryId)
      .maybeSingle()

    if (membershipError) {
      console.error('[Photos API] 获取会员状态失败:', membershipError)
    }

    // 普通用户最多1张，会员最多9张
    const isPro = membershipStatus?.is_active ?? false
    const maxPhotos = isPro ? 9 : 1

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

    // 4. 检查记录是否已有照片
    console.log('[Photos API] 检查现有照片:', { practice_record_id, user_id: user.id })

    const { data: existingPhotos, error: countError } = await supabase
      .from('photos')
      .select('id, user_id, practice_record_id, deleted_at')
      .eq('practice_record_id', practice_record_id)
      .is('deleted_at', null)

    console.log('[Photos API] 现有照片查询结果:', {
      count: existingPhotos?.length || 0,
      photos: existingPhotos,
      error: countError?.message
    })

    if (countError) {
      console.error('[Photos API] 查询现有照片失败:', countError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (existingPhotos && existingPhotos.length >= maxPhotos) {
      console.log(`[Photos API] 记录已有${existingPhotos.length}张照片，${isPro ? '会员' : '普通用户'}限制为${maxPhotos}张，拒绝上传`)
      return NextResponse.json(
        { success: false, error: 'RECORD_PHOTO_LIMIT_EXCEEDED', maxPhotos },
        { status: 429 }
      )
    }

    // 5. 验证记录存在且属于当前用户
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

    // 6. 插入照片元数据
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

    // 7. 更新 practice_records 表的 photos 字段
    console.log('[Photos API] 更新记录 photos 字段:', { practice_record_id, oss_url })

    const { error: updateError } = await supabase
      .from('practice_records')
      .update({
        photos: JSON.stringify([oss_url]),
        updated_at: new Date().toISOString(),
      })
      .eq('id', practice_record_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Photos API] 更新记录 photos 字段失败:', updateError)
      // 不影响照片上传成功，只记录错误
    } else {
      console.log('[Photos API] 记录 photos 字段更新成功')
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
