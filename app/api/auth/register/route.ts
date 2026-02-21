import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 服务端注册 API
 * 强制要求验证码验证，防止绕过前端直接调用 Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, verificationCode } = await request.json()

    console.log('========== 服务端注册请求 ==========')
    console.log('邮箱:', email)
    console.log('验证码:', verificationCode)

    // 1. 参数验证
    if (!email || !password || !verificationCode) {
      console.log('❌ 缺少必要参数')
      return NextResponse.json(
        { error: '请提供邮箱、密码和验证码' },
        { status: 400 }
      )
    }

    // 2. 密码强度验证
    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码至少需要8位字符' },
        { status: 400 }
      )
    }

    if (!/[a-zA-Z]/.test(password)) {
      return NextResponse.json(
        { error: '密码必须包含字母' },
        { status: 400 }
      )
    }

    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: '密码必须包含数字' },
        { status: 400 }
      )
    }

    // 3. 验证验证码（在服务端，无法绕过）
    const now = new Date().toISOString()
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', verificationCode)
      .eq('type', 'email_verification')
      .eq('used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('验证码查询结果:', { verificationData, verificationError })

    if (verificationError || !verificationData) {
      console.log('❌ 验证码验证失败')
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    console.log('✅ 验证码验证成功')

    // 4. 验证码正确，开始注册
    console.log('开始调用 Supabase 注册...')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('❌ Supabase 注册失败:', error)

      // 提供更友好的错误信息
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: '该邮箱已注册，请直接登录' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('✅ Supabase 注册成功:', data)

    // 5. 标记验证码为已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id)

    console.log('✅ 验证码已标记为已使用')

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      }
    })

  } catch (error: any) {
    console.error('❌ 注册异常:', error)
    return NextResponse.json(
      { error: '注册失败，请重试' },
      { status: 500 }
    )
  }
}
