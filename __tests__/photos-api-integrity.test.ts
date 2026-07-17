import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClientMock = vi.hoisted(() => vi.fn())

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

function createQuery(result: { data: unknown; error: unknown }) {
  const query: any = {}
  for (const method of ['select', 'eq', 'is', 'order', 'insert', 'update']) {
    query[method] = vi.fn(() => query)
  }
  query.single = vi.fn().mockResolvedValue(result)
  query.maybeSingle = vi.fn().mockResolvedValue(result)
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return query
}

describe('POST /api/photos OSS integrity guard', () => {
  beforeEach(() => {
    vi.resetModules()
    createClientMock.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.com'
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
    process.env.OSS_BUCKET = 'ashtanga-app-photos'
    process.env.OSS_ENDPOINT = 'oss-cn-shanghai.aliyuncs.com'
  })

  it('rejects metadata when OSS persisted a zero-byte object', async () => {
    const profileQuery = createQuery({ data: { id: 'profile-1' }, error: null })
    const membershipQuery = createQuery({ data: { is_active: true }, error: null })
    const photosQuery = createQuery({ data: [], error: null })
    const recordQuery = createQuery({ data: { id: 'record-1' }, error: null })
    const tableQueries: Record<string, any[]> = {
      user_profiles: [profileQuery],
      user_membership_status: [membershipQuery],
      photos: [photosQuery],
      practice_records: [recordQuery],
    }
    const from = vi.fn((table: string) => tableQueries[table].shift())

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'user@example.com' } },
          error: null,
        }),
      },
      from,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '0' }),
    }))

    const { POST } = await import('@/app/api/photos/route')
    const response = await POST(new NextRequest('http://localhost/api/photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        practice_record_id: 'record-1',
        oss_url: 'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-123/20260717/photo.jpeg',
        oss_key: 'user-123/20260717/photo.jpeg',
        file_size: 2048,
        mime_type: 'image/jpeg',
      }),
    }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      success: false,
      error: 'OSS_OBJECT_SIZE_MISMATCH',
    })
    expect(photosQuery.insert).not.toHaveBeenCalled()
  })
})
