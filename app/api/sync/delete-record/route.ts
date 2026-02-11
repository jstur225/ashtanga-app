import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

/**
 * 服务端软删除记录 API
 * 使用 service_role 绕过 RLS 策略
 */
export async function POST(request: NextRequest) {
  try {
    const { recordId } = await request.json()

    console.log('========== 服务端软删除记录 ==========')
    console.log('记录ID:', recordId)

    if (!recordId) {
      return NextResponse.json(
        { error: '缺少记录ID' },
        { status: 400 }
      )
    }

    // 使用 service_role（绕过 RLS）
    const supabaseAdmin = getSupabaseServiceClient()
    const { error } = await supabaseAdmin
      .from('practice_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId)
      .is('deleted_at', null)

    if (error) {
      console.error('❌ 删除失败:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 记录已软删除')

    return NextResponse.json({
      success: true
    })

  } catch (error: any) {
    console.error('❌ 删除异常:', error)
    return NextResponse.json(
      { error: '删除失败，请重试' },
      { status: 500 }
    )
  }
}
