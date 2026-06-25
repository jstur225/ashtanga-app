/**
 * L3 集成测试：API 路由输入验证、错误处理、幂等性
 *
 * 覆盖测试矩阵缺口：
 *   API 输入、未授权、异常、幂等
 *
 * 直接调用 Next.js 路由处理器（POST 函数），模拟 NextRequest。
 * 所有外部依赖（supabase / createClient / membership-utils / fetch）均被 mock。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ==================== Mocks（hoisted） ====================
// 用 vi.hoisted 让 mock 在所有测试开始前生效，并暴露引用以便每个测试重置返回值。

const {
  supabaseMock,
  serviceClientMock,
  createClientMock,
  ensureProfileMock,
} = vi.hoisted(() => {
  const chain = () => {
    const obj: any = {
      from: vi.fn(() => obj),
      select: vi.fn(() => obj),
      eq: vi.fn(() => obj),
      gte: vi.fn(() => obj),
      order: vi.fn(() => obj),
      limit: vi.fn(() => obj),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => obj),
      insert: vi.fn(() => obj),
      delete: vi.fn(() => obj),
    }
    return obj
  }

  const supabaseMock = {
    ...chain(),
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    },
  }

  const serviceClientMock = chain()

  const createClientMock = vi.fn(() => ({
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    ...chain(),
  }))

  const ensureProfileMock = vi.fn().mockResolvedValue('profile-id-1')

  return { supabaseMock, serviceClientMock, createClientMock, ensureProfileMock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  getSupabaseServiceClient: () => serviceClientMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/membership-utils', () => ({
  ensureProfileAndGetId: ensureProfileMock,
}))

// ==================== Helpers ====================

function createPostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function createMalformedRequest(): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  })
}

async function parseResponse(response: Response): Promise<{ status: number; body: any }> {
  const body = await response.json()
  return { status: response.status, body }
}

// 模拟一条有效的验证码记录（数据库返回形态）
const makeVerificationRow = (overrides: Record<string, any> = {}) => ({
  id: 'vc-1',
  email: 'test@test.com',
  code: '123456',
  type: 'email_verification',
  used: false,
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
})

// ==================== beforeEach：每个测试前重置 mock ====================

beforeEach(() => {
  vi.clearAllMocks()
  // 重置链式 mock 的默认返回值
  supabaseMock.single.mockResolvedValue({ data: null, error: null })
  supabaseMock.maybeSingle.mockResolvedValue({ data: null, error: null })
  supabaseMock.auth.signUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' }, session: null }, error: null })
  serviceClientMock.maybeSingle.mockResolvedValue({ data: null, error: null })

  createClientMock.mockReturnValue({
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn(() => supabaseMock),
  })
})

// ==================== /api/auth/register ====================

describe('POST /api/auth/register', () => {
  // ── 参数缺失 ──

  it('rejects missing email', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ password: 'Abc12345', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects missing password', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects missing verificationCode', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', password: 'Abc12345' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects malformed JSON body with 500', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status } = await parseResponse(await POST(createMalformedRequest()))
    expect(status).toBe(500)
  })

  // ── 密码强度 ──

  it('rejects password < 8 chars', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', password: 'Ab1', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/8位/)
  })

  it('rejects password without letters', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', password: '12345678', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/字母/)
  })

  it('rejects password without digits', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', password: 'Abcdefgh', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/数字/)
  })

  // ── 幂等：同一 (email, code) 第二次调用应失败 ──

  it('idempotent: second call with same code fails (code marked as used)', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const verificationRow = makeVerificationRow()

    // 第一次：验证码查询返回数据
    supabaseMock.single.mockResolvedValueOnce({ data: verificationRow, error: null })
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@test.com' }, session: null },
      error: null,
    })

    const first = await parseResponse(
      await POST(createPostRequest({
        email: 'test@test.com',
        password: 'Abc12345',
        verificationCode: '123456',
      }))
    )
    expect(first.status).toBe(200)
    expect(first.body.success).toBe(true)

    // 第二次：验证码查询返回 null（已被第一次标记 used=true）
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const second = await parseResponse(
      await POST(createPostRequest({
        email: 'test@test.com',
        password: 'Abc12345',
        verificationCode: '123456',
      }))
    )
    expect(second.status).toBe(400)
    expect(second.body.error).toMatch(/验证码/)
  })

  it('idempotent: 重复赠送会员被 .maybeSingle() 检查阻止', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const verificationRow = makeVerificationRow()

    // 第一次：maybeSingle 返回 null（无现有会员）→ 赠送
    supabaseMock.single.mockResolvedValueOnce({ data: verificationRow, error: null })
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@test.com' }, session: null },
      error: null,
    })
    serviceClientMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const first = await parseResponse(
      await POST(createPostRequest({
        email: 'test@test.com',
        password: 'Abc12345',
        verificationCode: '123456',
      }))
    )
    expect(first.status).toBe(200)
    expect(serviceClientMock.insert).toHaveBeenCalledTimes(1)

    // 第二次：maybeSingle 返回已有会员 → 跳过赠送
    vi.clearAllMocks()
    supabaseMock.single.mockResolvedValueOnce({ data: verificationRow, error: null })
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@test.com' }, session: null },
      error: null,
    })
    serviceClientMock.maybeSingle.mockResolvedValueOnce({
      data: { id: 'membership-1' },
      error: null,
    })

    const second = await parseResponse(
      await POST(createPostRequest({
        email: 'test@test.com',
        password: 'Abc12345',
        verificationCode: '123456',
      }))
    )
    expect(second.status).toBe(200)
    expect(serviceClientMock.insert).not.toHaveBeenCalled()
  })
})

// ==================== /api/auth/verify-code ====================

describe('POST /api/auth/verify-code', () => {
  it('rejects missing email', async () => {
    const { POST } = await import('@/app/api/auth/verify-code/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱和验证码')
  })

  it('rejects missing code', async () => {
    const { POST } = await import('@/app/api/auth/verify-code/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱和验证码')
  })

  it('rejects malformed JSON body with 500', async () => {
    const { POST } = await import('@/app/api/auth/verify-code/route')
    const { status } = await parseResponse(await POST(createMalformedRequest()))
    expect(status).toBe(500)
  })

  it('idempotent: 第一次验证成功，第二次同验证码失败', async () => {
    const { POST } = await import('@/app/api/auth/verify-code/route')
    const verificationRow = makeVerificationRow()

    // 第一次：验证码有效
    supabaseMock.single.mockResolvedValueOnce({ data: verificationRow, error: null })
    const first = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', code: '123456' }))
    )
    expect(first.status).toBe(200)
    expect(first.body.success).toBe(true)

    // 第二次：验证码已被标记 used=true，查询不到
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    const second = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', code: '123456' }))
    )
    expect(second.status).toBe(400)
    expect(second.body.error).toMatch(/验证码/)
  })

  it('idempotent: 标记 used=true 被调用（update 链）', async () => {
    const { POST } = await import('@/app/api/auth/verify-code/route')
    const verificationRow = makeVerificationRow()

    supabaseMock.single.mockResolvedValueOnce({ data: verificationRow, error: null })
    await POST(createPostRequest({ email: 'test@test.com', code: '123456' }))

    // update().eq() 链应该被调用过
    expect(supabaseMock.update).toHaveBeenCalledWith({ used: true })
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', verificationRow.id)
  })
})

// ==================== /api/auth/reset-password ====================

describe('POST /api/auth/reset-password', () => {
  it('rejects missing email', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ newPassword: 'Abc12345' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱和新密码')
  })

  it('rejects missing newPassword', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱和新密码')
  })

  it('rejects newPassword < 8 chars', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: 'Ab1' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/8位/)
  })

  it('rejects newPassword without letters', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: '12345678' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/字母/)
  })

  it('rejects newPassword without digits', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: 'Abcdefgh' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/数字/)
  })

  it('rejects malformed JSON body with 500', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status } = await parseResponse(await POST(createMalformedRequest()))
    expect(status).toBe(500)
  })

  // ── 暴露缺陷：无幂等机制 ──

  it('EXPOSES GAP: 两次相同请求都成功（无验证码消费机制）', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')

    // mock listUsers 返回匹配用户，updateUserById 成功
    createClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'test@test.com' }] },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn(() => supabaseMock),
    })

    const payload = { email: 'test@test.com', newPassword: 'NewPass123' }

    const first = await parseResponse(await POST(createPostRequest(payload)))
    const second = await parseResponse(await POST(createPostRequest(payload)))

    // ⚠️ 缺陷暴露：两次都成功（应该至少有一次因幂等性失败）
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    // 这两条断言"双重成功"恰恰证明了缺失幂等机制
    // 已记录到 TODO.md，需在后续版本添加验证码消费逻辑
  })
})

// ==================== /api/auth/send-verification-code ====================

describe('POST /api/auth/send-verification-code', () => {
  it('rejects missing email', async () => {
    const { POST } = await import('@/app/api/auth/send-verification-code/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({}))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱地址')
  })

  it('rejects invalid email format', async () => {
    const { POST } = await import('@/app/api/auth/send-verification-code/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'not-an-email' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('邮箱格式不正确')
  })

  it('rejects malformed JSON body with 500', async () => {
    const { POST } = await import('@/app/api/auth/send-verification-code/route')
    const { status } = await parseResponse(await POST(createMalformedRequest()))
    expect(status).toBe(500)
  })

  // ── 暴露缺陷：无防刷限频 ──

  it('EXPOSES GAP: 连续 5 次调用都生成新验证码（无 60s 限频）', async () => {
    const { POST } = await import('@/app/api/auth/send-verification-code/route')

    // mock 数据库 insert 成功
    supabaseMock.insert.mockResolvedValue({ error: null })
    // mock service role listUsers 返回空（邮箱未注册）
    createClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
        },
      },
      from: vi.fn(() => supabaseMock),
    })
    // mock Resend 邮件 API 成功（route 内部用 fetch 调用）
    const originalFetch = global.fetch
    const originalKey = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-id' }),
      text: async () => '',
    }) as any

    try {
      const results: number[] = []
      for (let i = 0; i < 5; i++) {
        const r = await parseResponse(
          await POST(createPostRequest({
            email: 'newuser@test.com',
            type: 'email_verification',
          }))
        )
        results.push(r.status)
      }

      // ⚠️ 缺陷暴露：5 次都成功（应该有 60s 限频阻止）
      expect(results).toEqual([200, 200, 200, 200, 200])
      // insert 应被调用 5 次（每次都生成新验证码）
      expect(supabaseMock.insert).toHaveBeenCalledTimes(5)
      // 已记录到 TODO.md
    } finally {
      global.fetch = originalFetch
      if (originalKey === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = originalKey
    }
  })
})
