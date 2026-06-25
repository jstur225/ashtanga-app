import { describe, it, expect } from 'vitest'
import {
  validatePhotoFile,
  MAX_FILE_SIZE,
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

  it('file one byte over MAX_FILE_SIZE is rejected', () => {
    const file = makeFile('oversize.jpg', 'image/jpeg', MAX_FILE_SIZE + 1)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/不可大于/)
  })

  it('file way over limit is rejected', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', MAX_FILE_SIZE * 2)
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/不可大于/)
  })

  it('0-byte image file passes (no size check issue)', () => {
    const file = makeFile('empty.jpg', 'image/jpeg', 0)
    expect(validatePhotoFile(file).valid).toBe(true)
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
      'NETWORK_ERROR',
      'UNKNOWN_ERROR',
    ]
    for (const code of expectedCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    }
  })
})
