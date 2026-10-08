import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { normalizeAuthEmail } from '@/lib/auth-email'

// 验证验证码
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, code, type = 'email_verification' } = await request.json()
    const email = normalizeAuthEmail(rawEmail)

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

    // 忘记密码还有“设置新密码”这一步，不能在这里只预览验证后就消费。
    // reset-password 会在真正更新密码前原子占用，并在更新失败时释放。
    if (type !== 'reset_password') {
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationData.id)
    }

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
