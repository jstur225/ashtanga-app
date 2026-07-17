import { describe, expect, it, vi } from 'vitest'
import { isOwnedOssObjectUrl, verifyOssObjectSize } from '@/lib/oss-integrity'

const response = (size: string | null, overrides: { ok?: boolean; status?: number } = {}) => ({
  ok: overrides.ok ?? true,
  status: overrides.status ?? 200,
  headers: new Headers(size === null ? {} : { 'content-length': size }),
})

describe('verifyOssObjectSize', () => {
  it('accepts a positive object whose size exactly matches the upload', async () => {
    const fetcher = vi.fn().mockResolvedValue(response('2048'))

    const result = await verifyOssObjectSize('https://bucket.example.com/photo.jpg', 2048, fetcher)

    expect(result).toEqual({ valid: true, actualSize: 2048 })
    expect(fetcher).toHaveBeenCalledWith(
      'https://bucket.example.com/photo.jpg',
      { method: 'HEAD', cache: 'no-store' },
    )
  })

  it('rejects a zero-byte object', async () => {
    const result = await verifyOssObjectSize(
      'https://bucket.example.com/photo.jpg',
      2048,
      vi.fn().mockResolvedValue(response('0')),
    )

    expect(result).toMatchObject({ valid: false, actualSize: 0, reason: 'SIZE_MISMATCH' })
  })

  it('rejects a non-zero object with the wrong size', async () => {
    const result = await verifyOssObjectSize(
      'https://bucket.example.com/photo.jpg',
      2048,
      vi.fn().mockResolvedValue(response('1024')),
    )

    expect(result).toMatchObject({ valid: false, actualSize: 1024, reason: 'SIZE_MISMATCH' })
  })

  it('fails closed when HEAD is denied or Content-Length is missing', async () => {
    const denied = await verifyOssObjectSize(
      'https://bucket.example.com/photo.jpg',
      2048,
      vi.fn().mockResolvedValue(response(null, { ok: false, status: 403 })),
    )
    const missingLength = await verifyOssObjectSize(
      'https://bucket.example.com/photo.jpg',
      2048,
      vi.fn().mockResolvedValue(response(null)),
    )

    expect(denied).toMatchObject({ valid: false, reason: 'HEAD_REQUEST_FAILED', status: 403 })
    expect(missingLength).toMatchObject({ valid: false, reason: 'INVALID_CONTENT_LENGTH' })
  })
})

describe('isOwnedOssObjectUrl', () => {
  const base = {
    userId: 'user-123',
    bucket: 'ashtanga-app-photos',
    endpoint: 'oss-cn-shanghai.aliyuncs.com',
  }

  it('accepts the configured bucket when URL, key, and user prefix match', () => {
    expect(isOwnedOssObjectUrl({
      ...base,
      ossKey: 'user-123/20260717/photo.jpeg',
      ossUrl: 'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-123/20260717/photo.jpeg',
    })).toBe(true)
  })

  it('rejects another user, another host, or a URL/key mismatch', () => {
    expect(isOwnedOssObjectUrl({
      ...base,
      ossKey: 'other-user/20260717/photo.jpeg',
      ossUrl: 'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/other-user/20260717/photo.jpeg',
    })).toBe(false)
    expect(isOwnedOssObjectUrl({
      ...base,
      ossKey: 'user-123/20260717/photo.jpeg',
      ossUrl: 'https://attacker.example.com/user-123/20260717/photo.jpeg',
    })).toBe(false)
    expect(isOwnedOssObjectUrl({
      ...base,
      ossKey: 'user-123/20260717/photo.jpeg',
      ossUrl: 'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-123/20260717/other.jpeg',
    })).toBe(false)
  })
})
