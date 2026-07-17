import { describe, it, expect } from 'vitest'
import {
  validatePhotoFile,
  MAX_FILE_SIZE,
  FREE_MAX_FILE_SIZE,
  PRO_MAX_FILE_SIZE,
  ERROR_MESSAGES,
} from '@/lib/oss'

// ==================== validatePhotoFile ====================
describe('validatePhotoFile', () => {
  const makeFile = (name: string, type: string, size: number): File =>
    new File([new ArrayBuffer(size)], name, { type })

  it('valid JPEG passes', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024 * 512) // 512KB
    expect(validatePhotoFile(file).valid).toBe(true)
  })

  it('valid PNG passes', () => {
    const file = makeFile('photo.png', 'image/png', 1024 * 512)
    expect(validatePhotoFile(file).valid).toBe(true)
  })

  it('valid WebP passes', () => {
    const file = makeFile('photo.webp', 'image/webp', 1024 * 512)
    expect(validatePhotoFile(file).valid).toBe(true)
  })

  it('valid GIF passes', () => {
    const file = makeFile('photo.gif', 'image/gif', 1024 * 512)
    expect(validatePhotoFile(file).valid).toBe(true)
  })

  it('non-image file (PDF) is rejected', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024 * 512)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/只能上传图片/)
  })

  it('text file is rejected', () => {
    const file = makeFile('notes.txt', 'text/plain', 100)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/只能上传图片/)
  })

  it('empty type file is rejected', () => {
    const file = makeFile('noext', '', 100)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/只能上传图片/)
  })

  it('file exactly at MAX_FILE_SIZE passes', () => {
    const file = makeFile('exact.jpg', 'image/jpeg', MAX_FILE_SIZE)
    expect(validatePhotoFile(file).valid).toBe(true)
  })

  it('default MAX_FILE_SIZE is the free 5MB limit', () => {
    expect(MAX_FILE_SIZE).toBe(FREE_MAX_FILE_SIZE)
    expect(FREE_MAX_FILE_SIZE).toBe(5 * 1024 * 1024)
    expect(PRO_MAX_FILE_SIZE).toBe(30 * 1024 * 1024)
  })

  it('file one byte over MAX_FILE_SIZE is rejected', () => {
    const file = makeFile('oversize.jpg', 'image/jpeg', MAX_FILE_SIZE + 1)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('免费版单张照片上限为 5MB')
  })

  it('free user: 5MB passes but one byte over 5MB is rejected with friendly message', () => {
    expect(validatePhotoFile(makeFile('free-ok.jpg', 'image/jpeg', FREE_MAX_FILE_SIZE)).valid).toBe(true)

    const result = validatePhotoFile(makeFile('free-over.jpg', 'image/jpeg', FREE_MAX_FILE_SIZE + 1))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('照片超过 5MB')
    expect(result.error).toContain('免费版')
  })

  it('pro user: 5MB+ image passes up to 30MB', () => {
    const file = makeFile('pro-ok.jpg', 'image/jpeg', FREE_MAX_FILE_SIZE + 1)
    expect(validatePhotoFile(file, { isPro: true }).valid).toBe(true)
  })

  it('pro user: image over 30MB is rejected with friendly message', () => {
    const file = makeFile('pro-over.jpg', 'image/jpeg', PRO_MAX_FILE_SIZE + 1)
    const result = validatePhotoFile(file, { isPro: true })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('照片超过 30MB')
  })

  it('file way over limit is rejected', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', MAX_FILE_SIZE * 2)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('照片超过 5MB')
  })

  it('0-byte image file is rejected before upload', () => {
    const file = makeFile('empty.jpg', 'image/jpeg', 0)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('照片文件为空')
  })
})

// ==================== ERROR_MESSAGES ====================
describe('ERROR_MESSAGES', () => {
  it('all expected error codes have a message', () => {
    const expectedCodes = [
      'RECORD_PHOTO_LIMIT_EXCEEDED',
      'NOT_AUTHENTICATED',
      'EMAIL_REQUIRED',
      'UPLOAD_FAILED_403',
      'UPLOAD_FAILED_400',
      'UPLOAD_SOURCE_READ_FAILED',
      'UPLOAD_INTEGRITY_FAILED',
      'OSS_OBJECT_SIZE_MISMATCH',
      'NETWORK_ERROR',
      'UNKNOWN_ERROR',
    ]
    for (const code of expectedCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    }
  })
})
