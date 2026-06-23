import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'

export interface ImportData {
  records?: PracticeRecord[]
  options?: PracticeOption[]
  profile?: UserProfile
}

/**
 * 解析并验证导入的 JSON 字符串
 * 返回 `{ valid, data, error }`，不修改任何状态
 */
export function parseAndValidateImportData(jsonString: string): {
  valid: boolean
  data?: ImportData
  error?: string
} {
  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    return { valid: false, error: 'JSON 格式错误' }
  }

  if (!data || typeof data !== 'object') {
    return { valid: false, error: '数据格式无效' }
  }

  const importData = data as ImportData

  // 至少要有 records / options / profile 之一
  if (!importData.records && !importData.options && !importData.profile) {
    return { valid: false, error: '缺少必要字段（records / options / profile）' }
  }

  // 非严格验证：有结构的都接受，兼容旧格式
  if (importData.records !== undefined && !Array.isArray(importData.records)) {
    return { valid: false, error: 'records 字段格式错误' }
  }
  if (importData.options !== undefined && !Array.isArray(importData.options)) {
    return { valid: false, error: 'options 字段格式错误' }
  }
  if (importData.profile !== undefined && typeof importData.profile !== 'object') {
    return { valid: false, error: 'profile 字段格式错误' }
  }

  return { valid: true, data: importData }
}

/**
 * 导入记录按日期倒序排序（最新日期在上）
 */
export function sortRecordsByDate(records: PracticeRecord[]): PracticeRecord[] {
  return [...records].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

interface OldOption {
  label?: string
  label_zh?: string
  isCustom?: boolean
  is_custom?: boolean
  notes?: string
  [key: string]: unknown
}

/**
 * 迁移旧的选项数据结构
 * - label_zh → label
 * - isCustom → is_custom
 * - 确保 notes 存在
 */
export function migrateOldOptions(options: OldOption[]) {
  return options.map((opt) => {
    const { label_zh, isCustom, ...rest } = opt
    return {
      ...rest,
      label: label_zh || opt.label || '',
      is_custom:
        isCustom !== undefined
          ? isCustom
          : opt.is_custom !== undefined
            ? opt.is_custom
            : true,
      notes: opt.notes || '',
    }
  })
}

/**
 * 构建导出的数据胶囊 JSON 字符串
 * 过滤草稿记录，移除头像 base64
 */
export function serializeExportData(
  records: PracticeRecord[],
  options: PracticeOption[],
  profile: UserProfile | null,
): string {
  const nonDraftRecords = (records || []).filter((r) => r.type !== '草稿')
  let cleanProfile: Partial<UserProfile> | undefined
  if (profile) {
    const { avatar, ...rest } = profile
    cleanProfile = rest
  }
  const data = {
    records: nonDraftRecords,
    options,
    profile: cleanProfile,
    export_at: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}
