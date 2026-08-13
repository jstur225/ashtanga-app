import { describe, expect, it } from 'vitest'
import { BLOCKED_WORDS, checkText, findBlockedWord } from '@/lib/content-filter'

describe('lib/content-filter（网页版复用小程序词库）', () => {
  it('命中色情/赌博词', () => {
    expect(checkText('今天状态不好，不想再赌博了')).toEqual({ ok: false, word: '赌博' })
  })

  it('大小写不敏感的英文命中', () => {
    expect(findBlockedWord('free PORN videos')).toBe('porn')
  })

  it('正常练习日记不误伤', () => {
    expect(checkText('今日练习完成，呼吸平稳，感受前屈的深入。').ok).toBe(true)
    expect(checkText('').ok).toBe(true)
    expect(checkText(undefined).ok).toBe(true)
  })

  it('词库与小程序共用（非空且去重）', () => {
    expect(BLOCKED_WORDS.length).toBeGreaterThan(30)
    expect(new Set(BLOCKED_WORDS).size).toBe(BLOCKED_WORDS.length)
  })
})
