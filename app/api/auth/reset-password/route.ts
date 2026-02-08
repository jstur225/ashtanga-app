import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 Service Role Key 创建客户端（可以绕过认证限制）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 重置密码 API（忘记密码功能）
 * POST /api/auth/reset-password
 * Body: { email, newPassword }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🔑 后端 API - 重置密码请求')
  console.log('   时间:', new Date().toISOString())

  try {
    const { email, newPassword } = await request.json()

    console.log('   步骤1: 验证输入...')
    console.log('   目标邮箱:', email)

    // 验证输入
    if (!email || !newPassword) {
      console.log('   ❌ 错误：缺少必要参数')
      return NextResponse.json(
        { error: '请提供邮箱和新密码' },
        { status: 400 }
      )
    }

    // 验证密码强度
    if (newPassword.length < 8) {
      console.log('   ❌ 错误：密码长度不足')
      return NextResponse.json(
        { error: '密码至少需要8位字符' },
        { status: 400 }
      )
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      console.log('   ❌ 错误：密码格式不正确')
      return NextResponse.json(
        { error: '密码必须包含字母和数字' },
        { status: 400 }
      )
    }

    console.log('   ✅ 输入验证通过')
    console.log('   步骤2: 查询用户...')

    // 步骤2: 通过邮箱查询用户 ID
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()

    if (listUsersError) {
      console.error('   ❌ 查询用户失败:', listUsersError)
      return NextResponse.json(
        { error: '查询用户失败' },
        { status: 500 }
      )
    }

    console.log(`   查询到 ${users.length} 个用户`)

    // 找到匹配的用户
    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
      console.log('   ❌ 错误：用户不存在')
      return NextResponse.json(
        { error: '该邮箱未注册' },
        { status: 404 }
      )
    }

    console.log('   ✅ 找到用户:', targetUser.id)
    console.log('   步骤3: 更新用户密码...')

    // 步骤3: 使用 Admin API 更新密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    const elapsed = Date.now() - startTime
    console.log(`   步骤4: 更新完成（耗时: ${elapsed/1000}秒）`)

    if (updateError) {
      console.error('   ❌ 更新密码失败:', updateError)
      return NextResponse.json(
        { error: '密码更新失败，请重试' },
        { status: 500 }
      )
    }

    console.log('   ✅ 密码更新成功！')

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`   ❌ 重置密码异常（${elapsed/1000}秒）:`, error)
    console.error('   错误详情:', error.message)

    return NextResponse.json(
      { error: '重置密码失败，请重试' },
      { status: 500 }
    )
  }
}
