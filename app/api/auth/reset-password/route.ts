import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeAuthEmail } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

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
    const { email: rawEmail, newPassword, code } = await request.json()
    const email = normalizeAuthEmail(rawEmail)

    // 验证输入
    if (!email || !newPassword || !code) {
      return json({ error: '请提供邮箱、新密码和验证码' }, 400)
    }

    // 验证密码强度
    if (newPassword.length < 8) {
      return json({ error: '密码至少需要8位字符' }, 400)
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return json({ error: '密码必须包含字母和数字' }, 400)
    }

    // 步骤2: 验证验证码（单次消费）
    const now = new Date().toISOString()
    const { data: verificationData, error: verificationError } = await supabaseAdmin
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
      return json({ error: '验证码错误或已过期' }, 400)
    }
    // Admin listUsers 默认只返回第一页。必须显式覆盖完整用户量，
    // 否则排在前 50 个之后的老账号会被误判成“未注册”。
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listUsersError) {
      return json({ error: '查询用户失败' }, 500)
    }

    // 找到匹配的用户
    const targetUser = users.find((u: any) => normalizeAuthEmail(u.email) === email)

    if (!targetUser) {
      return json({ error: '该邮箱未注册' }, 404)
    }

    // 原子占用验证码，避免同一个验证码并发修改两次密码。
    const { data: consumedCode, error: consumeError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id)
      .eq('used', false)
      .select('id')
      .maybeSingle()

    if (consumeError || !consumedCode) {
      return json({ error: '验证码错误或已过期' }, 400)
    }

    // 步骤4: 使用 Admin API 更新密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    if (updateError) {
      // 密码更新失败时释放验证码，用户无需重新收邮件即可重试。
      await supabaseAdmin
        .from('verification_codes')
        .update({ used: false })
        .eq('id', verificationData.id)
      return json({ error: '密码更新失败，请重试' }, 500)
    }

    return json({
      success: true,
      message: '密码重置成功',
    }, 200)

  } catch {
    return json({ error: '重置密码失败，请重试' }, 500)
  }
}
