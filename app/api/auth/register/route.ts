import { NextRequest, NextResponse } from 'next/server'
import { supabase, getSupabaseServiceClient } from '@/lib/supabase'
import { ensureProfileAndGetId } from '@/lib/membership-utils'

/**
 * 服务端注册 API
 * 强制要求验证码验证，防止绕过前端直接调用 Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, verificationCode } = await request.json()

    // 1. 参数验证
    if (!email || !password || !verificationCode) {
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

    if (verificationError || !verificationData) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    // 4. 验证码正确，开始注册
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
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

    // 5. 赠送31天试用会员
    try {
      if (data.user) {
        const serviceClient = getSupabaseServiceClient()
        const profileId = await ensureProfileAndGetId(serviceClient, data.user)

        // 检查是否已有会员（防重复）
        const { data: existing } = await serviceClient
          .from('user_memberships')
          .select('id')
          .eq('user_id', profileId)
          .maybeSingle()

        if (!existing) {
          const expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
          await serviceClient.from('user_memberships').insert({
            user_id: profileId,
            email,
            type: 'trial',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            activated_by_code_id: null,
          })
        }
      }
    } catch {
      // 赠送失败不影响注册流程
    }

    // 6. 标记验证码为已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id)

    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      }
    })

  } catch {
    return NextResponse.json(
      { error: '注册失败，请重试' },
      { status: 500 }
    )
  }
}
