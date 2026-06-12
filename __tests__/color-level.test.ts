import { describe, it, expect } from 'vitest'
import { getEffectiveOptionColor } from '@/lib/sync-utils'

const mockOptions = [
  { label: '一序列', color_level: 1 },
  { label: '半序列', color_level: 2 },
  { label: '自定义', color_level: 3 },
  { label: '高级', color_level: 4 },
]

describe('getEffectiveOptionColor', () => {
  // ============ Pro 用户 ============
  it('Pro 用户 → level 1 → 1（不变）', () => {
    expect(getEffectiveOptionColor(mockOptions, '一序列', true)).toBe(1)
  })

  it('Pro 用户 → level 4 → 4（不变）', () => {
    expect(getEffectiveOptionColor(mockOptions, '高级', true)).toBe(4)
  })

  it('Pro 用户 → level 2 → 2（不变）', () => {
    expect(getEffectiveOptionColor(mockOptions, '半序列', true)).toBe(2)
  })

  // ============ 免费用户 ============
  it('免费用户 → level 1 → 3（自动降级）', () => {
    expect(getEffectiveOptionColor(mockOptions, '一序列', false)).toBe(3)
  })

  it('免费用户 → level 4 → 3（自动降级）', () => {
    expect(getEffectiveOptionColor(mockOptions, '高级', false)).toBe(3)
  })

  it('免费用户 → level 2 → 2（不变）', () => {
    expect(getEffectiveOptionColor(mockOptions, '半序列', false)).toBe(2)
  })

  it('免费用户 → level 3 → 3（不变）', () => {
    expect(getEffectiveOptionColor(mockOptions, '自定义', false)).toBe(3)
  })

  // ============ 边界情况 ============
  it('找不到匹配 → 返回 3', () => {
    expect(getEffectiveOptionColor(mockOptions, '不存在的', false)).toBe(3)
  })

  it('color_level 为 undefined → 返回 3', () => {
    expect(getEffectiveOptionColor([{ label: '测试' }], '测试', false)).toBe(3)
  })

  it('空选项数组 → 返回 3', () => {
    expect(getEffectiveOptionColor([], '任意', false)).toBe(3)
  })
})
