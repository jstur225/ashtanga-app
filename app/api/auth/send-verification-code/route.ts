import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// 创建 Service Role 客户端（用于查询用户列表）
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 生成6位随机验证码
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 使用 Resend 发送邮件
async function sendVerificationEmail(email: string, code: string, type: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ash.ashtangalife.online'

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY 未配置')
    throw new Error('邮件服务未配置')
  }

  // 根据类型确定邮件主题
  const subject = type === 'email_verification'
    ? '【熬汤日记】验证您的邮箱'
    : '【熬汤日记】重置密码验证码'

  // 邮件内容
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Georgia, 'Times New Roman', Times, serif !important;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 30px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2D5A27;
            margin-bottom: 10px;
            font-family: Georgia, 'Times New Roman', Times, serif !important;
          }
          .content {
            text-align: center;
            margin-bottom: 30px;
          }
          .code-box {
            background: linear-gradient(135deg, rgba(45, 90, 39, 0.1) 0%, rgba(35, 70, 30, 0.1) 100%);
            border: 2px solid #2D5A27;
            padding: 30px;
            text-align: center;
            margin: 30px auto;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(45, 90, 39, 0.2);
            backdrop-filter: blur(10px);
          }
          .code {
            font-size: 42px;
            font-weight: bold;
            color: #2D5A27;
            letter-spacing: 8px;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
          }
          .footer p {
            font-family: Georgia, 'Times New Roman', Times, serif !important;
          }
          .warning {
            color: #dc2626;
            font-size: 14px;
            margin-top: 20px;
            padding: 12px;
            background: rgba(254, 226, 226, 0.5);
            border-radius: 8px;
            text-align: center;
            font-family: Georgia, 'Times New Roman', Times, serif !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🧘 熬汤日记</div>
          </div>

          <div class="content">
            <p style="font-size: 16px; font-family: Georgia, 'Times New Roman', Times, serif !important;">
              您好，您正在${type === 'email_verification' ? '验证邮箱' : '重置密码'}，验证码如下：
            </p>
          </div>

          <div class="code-box">
            <div class="code">${code}</div>
          </div>

          <p style="text-align: center; font-family: Georgia, 'Times New Roman', Times, serif !important;">
            <strong>✓ 有效期：5分钟</strong>
          </p>

          <p class="warning">⚠️ 如果这不是您的操作，请忽略此邮件。</p>

          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>© 2026 熬汤日记开发团队</p>
          </div>
        </div>
      </body>
    </html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `熬汤日记 <${FROM_EMAIL}>`,
      to: email,
      subject: subject,
      html: html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Resend API 错误:', error)
    throw new Error('邮件发送失败')
  }

  const data = await response.json()
  console.log('邮件发送成功:', data)
  return data
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
    // 使用 UTC 时间，避免时区问题
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

    console.log('========== 发送验证码 ==========')
    console.log('邮箱:', email)
    console.log('验证码:', code)
    console.log('类型:', type)
    console.log('生成时间(ISO):', now.toISOString())
    console.log('过期时间(ISO):', expiresAt)

    // 检查邮箱是否已注册（仅在 email_verification 类型时检查）
    if (type === 'email_verification') {
      const { data: existingUser, error: userCheckError } = await supabaseServiceRole
        .auth
        .admin
        .listUsers()

      if (userCheckError) {
        console.error('查询用户列表失败:', userCheckError)
        return NextResponse.json(
          { error: '查询失败，请重试' },
          { status: 500 }
        )
      }

      const userEmailExists = existingUser.users.some(
        (user) => user.email?.toLowerCase() === email.toLowerCase()
      )

      if (userEmailExists) {
        console.log('⚠️ 邮箱已注册:', email)
        return NextResponse.json(
          { error: '该邮箱已注册，请直接登录' },
          { status: 400 }
        )
      }
    }

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

    console.log('✅ 验证码已保存到数据库')

    // 发送邮件（使用 Resend）
    try {
      await sendVerificationEmail(email, code, type)
      console.log('✅ 验证码邮件已发送到:', email)
    } catch (emailError: any) {
      console.error('发送邮件失败:', emailError)
      // 邮件发送失败，但验证码已保存，可以重试
      return NextResponse.json(
        { error: '邮件发送失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
    })
  } catch (error: any) {
    console.error('发送验证码失败:', error)
    return NextResponse.json(
      { error: '发送失败，请重试' },
      { status: 500 }
    )
  }
}
