import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 验证验证码
export async function POST(request: NextRequest) {
  try {
    const { email, code, type = 'email_verification' } = await request.json()

    console.log('========== 验证码验证请求 ==========')
    console.log('邮箱:', email)
    console.log('验证码:', code)
    console.log('类型:', type)

    if (!email || !code) {
      console.log('❌ 缺少必要参数')
      return NextResponse.json(
        { error: '请提供邮箱和验证码' },
        { status: 400 }
      )
    }

    // 查询验证码
    const now = new Date().toISOString()
    console.log('当前时间(UTC):', now)

    // 先查询所有未使用的验证码（用于调试）
    const { data: allCodes, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })

    console.log('数据库中所有未使用验证码:', JSON.stringify(allCodes, null, 2))

    const { data: verificationData, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', type) // 使用传入的 type 参数
      .gte('expires_at', now) // 使用当前时间比较
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('验证码查询结果:', { error, verificationData })

    if (error || !verificationData) {
      console.log('❌ 验证码验证失败')
      console.log('错误信息:', error)
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    console.log('✅ 验证码验证成功')
    console.log('过期时间:', verificationData.expires_at)

    if (error || !verificationData) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    // 标记验证码为已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id)

    return NextResponse.json({
      success: true,
      message: '验证成功',
    })
  } catch (error: any) {
    console.error('验证验证码失败:', error)
    return NextResponse.json(
      { error: '验证失败，请重试' },
      { status: 500 }
    )
  }
}
