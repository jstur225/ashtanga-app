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
      await POST(createPostRequest({ newPassword: 'Abc12345', code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、新密码和验证码')
  })

  it('rejects missing newPassword', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、新密码和验证码')
  })

  it('rejects missing code', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: 'Abc12345' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、新密码和验证码')
  })

  it('rejects newPassword < 8 chars', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: 'Ab1', code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/8位/)
  })

  it('rejects newPassword without letters', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: '12345678', code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/字母/)
  })

  it('rejects newPassword without digits', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status, body } = await parseResponse(
      await POST(createPostRequest({ email: 'test@test.com', newPassword: 'Abcdefgh', code: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/数字/)
  })

  it('rejects invalid/expired verification code', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const { status, body } = await parseResponse(
      await POST(createPostRequest({
        email: 'test@test.com',
        newPassword: 'Abc12345',
        code: 'wrong-code',
      }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/验证码/)
  })

  it('rejects malformed JSON body with 500', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { status } = await parseResponse(await POST(createMalformedRequest()))
    expect(status).toBe(500)
  })

  // ── VERIFIES FIX：验证码消费使重置密码幂等 ──

  it('VERIFIES FIX: 同一验证码第二次调用失败（已被消费）', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')

    // mock 验证码记录（type=reset_password）
    const resetVerificationRow = makeVerificationRow({
      type: 'reset_password',
      code: '654321',
    })

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

    const payload = {
      email: 'test@test.com',
      newPassword: 'NewPass123',
      code: '654321',
    }

    // 第一次：验证码有效 → 重置成功
    supabaseMock.single.mockResolvedValueOnce({ data: resetVerificationRow, error: null })
    const first = await parseResponse(await POST(createPostRequest(payload)))
    expect(first.status).toBe(200)
    expect(first.body.success).toBe(true)

    // 验证码被标记为已使用
    expect(supabaseMock.update).toHaveBeenCalledWith({ used: true })
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', resetVerificationRow.id)

    // 第二次：同一验证码已被消费 → 失败
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    const second = await parseResponse(await POST(createPostRequest(payload)))
    expect(second.status).toBe(400)
    expect(second.body.error).toMatch(/验证码/)
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

  // ── VERIFIES FIX：60s 限频阻止连续请求 ──

  it('VERIFIES FIX: 60s 限频：第一次成功，后续被拒绝', async () => {
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
    // mock Resend 邮件 API 成功
    const originalFetch = global.fetch
    const originalKey = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-id' }),
      text: async () => '',
    }) as any

    // mock 60s 限频查询：第一次返回 null（无最近记录），后续返回有记录
    supabaseMock.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // 第一次：无最近记录 → 通过
      .mockResolvedValueOnce({                              // 第二次：有最近记录 → 拒绝
        data: { id: 'vc-recent', created_at: new Date().toISOString() },
        error: null,
      })
      .mockResolvedValueOnce({                              // 第三次：仍有最近记录 → 拒绝
        data: { id: 'vc-recent', created_at: new Date().toISOString() },
        error: null,
      })

    try {
      // 第一次：成功
      const first = await parseResponse(
        await POST(createPostRequest({
          email: 'newuser@test.com',
          type: 'email_verification',
        }))
      )
      expect(first.status).toBe(200)

      // 第二次：被 60s 限频拒绝
      const second = await parseResponse(
        await POST(createPostRequest({
          email: 'newuser@test.com',
          type: 'email_verification',
        }))
      )
      expect(second.status).toBe(429)
      expect(second.body.error).toMatch(/频繁/)

      // 第三次：仍被拒绝
      const third = await parseResponse(
        await POST(createPostRequest({
          email: 'newuser@test.com',
          type: 'email_verification',
        }))
      )
      expect(third.status).toBe(429)

      // insert 应只被调用 1 次（仅第一次生成验证码）
      expect(supabaseMock.insert).toHaveBeenCalledTimes(1)
    } finally {
      global.fetch = originalFetch
      if (originalKey === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = originalKey
    }
  })
})

// ==================== /api/membership/activate ====================

const authHeader = { authorization: 'Bearer valid-token' }

const makeActivationCodeRow = (overrides: Record<string, any> = {}) => ({
  id: 'activation-code-1',
  code: 'ABCD-1234-EFGH',
  type: 'quarter',
  duration_days: 30,
  used: false,
  used_by: null,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

function createMalformedAuthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost/api/membership/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: 'not-json',
  })
}

function createMembershipClientMock(options: {
  authUser?: any
  authError?: any
  activationCode?: any
  activationError?: any
  currentMemberships?: Array<{ expires_at: string }>
  membershipInsertError?: any
  activationConsumeError?: any
} = {}) {
  const membershipInsertSpy = vi.fn()
  const activationUpdateSpy = vi.fn()
  const activationEqSpy = vi.fn()
  const membershipEqSpy = vi.fn()

  const authUser = options.authUser ?? { id: 'auth-user-1', email: 'member@test.com' }

  const activationChain: any = {
    mode: 'select',
    select: vi.fn(() => {
      if (activationChain.mode === 'update') {
        return Promise.resolve({
          data: [{ id: options.activationCode?.id ?? 'activation-code-1' }],
          error: options.activationConsumeError ?? null,
        })
      }
      return activationChain
    }),
    eq: vi.fn((column: string, value: unknown) => {
      activationEqSpy(column, value)
      return activationChain
    }),
    single: vi.fn().mockResolvedValue({
      data: options.activationCode ?? makeActivationCodeRow(),
      error: options.activationError ?? null,
    }),
    update: vi.fn((payload: unknown) => {
      activationUpdateSpy(payload)
      activationChain.mode = 'update'
      return activationChain
    }),
  }

  const membershipChain: any = {
    select: vi.fn(() => membershipChain),
    eq: vi.fn((column: string, value: unknown) => {
      membershipEqSpy(column, value)
      return membershipChain
    }),
    gt: vi.fn(() => membershipChain),
    order: vi.fn(() => membershipChain),
    limit: vi.fn().mockResolvedValue({
      data: options.currentMemberships ?? [],
      error: null,
    }),
    insert: vi.fn((payload: unknown) => {
      membershipInsertSpy(payload)
      return Promise.resolve({ error: options.membershipInsertError ?? null })
    }),
  }

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: options.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'activation_codes') return activationChain
      if (table === 'user_memberships') return membershipChain
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  createClientMock.mockReturnValue(client)

  return {
    client,
    membershipInsertSpy,
    activationUpdateSpy,
    activationEqSpy,
    membershipEqSpy,
  }
}

async function callMembershipActivate(request: NextRequest) {
  const { POST } = await import('@/app/api/membership/activate/route')
  const response = await POST(request)
  expect(response).toBeDefined()
  return parseResponse(response as Response)
}

describe('POST /api/membership/activate', () => {
  it('rejects missing authorization header', async () => {
    createMembershipClientMock()

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: 'ABCD-1234-EFGH' })
    )

    expect(status).toBe(401)
    expect(body).toEqual({ success: false, error: 'NOT_AUTHENTICATED' })
  })

  it('rejects malformed JSON body after authentication', async () => {
    createMembershipClientMock()

    const { status, body } = await callMembershipActivate(
      createMalformedAuthorizedRequest()
    )

    expect(status).toBe(400)
    expect(body).toEqual({ success: false, error: 'INVALID_REQUEST' })
  })

  it('rejects missing activation code', async () => {
    createMembershipClientMock()

    const { status, body } = await callMembershipActivate(
      createPostRequest({}, authHeader)
    )

    expect(status).toBe(400)
    expect(body).toEqual({ success: false, error: 'MISSING_CODE' })
  })

  it('rejects invalid activation code format', async () => {
    createMembershipClientMock()

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: 'bad-code' }, authHeader)
    )

    expect(status).toBe(400)
    expect(body).toEqual({ success: false, error: 'INVALID_CODE_FORMAT' })
  })

  it('rejects used activation code', async () => {
    createMembershipClientMock({
      activationCode: makeActivationCodeRow({ used: true }),
    })

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: 'ABCD-1234-EFGH' }, authHeader)
    )

    expect(status).toBe(400)
    expect(body).toEqual({ success: false, error: 'CODE_USED' })
  })

  it('rejects expired activation code', async () => {
    createMembershipClientMock({
      activationCode: makeActivationCodeRow({
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
    })

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: 'ABCD-1234-EFGH' }, authHeader)
    )

    expect(status).toBe(400)
    expect(body).toEqual({ success: false, error: 'CODE_EXPIRED' })
  })

  it('activates a new membership, writes membership record, and consumes the code', async () => {
    const activationCode = makeActivationCodeRow({ duration_days: 90, type: 'quarter' })
    const { membershipInsertSpy, activationUpdateSpy, activationEqSpy, membershipEqSpy } =
      createMembershipClientMock({ activationCode })

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: ' abcd-1234-efgh ' }, authHeader)
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      days: 90,
      type: 'quarter',
      is_new: true,
    })
    expect(body.data.expires_at).toEqual(expect.any(String))
    expect(body.data.expires_at_formatted).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)

    expect(ensureProfileMock).toHaveBeenCalledWith(expect.anything(), {
      id: 'auth-user-1',
      email: 'member@test.com',
    })
    expect(membershipEqSpy).toHaveBeenCalledWith('user_id', 'profile-id-1')
    expect(membershipInsertSpy).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'profile-id-1',
      email: 'member@test.com',
      type: 'quarter',
      activated_by_code_id: activationCode.id,
    }))
    expect(activationUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({
      used: true,
      used_at: expect.any(String),
    }))
    expect(activationEqSpy).toHaveBeenCalledWith('code', activationCode.code)
  })

  it('extends from the current active expiry when renewing membership', async () => {
    const currentExpiry = '2026-08-01T00:00:00.000Z'
    const activationCode = makeActivationCodeRow({ duration_days: 30, type: 'quarter' })
    const { membershipInsertSpy } = createMembershipClientMock({
      activationCode,
      currentMemberships: [{ expires_at: currentExpiry }],
    })

    const { status, body } = await callMembershipActivate(
      createPostRequest({ code: 'ABCD-1234-EFGH' }, authHeader)
    )

    const expectedExpiry = new Date(
      new Date(currentExpiry).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    expect(status).toBe(200)
    expect(body.data.is_new).toBe(false)
    expect(body.data.expires_at).toBe(expectedExpiry)
    expect(membershipInsertSpy).toHaveBeenCalledWith(expect.objectContaining({
      expires_at: expectedExpiry,
    }))
  })
})
