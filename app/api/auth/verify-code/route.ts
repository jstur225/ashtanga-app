import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 验证验证码
export async function POST(request: NextRequest) {
  try {
    const { email, code, type = 'email_verification' } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: '请提供邮箱和验证码' },
        { status: 400 }
      )
    }

    // 查询验证码
    const now = new Date().toISOString()

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

    if (error || !verificationData) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

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
  } catch {
    return NextResponse.json(
      { error: '验证失败，请重试' },
      { status: 500 }
    )
  }
}
