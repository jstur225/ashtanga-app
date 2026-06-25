/**
 * L3 集成测试：API 路由输入验证与错误处理
 *
 * 覆盖测试矩阵缺口：
 *   API 输入、未授权、异常、幂等
 *
 * 直接调用 Next.js 路由处理器（POST 函数），模拟 NextRequest。
 * 所有外部依赖（supabase）均被 mock，只验证路由层的输入验证行为。
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as registerPOST } from '@/app/api/auth/register/route'

// ==================== Helpers ====================

function createPostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function parseResponse(response: Response): Promise<{ status: number; body: any }> {
  const body = await response.json()
  return { status: response.status, body }
}

// ==================== Mock Supabase ====================

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    },
  },
  getSupabaseServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }),
}))

// ==================== Register API ====================

describe('POST /api/auth/register', () => {
  // ── 参数缺失 ──

  it('rejects missing email', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ password: 'Abc12345', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects missing password', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ email: 'test@test.com', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects missing verificationCode', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ email: 'test@test.com', password: 'Abc12345' }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('请提供邮箱、密码和验证码')
  })

  it('rejects malformed JSON body with 500', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const { status } = await parseResponse(await registerPOST(request))
    expect(status).toBe(500)
  })

  // ── 密码强度 ──

  it('rejects password < 8 chars', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ email: 'test@test.com', password: 'Ab1', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/8位/)
  })

  it('rejects password without letters', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ email: 'test@test.com', password: '12345678', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/字母/)
  })

  it('rejects password without digits', async () => {
    const { status, body } = await parseResponse(
      await registerPOST(createPostRequest({ email: 'test@test.com', password: 'Abcdefgh', verificationCode: '123456' }))
    )
    expect(status).toBe(400)
    expect(body.error).toMatch(/数字/)
  })
})
