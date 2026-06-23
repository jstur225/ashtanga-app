import { describe, it, expect } from 'vitest'
import {
  parseRemotePhotos,
  buildCompleteProfile,
  mapRemoteRecord,
  isValidRemoteRecord,
  isValidRemoteOption,
  mapRemoteProfile,
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_SIGNATURE,
} from '@/lib/sync-mappers'
import type { UserProfile } from '@/lib/supabase'

// ==================== parseRemotePhotos ====================
describe('parseRemotePhotos', () => {
  it('字符串数组 → 原样返回（已过滤非字符串）', () => {
    expect(parseRemotePhotos(['a.jpg', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg'])
  })

  it('混合类型数组 → 只保留字符串', () => {
    expect(parseRemotePhotos(['a.jpg', 123, null, 'b.jpg', true])).toEqual(['a.jpg', 'b.jpg'])
  })

  it('JSON 字符串数组 → 解析', () => {
    expect(parseRemotePhotos('["a.jpg","b.jpg"]')).toEqual(['a.jpg', 'b.jpg'])
  })

  it('JSON 字符串对象 → 返回空数组', () => {
    expect(parseRemotePhotos('{"url":"a.jpg"}')).toEqual([])
  })

  it('JSON 字符串数字 → 返回空数组', () => {
    expect(parseRemotePhotos('12345')).toEqual([])
  })

  it('非法 JSON 字符串 → 返回空数组', () => {
    expect(parseRemotePhotos('not-json')).toEqual([])
  })

  it('空字符串 → 返回空数组', () => {
    expect(parseRemotePhotos('')).toEqual([])
  })

  it('null → 返回空数组', () => {
    expect(parseRemotePhotos(null)).toEqual([])
  })

  it('undefined → 返回空数组', () => {
    expect(parseRemotePhotos(undefined)).toEqual([])
  })

  it('数字 → 返回空数组', () => {
    expect(parseRemotePhotos(12345)).toEqual([])
  })

  it('JSON 字符串内的混合类型数组 → 只保留字符串', () => {
    expect(parseRemotePhotos('["a.jpg",123,null,"b.jpg"]')).toEqual(['a.jpg', 'b.jpg'])
  })
})

// ==================== buildCompleteProfile ====================
describe('buildCompleteProfile', () => {
  const fullProfile: UserProfile = {
    id: 'uuid-1',
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    name: '橙宝',
    signature: '练习、练习',
    avatar: 'https://example.com/avatar.jpg',
    phone: '13800000000',
    historical_days: 30,
    historical_avg_minutes: 60,
  }

  it('完整 profile → 原样保留', () => {
    expect(buildCompleteProfile(fullProfile)).toEqual(fullProfile)
  })

  it('null → 返回默认 profile（带新生成的时间戳）', () => {
    const result = buildCompleteProfile(null)
    expect(result.id).toBe('')
    expect(result.user_id).toBe('')
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
    expect(result.signature).toBe(DEFAULT_PROFILE_SIGNATURE)
    expect(result.avatar).toBeNull()
    expect(result.historical_days).toBe(0)
    expect(result.historical_avg_minutes).toBe(0)
    expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('undefined → 等同 null', () => {
    const result = buildCompleteProfile(undefined)
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
  })

  it('空对象 → 返回默认 profile', () => {
    const result = buildCompleteProfile({})
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
    expect(result.signature).toBe(DEFAULT_PROFILE_SIGNATURE)
  })

  it('缺 name → 用默认名', () => {
    const result = buildCompleteProfile({ id: 'x', signature: '自定义签名' })
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
    expect(result.signature).toBe('自定义签名')
  })

  it('缺 signature → 用默认签名', () => {
    const result = buildCompleteProfile({ id: 'x', name: '橙宝' })
    expect(result.signature).toBe(DEFAULT_PROFILE_SIGNATURE)
  })

  it('缺 updated_at → 回退到 created_at', () => {
    const result = buildCompleteProfile({
      id: 'x',
      created_at: '2026-01-01T00:00:00Z',
      name: '橙宝',
    })
    expect(result.updated_at).toBe('2026-01-01T00:00:00Z')
  })

  it('缺 created_at 和 updated_at → 用当前时间', () => {
    const result = buildCompleteProfile({ name: '橙宝' })
    expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('historical_days = 0 → 保留 0（不视为缺失）', () => {
    // 注：当前实现用 || 0，所以无法区分"缺失"和"显式 0"，但结果都是 0
    const result = buildCompleteProfile({ historical_days: 0 })
    expect(result.historical_days).toBe(0)
  })

  it('avatar 显式为 null → 保留 null', () => {
    const result = buildCompleteProfile({ avatar: null })
    expect(result.avatar).toBeNull()
  })
})

// ==================== mapRemoteRecord ====================
describe('mapRemoteRecord', () => {
  it('photos 为 JSON 字符串数组 → 解析', () => {
    const raw = {
      id: 'rec-1',
      type: 'Led',
      photos: '["a.jpg","b.jpg"]',
    }
    expect(mapRemoteRecord(raw)).toEqual({
      id: 'rec-1',
      type: 'Led',
      photos: ['a.jpg', 'b.jpg'],
    })
  })

  it('photos 为字符串数组 → 原样保留', () => {
    const raw = {
      id: 'rec-1',
      photos: ['a.jpg'],
    }
    expect(mapRemoteRecord(raw).photos).toEqual(['a.jpg'])
  })

  it('photos 为 null → 返回空数组', () => {
    const raw = { id: 'rec-1', photos: null }
    expect(mapRemoteRecord(raw).photos).toEqual([])
  })

  it('photos 为 undefined → 返回空数组', () => {
    const raw = { id: 'rec-1' }
    expect(mapRemoteRecord(raw).photos).toEqual([])
  })

  it('photos 为非法 JSON → 返回空数组', () => {
    const raw = { id: 'rec-1', photos: 'not-json' }
    expect(mapRemoteRecord(raw).photos).toEqual([])
  })

  it('保留其他字段不变', () => {
    const raw = {
      id: 'rec-1',
      type: 'Mysore',
      duration: 60,
      notes: '练习笔记',
      color_level: 3,
      photos: '[]',
    }
    const result = mapRemoteRecord(raw)
    expect(result.id).toBe('rec-1')
    expect(result.type).toBe('Mysore')
    expect(result.duration).toBe(60)
    expect(result.notes).toBe('练习笔记')
    expect(result.color_level).toBe(3)
    expect(result.photos).toEqual([])
  })

  it('null → 不崩溃，返回空对象', () => {
    const result = mapRemoteRecord(null as any)
    expect(result.photos).toEqual([])
  })

  it('undefined → 不崩溃，返回空对象', () => {
    const result = mapRemoteRecord(undefined as any)
    expect(result.photos).toEqual([])
  })
})

// ==================== isValidRemoteRecord ====================
describe('isValidRemoteRecord', () => {
  it('有 id + date → 有效', () => {
    expect(isValidRemoteRecord({ id: 'rec-1', date: '2026-01-01' })).toBe(true)
  })

  it('有 id 无 date → 无效', () => {
    expect(isValidRemoteRecord({ id: 'rec-1' })).toBe(false)
  })

  it('无 id → 无效', () => {
    expect(isValidRemoteRecord({ date: '2026-01-01' })).toBe(false)
  })

  it('null → 无效', () => {
    expect(isValidRemoteRecord(null)).toBe(false)
  })

  it('undefined → 无效', () => {
    expect(isValidRemoteRecord(undefined)).toBe(false)
  })

  it('非对象 → 无效', () => {
    expect(isValidRemoteRecord('string')).toBe(false)
  })

  it('空字符串 id → 无效', () => {
    expect(isValidRemoteRecord({ id: '', date: '2026-01-01' })).toBe(false)
  })
})

// ==================== isValidRemoteOption ====================
describe('isValidRemoteOption', () => {
  it('有 id + label → 有效', () => {
    expect(isValidRemoteOption({ id: 'opt-1', label: '一序列' })).toBe(true)
  })

  it('有 id + notes（无 label）→ 有效', () => {
    expect(isValidRemoteOption({ id: 'opt-1', notes: 'Mysore' })).toBe(true)
  })

  it('有 id + label + notes → 有效', () => {
    expect(isValidRemoteOption({ id: 'opt-1', label: '一序列', notes: 'Mysore' })).toBe(true)
  })

  it('无 id → 无效', () => {
    expect(isValidRemoteOption({ label: '一序列' })).toBe(false)
  })

  it('有 id 但无 label 和 notes → 无效', () => {
    expect(isValidRemoteOption({ id: 'opt-1' })).toBe(false)
  })

  it('label 和 notes 都是空字符串 → 无效', () => {
    expect(isValidRemoteOption({ id: 'opt-1', label: '', notes: '' })).toBe(false)
  })

  it('null → 无效', () => {
    expect(isValidRemoteOption(null)).toBe(false)
  })

  it('undefined → 无效', () => {
    expect(isValidRemoteOption(undefined)).toBe(false)
  })

  it('非对象（字符串）→ 无效', () => {
    expect(isValidRemoteOption('not-an-object')).toBe(false)
  })
})

// ==================== mapRemoteProfile ====================
describe('mapRemoteProfile', () => {
  const validProfile: Partial<UserProfile> = {
    id: 'profile-1',
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    name: '橙宝',
    signature: '练习、练习',
    avatar: 'https://example.com/avatar.jpg',
    historical_days: 30,
    historical_avg_minutes: 60,
  }

  it('有效 profile → 完整映射', () => {
    const result = mapRemoteProfile(validProfile)
    expect(result.id).toBe('profile-1')
    expect(result.name).toBe('橙宝')
    expect(result.signature).toBe('练习、练习')
    expect(result.avatar).toBe('https://example.com/avatar.jpg')
    expect(result.historical_days).toBe(30)
  })

  it('name 为纯数字（旧版脏数据）→ 回退到默认名', () => {
    const result = mapRemoteProfile({ ...validProfile, name: '12345' })
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
  })

  it('name 为空字符串 → 回退到默认名', () => {
    const result = mapRemoteProfile({ ...validProfile, name: '' })
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
  })

  it('name 缺失 → 回退到默认名', () => {
    const result = mapRemoteProfile({ id: 'x' })
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
  })

  it('null → 返回完整默认 profile', () => {
    const result = mapRemoteProfile(null)
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
    expect(result.signature).toBe(DEFAULT_PROFILE_SIGNATURE)
    expect(result.id).toBe('')
  })

  it('undefined → 返回完整默认 profile', () => {
    const result = mapRemoteProfile(undefined)
    expect(result.name).toBe(DEFAULT_PROFILE_NAME)
  })

  it('historical_days = 0 → 保留 0', () => {
    const result = mapRemoteProfile({ ...validProfile, historical_days: 0 })
    expect(result.historical_days).toBe(0)
  })

  it('avatar URL → 保留', () => {
    const result = mapRemoteProfile({ ...validProfile, avatar: 'https://cdn.example.com/a.png' })
    expect(result.avatar).toBe('https://cdn.example.com/a.png')
  })

  it('name 含数字但非纯数字 → 视为有效', () => {
    const result = mapRemoteProfile({ ...validProfile, name: '橙宝2026' })
    expect(result.name).toBe('橙宝2026')
  })
})
