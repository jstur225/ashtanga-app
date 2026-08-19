import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { normalizeAuthEmail } from '@/lib/auth-email'

// Service Role 客户端延迟初始化
// 当前项目尚未为 verification_codes 生成 Database 类型，服务端管理客户端
// 在 Supabase 2.90+ 会把该表的 insert 推断成 never；这里把边界收敛在本文件。
let supabaseServiceRole: any = null

function getServiceRoleClient() {
  if (!supabaseServiceRole) {
    supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseServiceRole
}

// 生成6位随机验证码
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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
  const actionLabel = type === 'email_verification'
    ? '验证邮箱'
    : type === 'login'
      ? '登录熬汤日记'
      : '重置密码'
  const subject = type === 'email_verification'
    ? '【熬汤日记】验证您的邮箱'
    : type === 'login'
      ? '【熬汤日记】登录验证码'
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
              您好，您正在${actionLabel}，验证码如下：
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
      text: `熬汤日记\n\n您正在${actionLabel}。\n验证码：${code}\n有效期：5分钟。\n\n如果这不是您的操作，请忽略此邮件。`,
    }),
  })

  const responseText = await response.text()
  let responseBody: { id?: string } = {}
  try {
    responseBody = responseText ? JSON.parse(responseText) : {}
  } catch {
    responseBody = {}
  }

  if (!response.ok) {
    console.error('[VerificationEmail] Resend rejected request', {
      status: response.status,
      recipientDomain: email.split('@')[1] || 'unknown',
      response: responseText.slice(0, 500),
    })
    throw new Error(`邮件服务拒绝发送（Resend ${response.status}）`)
  }

  console.info('[VerificationEmail] Resend accepted request', {
    deliveryId: responseBody.id || null,
    recipientDomain: email.split('@')[1] || 'unknown',
  })
  return responseBody
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, type = 'reset_password' } = await request.json()
    const email = normalizeAuthEmail(rawEmail)
    const supportedTypes = ['email_verification', 'reset_password', 'login']

    if (!email) {
      return NextResponse.json(
        { error: '请提供邮箱地址' },
        { status: 400 }
      )
    }

    if (!supportedTypes.includes(type)) {
      return NextResponse.json(
        { error: '不支持的验证码类型' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }

    // ⭐ 60s 限频：查询该邮箱最近一条验证码，未过 60s 则拒绝
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()
    // 验证码是服务端认证数据，统一使用 Service Role 访问。
    // 不能依赖匿名客户端的 RLS 策略，否则线上策略变化时会在发信前直接 500。
    const database = getServiceRoleClient()
    const { data: recentCode, error: recentError } = await database
      .from('verification_codes')
      .select('id, created_at')
      .eq('email', email)
      .gte('created_at', sixtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentError) {
      // 限频查询失败不阻塞请求（fail-open 策略，避免误伤用户）
    } else if (recentCode) {
      return NextResponse.json(
        { error: '请求过于频繁，请 60 秒后再试' },
        { status: 429 }
      )
    }

    // 生成6位验证码
    const code = generateVerificationCode()
    const verificationId = randomUUID()
    // 使用 UTC 时间，避免时区问题
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

    // 注册时要求邮箱未占用；验证码登录时要求账号已经存在。
    if (type === 'email_verification' || type === 'login') {
      const { data: existingUser, error: userCheckError } = await database
        .auth
        .admin
        .listUsers({ page: 1, perPage: 1000 })

      if (userCheckError) {
        return NextResponse.json(
          { error: '查询失败，请重试' },
          { status: 500 }
        )
      }

      const userEmailExists = existingUser.users.some(
        (user: any) => user.email?.toLowerCase() === email.toLowerCase()
      )

      if (type === 'email_verification' && userEmailExists) {
        return NextResponse.json(
          { error: '该邮箱已注册，请直接登录' },
          { status: 400 }
        )
      }

      if (type === 'login' && !userEmailExists) {
        return NextResponse.json(
          { error: '该邮箱尚未注册，请先绑定邮箱账号' },
          { status: 404 }
        )
      }
    }

    // 保存到数据库
    const { error: dbError } = await database
      .from('verification_codes')
      .insert({
        id: verificationId,
        email,
        code,
        type,
        expires_at: expiresAt,
      })

    if (dbError) {
      return NextResponse.json(
        { error: '发送失败，请重试' },
        { status: 500 }
      )
    }

    // 发送邮件（使用 Resend）
    try {
      const delivery = await sendVerificationEmail(email, code, type)
      return NextResponse.json({
        success: true,
        message: '验证码邮件已提交，请检查收件箱和垃圾邮件',
        delivery_id: delivery.id || null,
      })
    } catch (error) {
      // 发送失败时删除本次验证码，避免失败请求触发 60 秒限频。
      try {
        await database
          .from('verification_codes')
          .delete()
          .eq('id', verificationId)
      } catch (cleanupError) {
        console.error('[VerificationEmail] Failed to remove unsent code', cleanupError)
      }

      const message = error instanceof Error ? error.message : '邮件发送失败，请重试'
      return NextResponse.json(
        { error: message },
        { status: 502 }
      )
    }

  } catch (error) {
    console.error('[VerificationEmail] Unexpected send-code failure', {
      message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: '发送失败，请重试' },
      { status: 500 }
    )
  }
}
