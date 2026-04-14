import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * 会员激活 API
 * POST /api/membership/activate
 *
 * 请求体:
 *   { code: "XXXX-XXXX-XXXX" }
 *
 * 响应:
 *   成功: { success: true, data: { expires_at: "2025-07-14T10:30:00Z", days: 90, is_new: true } }
 *   失败: { success: false, error: "INVALID_CODE" | "CODE_USED" | "CODE_EXPIRED" }
 */

// POST - 激活会员
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MISSING_CODE' },
        { status: 400 }
      )
    }

    // 格式化激活码 (大写,去除空格)
    const formattedCode = code.toUpperCase().replace(/\s/g, '')

    // 3. 验证激活码格式 (XXXX-XXXX-XXXX)
    const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    if (!codePattern.test(formattedCode)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE_FORMAT' },
        { status: 400 }
      )
    }

    // 4. 查询激活码
    const { data: activationCode, error: codeError } = await supabase
      .from('activation_codes')
      .select('id, code, type, duration_days, used, used_by, expires_at')
      .eq('code', formattedCode)
      .single()

    if (codeError || !activationCode) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE' },
        { status: 400 }
      )
    }

    // 5. 检查激活码是否已使用
    if (activationCode.used) {
      return NextResponse.json(
        { success: false, error: 'CODE_USED' },
        { status: 400 }
      )
    }

    // 6. 检查激活码是否过期
    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'CODE_EXPIRED' },
        { status: 400 }
      )
    }

    // 7. 查询用户当前会员状态
    const { data: currentMembership } = await supabase
      .from('user_membership_status')
      .select('is_active, expires_at')
      .eq('user_id', user.id)
      .single()

    const now = new Date()
    let newExpiresAt: Date
    let isNewMembership = false

    // 8. 计算新的到期时间
    if (currentMembership?.is_active && currentMembership.expires_at) {
      // 续费: 从原到期时间累加
      const currentExpiresAt = new Date(currentMembership.expires_at)
      newExpiresAt = new Date(currentExpiresAt.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
    } else {
      // 新开通: 从当前时间开始
      newExpiresAt = new Date(now.getTime() + activationCode.duration_days * 24 * 60 * 60 * 1000)
      isNewMembership = true
    }

    // 9. 创建会员记录
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: user.id,
        type: activationCode.type,
        started_at: now.toISOString(),
        expires_at: newExpiresAt.toISOString(),
        activated_by_code_id: activationCode.id,
      })

    if (membershipError) {
      console.error('[Membership API] 创建会员记录失败:', membershipError)
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // 10. 标记激活码为已使用
    const { error: updateError } = await supabase
      .from('activation_codes')
      .update({
        used: true,
        used_by: user.id,
        used_at: now.toISOString(),
      })
      .eq('id', activationCode.id)

    if (updateError) {
      console.error('[Membership API] 更新激活码状态失败:', updateError)
      // 不影响激活成功,记录错误即可
    }

    // 11. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        expires_at: newExpiresAt.toISOString(),
        expires_at_formatted: newExpiresAt.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '.'),
        days: activationCode.duration_days,
        type: activationCode.type,
        is_new: isNewMembership,
      },
    })
  } catch (error) {
    console.error('[Membership API] 服务器错误:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
