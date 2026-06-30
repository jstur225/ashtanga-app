import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getSupabaseServiceClient } = vi.hoisted(() => ({
  getSupabaseServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseServiceClient,
}))

import { GET, POST } from '@/app/api/feature-votes/route'

const createClient = (rows: Array<{ voter_id: string; choice: 'yes' | 'no' }>) => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  })),
})

describe('feature votes API', () => {
  beforeEach(() => {
    getSupabaseServiceClient.mockReset()
  })

  it('GET 返回投票汇总', async () => {
    getSupabaseServiceClient.mockReturnValue(createClient([
      { voter_id: '6cf9a14d-fac4-4a11-a363-cc8f3317ecf8', choice: 'yes' },
      { voter_id: 'd7f67bbc-a641-45bd-9272-227cd071c768', choice: 'yes' },
      { voter_id: '42e499dd-10d1-4bc6-a4a9-5e8d2ca7711c', choice: 'no' },
    ]))

    const response = await GET(new NextRequest(
      'http://localhost/api/feature-votes?voterId=6cf9a14d-fac4-4a11-a363-cc8f3317ecf8'
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      choice: 'yes',
      counts: { total: 3, yes: 2, no: 1 },
    })
  })

  it('POST 拒绝无效的设备标识或选项', async () => {
    const request = new NextRequest('http://localhost/api/feature-votes', {
      method: 'POST',
      body: JSON.stringify({ voterId: 'invalid', choice: 'maybe' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(getSupabaseServiceClient).not.toHaveBeenCalled()
  })

  it('POST 写入投票并返回最新汇总', async () => {
    getSupabaseServiceClient.mockReturnValue(createClient([
      { voter_id: '6cf9a14d-fac4-4a11-a363-cc8f3317ecf8', choice: 'yes' },
      { voter_id: '42e499dd-10d1-4bc6-a4a9-5e8d2ca7711c', choice: 'no' },
    ]))
    const request = new NextRequest('http://localhost/api/feature-votes', {
      method: 'POST',
      body: JSON.stringify({
        voterId: '6cf9a14d-fac4-4a11-a363-cc8f3317ecf8',
        choice: 'yes',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      choice: 'yes',
      counts: { total: 2, yes: 1, no: 1 },
    })
  })
})
