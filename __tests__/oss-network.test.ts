/**
 * L3 集成测试：OSS 网络函数（savePhotoMetadata / getPresignedUrl / uploadToOSS）
 *
 * 覆盖测试矩阵缺口：
 *   照片上传/删除失败恢复与上限 — 网络层边界
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  savePhotoMetadata,
  getPresignedUrl,
  uploadToOSS,
} from '@/lib/oss'

// ==================== Mocks ====================

const mockFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}))

vi.mock('@/lib/photo-logger', () => ({
  addPhotoLog: vi.fn(),
}))

// ==================== Tests ====================

describe('getPresignedUrl', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns presigned URL data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          presignedUrl: 'https://oss.example.com/upload/test.jpg',
          ossKey: 'test.jpg',
          ossUrl: 'https://oss.example.com/test.jpg',
          mimeType: 'image/jpeg',
          expiresAt: 1234567890,
        },
      }),
    })

    const result = await getPresignedUrl('test.jpg', 'image/jpeg')

    expect(result.success).toBe(true)
    expect(result.data?.presignedUrl).toBe('https://oss.example.com/upload/test.jpg')
    expect(result.data?.ossKey).toBe('test.jpg')
  })

  it('returns NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'))

    const result = await getPresignedUrl('test.jpg', 'image/jpeg')

    expect(result.success).toBe(false)
    expect(result.error).toBe('NETWORK_ERROR')
  })

  it('sends fileName and mimeType in request body', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, data: { presignedUrl: 'url', ossKey: 'k', ossUrl: 'u', mimeType: 'image/jpeg', expiresAt: 0 } }),
    })

    await getPresignedUrl('photo.png', 'image/png')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.fileName).toBe('photo.png')
    expect(callBody.mimeType).toBe('image/png')
  })
})

describe('savePhotoMetadata', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  const validData = {
    practice_record_id: 'rec-1',
    oss_url: 'https://oss.example.com/photo.jpg',
    oss_key: 'photo.jpg',
    file_size: 1024,
    mime_type: 'image/jpeg',
  }

  it('returns photo on success', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { id: 'photo-1', oss_url: validData.oss_url },
      }),
    })

    const result = await savePhotoMetadata(validData)

    expect(result.success).toBe(true)
    expect(result.photo?.id).toBe('photo-1')
  })

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'RECORD_PHOTO_LIMIT_EXCEEDED' }),
    })

    const result = await savePhotoMetadata(validData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('RECORD_PHOTO_LIMIT_EXCEEDED')
  })

  it('returns NETWORK_ERROR on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'))

    const result = await savePhotoMetadata(validData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('NETWORK_ERROR')
  })
})

// Helper: create a minimal fetch Response-like object
const mockResponse = (overrides: Record<string, any> = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  text: async () => '',
  json: async () => ({ success: true }),
  ...overrides,
})

describe('uploadToOSS', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns success on 200 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    const result = await uploadToOSS(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      'https://oss.example.com/upload/test.jpg',
      'image/jpeg',
    )

    expect(result.success).toBe(true)
  })

  it('returns UPLOAD_FAILED_403 on 403 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'AccessDenied',
    }))

    const result = await uploadToOSS(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      'https://oss.example.com/upload/test.jpg',
      'image/jpeg',
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('UPLOAD_FAILED_403')
  })

  it('returns UPLOAD_FAILED_400 on 400 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'InvalidRequest',
    }))

    const result = await uploadToOSS(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      'https://oss.example.com/upload/test.jpg',
      'image/jpeg',
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('UPLOAD_FAILED_400')
  })

  it('returns NETWORK_ERROR on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'))

    const result = await uploadToOSS(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      'https://oss.example.com/upload/test.jpg',
      'image/jpeg',
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('NETWORK_ERROR')
  })
})
