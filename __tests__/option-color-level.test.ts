import { describe, it, expect } from 'vitest'
import {
  getEffectiveOptionColor,
  getColorClass,
} from '@/lib/sync-utils'

const baseOptions = [
  { label: '一序列 Mysore', color_level: 1 },
  { label: '二序列', color_level: 2 },
  { label: '口令课', color_level: 4 },
  { label: 'Led', color_level: 3 },
  { label: '无级别', color_level: undefined },
]

// ==================== getEffectiveOptionColor ====================
describe('getEffectiveOptionColor', () => {
  // ── Pro 用户保留所有色阶 ──
  it('Pro: level 1 → 1', () => {
    expect(getEffectiveOptionColor(baseOptions, '一序列 Mysore', true)).toBe(1)
  })

  it('Pro: level 2 → 2', () => {
    expect(getEffectiveOptionColor(baseOptions, '二序列', true)).toBe(2)
  })

  it('Pro: level 3 → 3', () => {
    expect(getEffectiveOptionColor(baseOptions, 'Led', true)).toBe(3)
  })

  it('Pro: level 4 → 4', () => {
    expect(getEffectiveOptionColor(baseOptions, '口令课', true)).toBe(4)
  })

  // ── 免费用户降级 ──
  it('Free: level 1 → 3', () => {
    expect(getEffectiveOptionColor(baseOptions, '一序列 Mysore', false)).toBe(3)
  })

  it('Free: level 4 → 3', () => {
    expect(getEffectiveOptionColor(baseOptions, '口令课', false)).toBe(3)
  })

  it('Free: level 2 → 2（保留）', () => {
    expect(getEffectiveOptionColor(baseOptions, '二序列', false)).toBe(2)
  })

  it('Free: level 3 → 3（保留）', () => {
    expect(getEffectiveOptionColor(baseOptions, 'Led', false)).toBe(3)
  })

  // ── 边界 ──
  it('未知 label → 默认 3', () => {
    expect(getEffectiveOptionColor(baseOptions, '不存在', true)).toBe(3)
  })

  it('label 有 color_level undefined → 默认 3', () => {
    expect(getEffectiveOptionColor(baseOptions, '无级别', false)).toBe(3)
  })

  it('空 options → 默认 3', () => {
    expect(getEffectiveOptionColor([], '任何', true)).toBe(3)
  })
})

// ==================== getColorClass ====================
describe('getColorClass', () => {
  it('level 1 → green-gradient-1', () => {
    expect(getColorClass(1)).toBe('green-gradient-1')
  })

  it('level 2 → green-gradient-2', () => {
    expect(getColorClass(2)).toBe('green-gradient-2')
  })

  it('level 3 → green-gradient-3', () => {
    expect(getColorClass(3)).toBe('green-gradient-3')
  })

  it('level 4 → green-gradient-4', () => {
    expect(getColorClass(4)).toBe('green-gradient-4')
  })

  it('undefined/0 → green-gradient-3（默认）', () => {
    expect(getColorClass(0)).toBe('green-gradient-3')
    expect(getColorClass(5)).toBe('green-gradient-3')
    expect(getColorClass(-1)).toBe('green-gradient-3')
  })
})
