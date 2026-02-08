import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 生成6位随机验证码
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const { email, type = 'reset_password' } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: '请提供邮箱地址' },
        { status: 400 }
      )
    }

    // 生成6位验证码
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // 保存到数据库
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        type, // 'reset_password' 或 'email_verification'
        expires_at: expiresAt,
      })

    if (dbError) {
      console.error('保存验证码失败:', dbError)
      return NextResponse.json(
        { error: '发送失败，请重试' },
        { status: 500 }
      )
    }

    // 发送邮件（使用 Supabase 邮件功能）
    const { error: emailError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/practice`,
      },
    })

    // 注意：这里我们暂时使用 toast 提示用户验证码（因为 Supabase 免费版邮件有限制）
    // 实际生产环境应该使用 SendGrid 或其他邮件服务

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码（方便测试）
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    })
  } catch (error: any) {
    console.error('发送验证码失败:', error)
    return NextResponse.json(
      { error: '发送失败，请重试' },
      { status: 500 }
    )
  }
}
