import { describe, expect, it } from 'vitest'
import { normalizeAuthEmail } from '@/lib/auth-email'

describe('normalizeAuthEmail', () => {
  it('去掉首尾空格并统一为小写', () => {
    expect(normalizeAuthEmail(' Zaohezi2020@Gmail.COM ')).toBe('zaohezi2020@gmail.com')
  })

  it('非字符串输入安全返回空值', () => {
    expect(normalizeAuthEmail(undefined)).toBe('')
    expect(normalizeAuthEmail(null)).toBe('')
  })
})
