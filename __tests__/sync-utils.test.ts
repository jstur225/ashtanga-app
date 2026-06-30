import { describe, it, expect } from 'vitest'
import {
  diffRecords,
  buildProfileFromRemote,
  mergeRecords,
  mergeOptions,
  sortAndLimitRecords,
  applySafeMerge,
  detectOptionChanges,
  detectProfileChanges,
  createSyncLogEntry,
  trimSyncLogs,
  dedupeRecordsById,
} from '@/lib/sync-utils'
import type { PracticeRecord } from '@/lib/supabase'
import type { CloudRecordForMerge } from '@/lib/sync-utils'

const makeRecord = (overrides: Partial<PracticeRecord> & { id: string }): PracticeRecord => ({
  user_id: 'user-1',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  date: '2026-06-01',
  type: 'Led',
  duration: 60,
  notes: '',
  photos: [],
  ...overrides,
})

// ==================== diffRecords ====================
describe('diffRecords', () => {
  it('两边完全相同 → 全部空数组', () => {
    const r = makeRecord({ id: 'a' })
    const result = diffRecords([r], [r])
    expect(result).toEqual({
      localOnly: [],
      remoteOnly: [],
      localNewer: [],
      remoteNewer: [],
    })
  })

  it('local 多出记录 → localOnly', () => {
    const localOnly = makeRecord({ id: 'a' })
    const result = diffRecords([localOnly], [])
    expect(result.localOnly).toEqual([localOnly])
    expect(result.remoteOnly).toHaveLength(0)
    expect(result.localNewer).toHaveLength(0)
    expect(result.remoteNewer).toHaveLength(0)
  })

  it('remote 多出记录 → remoteOnly', () => {
    const remoteOnly = makeRecord({ id: 'a' })
    const result = diffRecords([], [remoteOnly])
    expect(result.remoteOnly).toEqual([remoteOnly])
    expect(result.localOnly).toHaveLength(0)
  })

  it('local 时间戳更新 → localNewer', () => {
    const local = makeRecord({ id: 'a', updated_at: '2026-06-02T00:00:00Z' })
    const remote = makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })
    const result = diffRecords([local], [remote])
    expect(result.localNewer).toEqual([local])
    expect(result.remoteNewer).toHaveLength(0)
  })

  it('remote 时间戳更新 → remoteNewer', () => {
    const local = makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })
    const remote = makeRecord({ id: 'a', updated_at: '2026-06-02T00:00:00Z' })
    const result = diffRecords([local], [remote])
    expect(result.remoteNewer).toEqual([remote])
    expect(result.localNewer).toHaveLength(0)
  })

  it('时间戳相同 → 都不出现', () => {
    const local = makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })
    const remote = makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })
    const result = diffRecords([local], [remote])
    expect(result.localNewer).toHaveLength(0)
    expect(result.remoteNewer).toHaveLength(0)
  })

  it('混合场景', () => {
    const localOnly = makeRecord({ id: 'local-only' })
    const remoteOnly = makeRecord({ id: 'remote-only' })
    const localNewer = makeRecord({ id: 'both', updated_at: '2026-06-03T00:00:00Z' })
    const remoteNewer = makeRecord({ id: 'both', updated_at: '2026-06-01T00:00:00Z' })
    const same = makeRecord({ id: 'same', updated_at: '2026-06-01T00:00:00Z' })
    const sameRemote = makeRecord({ id: 'same', updated_at: '2026-06-01T00:00:00Z' })

    const result = diffRecords(
      [localOnly, localNewer, same],
      [remoteOnly, remoteNewer, sameRemote]
    )
    expect(result.localOnly).toEqual([localOnly])
    expect(result.remoteOnly).toEqual([remoteOnly])
    expect(result.localNewer).toEqual([localNewer])
    expect(result.remoteNewer).toHaveLength(0) // remoteNewer 在 remote 中时间更旧
    // Wait - localNewer has updated_at 2026-06-03, remoteNewer has 2026-06-01
    // So local is newer → localNewer, remote is not newer
  })

  it('只有 created_at 没有 updated_at → 用 created_at 比较', () => {
    const local = makeRecord({ id: 'a', updated_at: '', created_at: '2026-06-02T00:00:00Z' })
    const remote = makeRecord({ id: 'a', updated_at: '', created_at: '2026-06-01T00:00:00Z' })
    const result = diffRecords([local], [remote])
    expect(result.localNewer).toEqual([local])
  })

  it('空数组 vs 非空数组', () => {
    const records = [makeRecord({ id: 'a' }), makeRecord({ id: 'b' })]
    const result = diffRecords([], records)
    expect(result.remoteOnly).toEqual(records)
    expect(result.localOnly).toHaveLength(0)

    const result2 = diffRecords(records, [])
    expect(result2.localOnly).toEqual(records)
    expect(result2.remoteOnly).toHaveLength(0)
  })

  it('两边都空', () => {
    const result = diffRecords([], [])
    expect(result).toEqual({
      localOnly: [],
      remoteOnly: [],
      localNewer: [],
      remoteNewer: [],
    })
  })
})

// ==================== buildProfileFromRemote ====================
describe('buildProfileFromRemote', () => {
  const makeProfile = (overrides: Record<string, any> = {}) => ({
    id: 'profile-1',
    user_id: 'user-1',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    name: '测试用户',
    signature: '练习中',
    avatar: null,
    historical_days: 0,
    historical_avg_minutes: 0,
    ...overrides,
  })

  it('remote 有完整 profile → 返回 remote', () => {
    const remote = makeProfile()
    const result = buildProfileFromRemote(remote, makeProfile({ name: 'local' }))
    expect(result.name).toBe('测试用户')
  })

  it('remote profile 缺少字段 → 用默认值填充', () => {
    const remote = { name: '简单名' } as any
    const result = buildProfileFromRemote(remote, null)
    expect(result.name).toBe('简单名')
    expect(result.signature).toBe('练习、练习，一切随之而来。')
    expect(result.historical_days).toBe(0)
  })

  it('remote profile 没有 name → 返回 local', () => {
    const local = makeProfile({ name: '本地用户' })
    const result = buildProfileFromRemote({}, local)
    expect(result.name).toBe('本地用户')
  })

  it('local 也无 profile → 返回默认', () => {
    const result = buildProfileFromRemote(null, null)
    expect(result.name).toBe('阿斯汤加习练者')
  })

  it('remote.updated_at 缺失 → fallback 到 created_at', () => {
    const remote = { name: '用户', created_at: '2026-05-01T00:00:00Z' } as any
    const result = buildProfileFromRemote(remote, null)
    expect(result.updated_at).toBe('2026-05-01T00:00:00Z')
  })
})

// ==================== mergeRecords ====================
describe('mergeRecords', () => {
  it('只有 local → 原样返回', () => {
    const local = [makeRecord({ id: 'a' }), makeRecord({ id: 'b' })]
    expect(mergeRecords(local, [], [])).toEqual(local)
  })

  it('有 remoteOnly → 追加', () => {
    const local = [makeRecord({ id: 'a' })]
    const remoteOnly = [makeRecord({ id: 'b' })]
    const result = mergeRecords(local, remoteOnly, [])
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toEqual(['a', 'b'])
  })

  it('有 remoteNewer → 替换同 ID', () => {
    const local = [makeRecord({ id: 'a', notes: '旧' })]
    const remoteNewer = [makeRecord({ id: 'a', notes: '新' })]
    const result = mergeRecords(local, [], remoteNewer)
    expect(result).toHaveLength(1)
    expect(result[0].notes).toBe('新')
  })

  it('同时有 remoteOnly + remoteNewer → 都生效', () => {
    const local = [makeRecord({ id: 'a', notes: '旧' })]
    const remoteOnly = [makeRecord({ id: 'b' })]
    const remoteNewer = [makeRecord({ id: 'a', notes: '新' })]
    const result = mergeRecords(local, remoteOnly, remoteNewer)
    expect(result).toHaveLength(2)
    expect(result.find(r => r.id === 'a')?.notes).toBe('新')
    expect(result.find(r => r.id === 'b')).toBeTruthy()
  })

  it('remoteNewer 的 ID 在 local 中不存在 → 无影响', () => {
    const local = [makeRecord({ id: 'a' })]
    const remoteNewer = [makeRecord({ id: 'x', notes: '不存在' })]
    const result = mergeRecords(local, [], remoteNewer)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
  it('同一 ID 出现在 local 和 remoteOnly 时不会翻倍', () => {
    const local = [makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })]
    const remoteOnly = [makeRecord({ id: 'a', updated_at: '2026-06-01T00:00:00Z' })]
    const result = mergeRecords(local, remoteOnly, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

// ==================== dedupeRecordsById ====================
describe('dedupeRecordsById', () => {
  it('按 id 去重，并保留更新时间较新的记录', () => {
    const oldRecord = makeRecord({ id: 'a', notes: 'old', updated_at: '2026-06-01T00:00:00Z' })
    const newRecord = makeRecord({ id: 'a', notes: 'new', updated_at: '2026-06-02T00:00:00Z' })
    const result = dedupeRecordsById([oldRecord, newRecord])
    expect(result).toHaveLength(1)
    expect(result[0].notes).toBe('new')
  })

  it('没有重复 id 时保持数量不变', () => {
    const records = [makeRecord({ id: 'a' }), makeRecord({ id: 'b' })]
    expect(dedupeRecordsById(records)).toEqual(records)
  })
})

// ==================== mergeOptions ====================
describe('mergeOptions', () => {
  it('remote 有 local 没有的 option → 直接用 remote', () => {
    const remoteOpts = [{ id: '1', label: '选项A' }]
    const result = mergeOptions(remoteOpts, [])
    expect(result).toEqual([{ id: '1', label: '选项A' }])
  })

  it('两边都有同 ID → 保留 local 字段', () => {
    const remoteOpts = [{ id: '1', label: '远端', is_preset: false, audio_src: 'remote.mp3', can_edit: true }]
    const localOpts = [{ id: '1', label: '本地', is_preset: true, audio_src: 'local.mp3', can_edit: false }]
    const result = mergeOptions(remoteOpts, localOpts)
    expect(result[0].label).toBe('远端') // 用 remote 的内容
    expect(result[0].is_preset).toBe(true) // 保留 local
    expect(result[0].audio_src).toBe('local.mp3') // 保留 local
    expect(result[0].can_edit).toBe(false) // 保留 local
  })

  it('local 有 remote 没有 → 不出现在结果', () => {
    const localOpts = [{ id: '2', label: '只有本地' }]
    const result = mergeOptions([], localOpts)
    expect(result).toEqual([])
  })

  it('空数组 → 返回空数组', () => {
    expect(mergeOptions([], [])).toEqual([])
  })

  it('多个 option 混合场景', () => {
    const remoteOpts = [
      { id: '1', label: 'A', is_preset: false, audio_src: null, can_edit: true },
      { id: '2', label: 'B', is_preset: false, audio_src: null, can_edit: true },
      { id: '3', label: 'C', is_preset: false, audio_src: null, can_edit: true },
    ]
    const localOpts = [
      { id: '1', label: '本地A', is_preset: true, audio_src: 'a.mp3', can_edit: false },
      { id: '3', label: '本地C', is_preset: false, audio_src: 'c.mp3', can_edit: true },
    ]
    const result = mergeOptions(remoteOpts, localOpts)
    expect(result).toHaveLength(3)
    // id=1: 有 local → 保留 local 字段
    expect(result[0].label).toBe('A')
    expect(result[0].is_preset).toBe(true)
    expect(result[0].audio_src).toBe('a.mp3')
    // id=2: 无 local → 纯 remote
    expect(result[1].is_preset).toBe(false)
    // id=3: 有 local → 保留 local 字段
    expect(result[2].audio_src).toBe('c.mp3')
  })
})

// ==================== sortAndLimitRecords ====================
describe('sortAndLimitRecords', () => {
  it('空数组 → 空结果', () => {
    const result = sortAndLimitRecords([], 1000)
    expect(result.toSync).toEqual([])
    expect(result.localOnlyCount).toBe(0)
  })

  it('按日期倒序排列', () => {
    const records = [
      { id: 'old', date: '2026-01-01' },
      { id: 'mid', date: '2026-06-01' },
      { id: 'new', date: '2026-12-01' },
    ]
    const result = sortAndLimitRecords(records, 1000)
    expect(result.toSync.map(r => r.id)).toEqual(['new', 'mid', 'old'])
  })

  it('不超过 maxSync 限制', () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}`
    }))
    const result = sortAndLimitRecords(records, 3)
    expect(result.toSync).toHaveLength(3)
    expect(result.localOnlyCount).toBe(7)
  })

  it('1000 条边界：超过部分进入 localOnly', () => {
    const records = Array.from({ length: 1001 }, (_, i) => ({
      id: `r${i}`, date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}`
    }))
    const result = sortAndLimitRecords(records, 1000)
    expect(result.toSync).toHaveLength(1000)
    expect(result.localOnlyCount).toBe(1)
  })

  it('maxSync 为 0 → 全部不进同步', () => {
    const records = [{ id: 'a', date: '2026-06-01' }]
    const result = sortAndLimitRecords(records, 0)
    expect(result.toSync).toHaveLength(0)
    expect(result.localOnlyCount).toBe(1)
  })

  it('不修改原数组', () => {
    const records = [{ id: 'a', date: '2026-06-01' }]
    const before = [...records]
    sortAndLimitRecords(records, 1000)
    expect(records).toEqual(before)
  })
})

// ==================== applySafeMerge ====================
describe('applySafeMerge', () => {
  const makeCloud = (overrides: Partial<CloudRecordForMerge> & { id: string }): CloudRecordForMerge => ({
    notes: null,
    breakthrough: null,
    photos: null,
    duration: null,
    updated_at: null,
    ...overrides,
  })

  it('无对应云端记录 → 保持本地不变', () => {
    const local = [{ id: 'a', notes: '本地笔记', photos: [], breakthrough: null, duration: 3600, updated_at: '' }]
    const result = applySafeMerge(local, new Map())
    expect(result.merged).toEqual(local)
    expect(result.mergedCount).toBe(0)
  })

  it('本地 notes 为空 → 保留云端', () => {
    const local = [{ id: 'a', notes: '', photos: [], breakthrough: null, duration: 3600, updated_at: '' }]
    const cloudMap = new Map([['a', makeCloud({ id: 'a', notes: '云端笔记' })]])
    const result = applySafeMerge(local, cloudMap)
    expect(result.merged[0].notes).toBe('云端笔记')
    expect(result.mergedCount).toBe(1)
  })

  it('本地 notes 有内容 → 保持本地', () => {
    const local = [{ id: 'a', notes: '本地笔记', photos: [], breakthrough: null, duration: 3600, updated_at: '' }]
    const cloudMap = new Map([['a', makeCloud({ id: 'a', notes: '云端笔记' })]])
    const result = applySafeMerge(local, cloudMap)
    expect(result.merged[0].notes).toBe('本地笔记')
    expect(result.mergedCount).toBe(0)
  })

  it('本地 breakthrough 为空 → 保留云端', () => {
    const local = [{ id: 'a', notes: '', photos: [], breakthrough: '', duration: 3600, updated_at: '' }]
    const cloudMap = new Map([['a', makeCloud({ id: 'a', breakthrough: '云端突破' })]])
    const result = applySafeMerge(local, cloudMap)
    expect(result.merged[0].breakthrough).toBe('云端突破')
    expect(result.mergedCount).toBe(1)
  })

  it('本地 photos 为空 → 保留云端', () => {
    const local = [{ id: 'a', notes: '', photos: [], breakthrough: null, duration: 3600, updated_at: '' }]
    const cloudMap = new Map([['a', makeCloud({ id: 'a', photos: ['cloud.jpg'] })]])
    const result = applySafeMerge(local, cloudMap)
    expect(result.merged[0].photos).toEqual(['cloud.jpg'])
    expect(result.mergedCount).toBe(1)
  })

  it('mergeUpdatedAt 为 true 时同步合并时间', () => {
    const local = [{ id: 'a', notes: '', photos: [], breakthrough: null, duration: 3600, updated_at: '2026-06-01T00:00:00Z' }]
    // 需要 cloud 有内容触发 needsMerge，才会进入 mergeUpdatedAt 分支
    const cloudMap = new Map([['a', makeCloud({ id: 'a', notes: '云端笔记', updated_at: '2026-06-10T00:00:00Z' })]])
    const result = applySafeMerge(local, cloudMap, true)
    expect(result.merged[0].updated_at).toBe('2026-06-10T00:00:00Z')
  })
})

// ==================== detectOptionChanges ====================
describe('detectOptionChanges', () => {
  it('完全一致 → 无变化', () => {
    const result = detectOptionChanges([{ id: '1' }, { id: '2' }], [{ id: '1' }, { id: '2' }])
    expect(result.changed).toBe(false)
    expect(result.source).toBeNull()
  })

  it('local 比 remote 多 → changed local', () => {
    const result = detectOptionChanges([{ id: '1' }, { id: '2' }, { id: '3' }], [{ id: '1' }, { id: '2' }])
    expect(result.changed).toBe(true)
    expect(result.source).toBe('local')
  })

  it('remote 比 local 多 → changed remote', () => {
    const result = detectOptionChanges([{ id: '1' }], [{ id: '1' }, { id: '2' }])
    expect(result.changed).toBe(true)
    expect(result.source).toBe('remote')
  })

  it('数量相同但 ID 不同 → changed local', () => {
    const result = detectOptionChanges([{ id: '1' }], [{ id: '2' }])
    expect(result.changed).toBe(true)
    expect(result.source).toBe('local')
  })

  it('两边都空 → 无变化', () => {
    const result = detectOptionChanges([], [])
    expect(result.changed).toBe(false)
    expect(result.source).toBeNull()
  })
})

// ==================== detectProfileChanges ====================
describe('detectProfileChanges', () => {
  const baseLocal = { id: 'p1', name: '本地', signature: 'sig', avatar: null, historical_days: 0, historical_avg_minutes: 0, updated_at: '2026-06-02T00:00:00Z', created_at: '2026-06-01T00:00:00Z' }
  const baseRemote = { id: 'p1', name: '本地', signature: 'sig', avatar: null, historical_days: 0, historical_avg_minutes: 0, updated_at: '2026-06-01T00:00:00Z', created_at: '2026-06-01T00:00:00Z' }

  it('内容完全一致 → 无变化', () => {
    const result = detectProfileChanges(baseLocal, baseLocal)
    expect(result.changed).toBe(false)
    expect(result.source).toBeNull()
  })

  it('只有 local → changed local', () => {
    const result = detectProfileChanges(baseLocal, null)
    expect(result.changed).toBe(true)
    expect(result.source).toBe('local')
  })

  it('只有 remote → changed remote', () => {
    const result = detectProfileChanges(null, baseRemote)
    expect(result.changed).toBe(true)
    expect(result.source).toBe('remote')
  })

  it('两边都空 → 无变化', () => {
    const result = detectProfileChanges(null, null)
    expect(result.changed).toBe(false)
    expect(result.source).toBeNull()
  })

  it('内容相同但时间不同 → 无变化（内容优先比较）', () => {
    const result = detectProfileChanges(
      { ...baseLocal, name: '本地' },
      { ...baseRemote, name: '本地', updated_at: '2026-06-05T00:00:00Z' },
    )
    expect(result.changed).toBe(false)
  })

  it('内容不同且本地更新 → local source', () => {
    const result = detectProfileChanges(
      { ...baseLocal, name: '新名字' },
      { ...baseRemote, name: '旧名字' },
    )
    expect(result.changed).toBe(true)
    expect(result.source).toBe('local')
  })

  it('内容不同且云端更新 → remote source', () => {
    const result = detectProfileChanges(
      { ...baseLocal, name: '旧名字', updated_at: '2026-06-01T00:00:00Z' },
      { ...baseRemote, name: '新名字', updated_at: '2026-06-03T00:00:00Z' },
    )
    expect(result.changed).toBe(true)
    expect(result.source).toBe('remote')
  })
})

// ==================== trimSyncLogs ====================
describe('trimSyncLogs', () => {
  it('单条日志 → 包含新条目', () => {
    const entry = createSyncLogEntry('sync', 'success', { triggerReason: 'auto' })
    const result = trimSyncLogs([], entry)
    expect(result).toHaveLength(1)
    expect(result[0].action).toBe('sync')
  })

  it('最多保留 50 条', () => {
    const existing = Array.from({ length: 50 }, (_, i) =>
      createSyncLogEntry(`action-${i}`, 'success', { triggerReason: 'auto' })
    )
    const entry = createSyncLogEntry('new', 'success', { triggerReason: 'auto' })
    const result = trimSyncLogs(existing, entry)
    expect(result).toHaveLength(50)
    expect(result[0].action).toBe('new')
  })

  it('超过 100KB 时截断到 20 条', () => {
    const bigAction = 'x'.repeat(5000)
    const existing = Array.from({ length: 49 }, (_, i) =>
      createSyncLogEntry(`${bigAction}-${i}`, 'success', { triggerReason: 'auto' })
    )
    const entry = createSyncLogEntry(bigAction, 'success', { triggerReason: 'auto' })
    const result = trimSyncLogs(existing, entry)
    expect(result).toHaveLength(20)
  })

  it('处理空日志列表', () => {
    const entry = createSyncLogEntry('sync', 'success')
    const result = trimSyncLogs(null as unknown as any[], entry)
    expect(result).toHaveLength(1)
  })
})
