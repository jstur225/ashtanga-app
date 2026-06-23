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
