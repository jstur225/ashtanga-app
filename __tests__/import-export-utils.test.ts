import { describe, it, expect } from 'vitest'
import {
  parseAndValidateImportData,
  sortRecordsByDate,
  migrateOldOptions,
  serializeExportData,
} from '@/lib/import-export'

describe('parseAndValidateImportData', () => {
  it('合法数据胶囊 → valid', () => {
    const json = JSON.stringify({ records: [], options: [], profile: {} })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('仅 records 也可接受', () => {
    const json = JSON.stringify({ records: [] })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(true)
  })

  it('仅 options 也可接受', () => {
    const json = JSON.stringify({ options: [] })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(true)
  })

  it('仅 profile 也可接受', () => {
    const json = JSON.stringify({ profile: {} })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(true)
  })

  it('非法 JSON → invalid', () => {
    const result = parseAndValidateImportData('不是JSON')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('JSON 格式错误')
  })

  it('空对象 → invalid', () => {
    const result = parseAndValidateImportData('{}')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('缺少必要字段')
  })

  it('records 非数组 → invalid', () => {
    const json = JSON.stringify({ records: 'not-an-array' })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('records')
  })

  it('options 非数组 → invalid', () => {
    const json = JSON.stringify({ options: 123 })
    const result = parseAndValidateImportData(json)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('options')
  })

  it('null → invalid', () => {
    const result = parseAndValidateImportData('null')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('数据格式无效')
  })

  it('纯数字 → invalid', () => {
    const result = parseAndValidateImportData('42')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('数据格式无效')
  })
})

describe('sortRecordsByDate', () => {
  const records = [
    { id: '1', date: '2026-06-01' },
    { id: '2', date: '2026-05-15' },
    { id: '3', date: '2026-06-10' },
  ] as any[]

  it('按日期倒序排列', () => {
    const sorted = sortRecordsByDate(records)
    expect(sorted[0].id).toBe('3') // 2026-06-10
    expect(sorted[1].id).toBe('1') // 2026-06-01
    expect(sorted[2].id).toBe('2') // 2026-05-15
  })

  it('不修改原数组', () => {
    const original = [...records]
    sortRecordsByDate(records)
    expect(records[0].date).toBe('2026-06-01') // unchanged
  })
})

describe('migrateOldOptions', () => {
  it('保留现代字段不变', () => {
    const options = [{ label: '一序列', is_custom: true, notes: 'Mysore' }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].label).toBe('一序列')
    expect(migrated[0].is_custom).toBe(true)
    expect(migrated[0].notes).toBe('Mysore')
  })

  it('label_zh → label', () => {
    const options = [{ label: 'old', label_zh: '新名称', is_custom: true, notes: '' }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].label).toBe('新名称')
  })

  it('isCustom → is_custom', () => {
    const options = [{ label: 'x', isCustom: false, notes: '' }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].is_custom).toBe(false)
  })

  it('isCustom 优先于 is_custom', () => {
    const options = [{ label: 'x', isCustom: true, is_custom: false, notes: '' }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].is_custom).toBe(true)
  })

  it('缺失 notes 默认为空字符串', () => {
    const options = [{ label: 'x', is_custom: true }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].notes).toBe('')
  })

  it('缺失 label 默认为空字符串', () => {
    const options = [{ is_custom: true }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0].label).toBe('')
  })

  it('同时清理 label_zh 和 isCustom', () => {
    const options = [{ label_zh: 'zh', isCustom: true, label: 'en', is_custom: false, notes: '' }]
    const migrated = migrateOldOptions(options)
    expect(migrated[0]).not.toHaveProperty('label_zh')
    expect(migrated[0]).not.toHaveProperty('isCustom')
  })
})

describe('serializeExportData', () => {
  it('生成有效 JSON 字符串', () => {
    const json = serializeExportData([], [], null)
    const parsed = JSON.parse(json)
    expect(parsed.records).toEqual([])
    expect(parsed.options).toEqual([])
    expect(parsed.profile).toBeUndefined()
    expect(parsed.export_at).toBeDefined()
  })

  it('过滤草稿记录', () => {
    const records = [
      { id: '1', type: '一序列', date: '2026-06-01', duration: 3600, notes: '', created_at: '', updated_at: '' },
      { id: '2', type: '草稿', date: '2026-06-02', duration: 0, notes: '', created_at: '', updated_at: '' },
    ] as any[]
    const json = serializeExportData(records, [], { id: 'p1', created_at: '', updated_at: '', name: 'test', signature: '', avatar: null } as any)
    const parsed = JSON.parse(json)
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0].id).toBe('1')
  })

  it('移除头像 base64', () => {
    const profile = {
      id: 'p1', created_at: '', updated_at: '',
      name: 'test', signature: '', avatar: 'data:image/base64,abc123',
    }
    const json = serializeExportData([], [], profile as any)
    const parsed = JSON.parse(json)
    expect(parsed.profile).not.toHaveProperty('avatar')
    expect(parsed.profile.name).toBe('test')
  })

  it('空记录列表', () => {
    const json = serializeExportData([], [], null)
    const parsed = JSON.parse(json)
    expect(parsed.records).toEqual([])
  })
})

describe('旧版本导入兼容', () => {
  describe('parseAndValidateImportData — 旧格式 records', () => {
    it('缺 updated_at 的旧版记录 → 可接受', () => {
      const oldRecord = { id: 'r1', date: '2026-01-20', type: '一序列', duration: 3600, notes: '', created_at: '2026-01-20T00:00:00Z' }
      const json = JSON.stringify({ records: [oldRecord] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('缺 user_id/deleted_at/start_time/color_level 等新增字段 → 可接受', () => {
      const oldRecord = { id: 'r1', date: '2026-01-20', type: '一序列', duration: 3600, notes: '' }
      const json = JSON.stringify({ records: [oldRecord] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('photos 为字符串（旧版导出）→ 可接受', () => {
      const oldRecord = { id: 'r1', date: '2026-01-20', type: '一序列', duration: 3600, notes: '', photos: 'url1,url2', created_at: '' }
      const json = JSON.stringify({ records: [oldRecord] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('photos 为 null → 可接受', () => {
      const oldRecord = { id: 'r1', date: '2026-01-20', type: '一序列', duration: 3600, notes: '', photos: null, created_at: '' }
      const json = JSON.stringify({ records: [oldRecord] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('缺失 photos 字段 → 可接受', () => {
      const oldRecord = { id: 'r1', date: '2026-01-20', type: '一序列', duration: 3600, notes: '', created_at: '' }
      const json = JSON.stringify({ records: [oldRecord] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })
  })

  describe('parseAndValidateImportData — 旧格式 profile', () => {
    it('含 is_pro 旧字段 → 可接受', () => {
      const oldProfile = { id: 'u1', name: 'test', signature: '', created_at: '', is_pro: false }
      const json = JSON.stringify({ profile: oldProfile })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('缺 updated_at → 可接受', () => {
      const oldProfile = { id: 'u1', name: 'test', signature: '', created_at: '' }
      const json = JSON.stringify({ profile: oldProfile })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('缺 phone/historical_days/historical_avg_minutes → 可接受', () => {
      const oldProfile = { id: 'u1', name: 'test', signature: '', created_at: '', updated_at: '' }
      const json = JSON.stringify({ profile: oldProfile })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })
  })

  describe('parseAndValidateImportData — 旧格式 options', () => {
    it('含 label_zh + label（旧版英文+中文）→ 可接受', () => {
      const oldOption = { id: 'o1', label: 'Primary 1', label_zh: '一序列', notes: 'Mysore', is_custom: false, created_at: '' }
      const json = JSON.stringify({ options: [oldOption] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })

    it('缺 visible/color_level/is_fixed → 可接受', () => {
      const oldOption = { id: 'o1', label: '一序列', notes: 'Mysore', is_custom: true, created_at: '' }
      const json = JSON.stringify({ options: [oldOption] })
      const result = parseAndValidateImportData(json)
      expect(result.valid).toBe(true)
    })
  })

  describe('sortRecordsByDate — 旧日期格式', () => {
    it('斜杠日期格式 yyyy/MM/dd → 排序正确', () => {
      const records = [
        { id: '1', date: '2026/06/01' },
        { id: '2', date: '2026/05/15' },
        { id: '3', date: '2026/06/10' },
      ] as any[]
      const sorted = sortRecordsByDate(records)
      expect(sorted[0].id).toBe('3')
      expect(sorted[1].id).toBe('1')
      expect(sorted[2].id).toBe('2')
    })

    it('全 ISO 时间戳 → 排序正确', () => {
      const records = [
        { id: '1', date: '2026-06-01T08:00:00.000Z' },
        { id: '2', date: '2026-05-15T10:30:00.000Z' },
        { id: '3', date: '2026-06-10T06:00:00.000Z' },
      ] as any[]
      const sorted = sortRecordsByDate(records)
      expect(sorted[0].id).toBe('3')
      expect(sorted[1].id).toBe('1')
      expect(sorted[2].id).toBe('2')
    })

    it('混合格式（斜杠 + ISO + 标准）→ 排序正确', () => {
      const records = [
        { id: '1', date: '2026/06/01' },
        { id: '2', date: '2026-05-15T10:30:00.000Z' },
        { id: '3', date: '2026-06-10' },
      ] as any[]
      const sorted = sortRecordsByDate(records)
      expect(sorted[0].id).toBe('3')
      expect(sorted[1].id).toBe('1')
      expect(sorted[2].id).toBe('2')
    })
  })

  describe('migrateOldOptions — 旧格式完整描述', () => {
    it('只有 label_zh 无 label → label = label_zh', () => {
      const options = [{ label_zh: '半序列', is_custom: true, notes: '站立+休息' }]
      const migrated = migrateOldOptions(options)
      expect(migrated[0].label).toBe('半序列')
    })

    it('旧格式完整数据胶囊（类似 test-data.json 的真实数据）→ 可接受 + 选项迁移', () => {
      // 模拟 app 早期 test-data.json 格式：records 缺 updated_at, options 含 label_zh, profile 含 is_pro
      const oldExport = {
        records: [
          { id: 'r1', date: '2026-01-20', type: '一序列', duration: 5400, notes: '流畅', photos: [], created_at: '2026-01-23T08:00:00.000Z' },
          { id: 'r2', date: '2026-01-21', type: '二序列', duration: 6300, notes: '突破', photos: [], breakthrough: '卡波塔式抓脚', created_at: '2026-01-22T08:00:00.000Z' },
        ],
        options: [
          { id: 'o1', label: 'Primary 1', label_zh: '一序列', notes: 'Mysore', is_custom: false, created_at: '2026-01-23T00:00:00.000Z' },
          { id: 'o2', label: 'Half', label_zh: '半序列', notes: '站立+休息', is_custom: false, created_at: '2026-01-23T00:00:00.000Z' },
        ],
        profile: { id: 'u1', created_at: '2026-01-23T00:00:00.000Z', name: '测试用户', signature: '熬汤日记测试', avatar: null, is_pro: false },
        export_at: '2026-01-23T12:00:00.000Z',
      }
      const result = parseAndValidateImportData(JSON.stringify(oldExport))
      expect(result.valid).toBe(true)
      // migrated option label 应为中文
      const migratedOptions = migrateOldOptions(result.data!.options!)
      expect(migratedOptions[0].label).toBe('一序列')
      expect(migratedOptions[1].label).toBe('半序列')
    })
  })
})
