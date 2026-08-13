import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteOssObjectByUrl } from '@/lib/oss-delete'

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

    // 5. 只移除当前照片，按剩余未删除照片重建记录字段。
    const { data: remainingPhotos, error: remainingError } = await supabase
      .from('photos')
      .select('oss_url, display_order, uploaded_at')
      .eq('practice_record_id', practice_record_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('uploaded_at', { ascending: true })

    if (remainingError) {
      console.error('[Delete Photo] 查询剩余照片失败:', remainingError)
    }
    const remainingUrls = (remainingPhotos || []).map((item) => item.oss_url).filter(Boolean)
    const { error: recordError } = await supabase
      .from('practice_records')
      .update({
        photos: JSON.stringify(remainingUrls),
        updated_at: new Date().toISOString(),
      })
      .eq('id', practice_record_id)
      .eq('user_id', user.id)

    if (recordError) {
      console.error('[Delete Photo] 更新记录 photos 字段失败:', recordError)
      // 不影响删除结果
    }

    // 6. 元数据已软删后，尽力删除 OSS 对象，避免留下孤儿文件。
    //    失败只记录、不影响删除结果（最坏情况与旧行为一致：文件残留待兜底清理）。
    const ossResult = await deleteOssObjectByUrl(oss_url, user.id)
    if (!ossResult.ok) {
      console.error('[Delete Photo] OSS 对象删除失败（元数据已删，文件可能残留）:', {
        oss_url,
        reason: ossResult.error,
        status: ossResult.status,
      })
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
