import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

/**
 * 服务端上传用户资料 API
 * 使用 service_role 绕过 RLS 策略
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, profile } = await request.json()

    console.log('========== 服务端上传用户资料 ==========')
    console.log('用户ID:', userId)
    console.log('用户资料:', profile)

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      )
    }

    // 使用 service_role（绕过 RLS）
    const supabaseAdmin = getSupabaseServiceClient()
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        name: profile.name || '阿斯汤加习练者',
        signature: profile.signature || '练习、练习，一切随之而来。',
        avatar: null,
        is_pro: profile.is_pro || false,
        email: profile.email || null,
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('❌ 上传失败:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 上传成功:', data)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('❌ 上传异常:', error)
    return NextResponse.json(
      { error: '上传失败，请重试' },
      { status: 500 }
    )
  }
}
