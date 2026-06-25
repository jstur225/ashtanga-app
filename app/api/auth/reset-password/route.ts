import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * 重置密码 API（忘记密码功能）
 * POST /api/auth/reset-password
 * Body: { email, newPassword, code }
 */
export async function POST(request: NextRequest) {
  // 使用 Service Role Key 创建客户端（可以绕过认证限制）
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { email, newPassword, code } = await request.json()

    // 验证输入
    if (!email || !newPassword || !code) {
      return NextResponse.json(
        { error: '请提供邮箱、新密码和验证码' },
        { status: 400 }
      )
    }

    // 验证密码强度
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '密码至少需要8位字符' },
        { status: 400 }
      )
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json(
        { error: '密码必须包含字母和数字' },
        { status: 400 }
      )
    }

    // 步骤2: 验证验证码（单次消费）
    const now = new Date().toISOString()
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'reset_password')
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
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()

    if (listUsersError) {
      return NextResponse.json(
        { error: '查询用户失败' },
        { status: 500 }
      )
    }

    // 找到匹配的用户
    const targetUser = users.find((u: any) => u.email === email)

    if (!targetUser) {
      return NextResponse.json(
        { error: '该邮箱未注册' },
        { status: 404 }
      )
    }

    // 步骤4: 使用 Admin API 更新密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json(
        { error: '密码更新失败，请重试' },
        { status: 500 }
      )
    }

    // 步骤5: 标记验证码为已使用（单次消费）
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id)

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    })

  } catch {
    return NextResponse.json(
      { error: '重置密码失败，请重试' },
      { status: 500 }
    )
  }
}
