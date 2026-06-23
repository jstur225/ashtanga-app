import type { PracticeRecord, UserProfile } from '@/lib/supabase'
import { withRetry } from './sync-retry'

/** 上传记录的载荷格式（包含索引所需的字段） */
export interface UploadRecordPayload {
  id: string
  user_id: string
  date: string
  type: string
  duration: number
  notes: string
  photos: string[] | null
  breakthrough: string | null
  start_time: string | null
  color_level: number
  updated_at: string
}

/** 安全合并所需的云端记录字段 */
export type CloudRecordForMerge = {
  id: string
  notes: string | null
  breakthrough: string | null
  photos: string[] | null
  duration: number | null
  updated_at: string | null
}

/**
 * 安全合并：把本地记录与云端记录合并，防止本地空白笔记/突破/照片覆盖云端内容。
 *
 * 判断逻辑：
 * - 本地 notes 为空/默认文案 → 保留云端
 * - 本地 breakthrough 为空 → 保留云端
 * - 本地 photos 为空 → 保留云端
 *
 * @param localRecords 待上传的本地记录
 * @param cloudMap 云端记录 Map（id → CloudRecordForMerge）
 * @param mergeUpdatedAt 是否同时合并 updated_at（取较新时间戳）
 * @returns { merged, mergedCount } 合并后的记录列表和合并条数
 */
export function applySafeMerge<T extends Record<string, any>>(
  localRecords: T[],
  cloudMap: Map<string, CloudRecordForMerge>,
  mergeUpdatedAt = false,
): { merged: T[]; mergedCount: number } {
  let mergedCount = 0
  const merged = localRecords.map(local => {
    const cloud = cloudMap.get(local.id)
    if (!cloud) return local

    const needsMerge = (
      (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
    ) || (
      !local.breakthrough && cloud.breakthrough
    ) || (
      (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
    )

    if (!needsMerge) return local

    mergedCount++
    const result = {
      ...local,
      notes: (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
        ? cloud.notes
        : local.notes,
      breakthrough: !local.breakthrough && cloud.breakthrough ? cloud.breakthrough : local.breakthrough,
      photos: (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
        ? cloud.photos
        : local.photos,
    }

    if (mergeUpdatedAt) {
      const cloudTime = new Date(cloud.updated_at || 0).getTime()
      const localTime = new Date(local.updated_at).getTime()
      ;(result as any).updated_at = localTime > cloudTime ? local.updated_at : (cloud.updated_at ?? local.updated_at)
    }
    return result
  })

  return { merged, mergedCount }
}

/**
 * 对比本地和云端记录，按 ID 和时间戳分类
 */
export function diffRecords(
  local: PracticeRecord[],
  remote: PracticeRecord[]
): {
  localOnly: PracticeRecord[]
  remoteOnly: PracticeRecord[]
  localNewer: PracticeRecord[]
  remoteNewer: PracticeRecord[]
} {
  const localIds = new Set(local.map(r => r.id))
  const remoteIds = new Set(remote.map(r => r.id))
  const remoteMap = new Map(remote.map(r => [r.id, r]))

  const localOnly: PracticeRecord[] = []
  const remoteOnly: PracticeRecord[] = []
  const localNewer: PracticeRecord[] = []
  const remoteNewer: PracticeRecord[] = []

  for (const localRecord of local) {
    if (!remoteIds.has(localRecord.id)) {
      localOnly.push(localRecord)
    } else {
      const remoteRecord = remoteMap.get(localRecord.id)
      if (remoteRecord) {
        const localTime = new Date(localRecord.updated_at || localRecord.created_at).getTime()
        const remoteTime = new Date(remoteRecord.updated_at || remoteRecord.created_at).getTime()

        if (localTime > remoteTime) {
          localNewer.push(localRecord)
        } else if (remoteTime > localTime) {
          remoteNewer.push(remoteRecord)
        }
      }
    }
  }

  for (const remoteRecord of remote) {
    if (!localIds.has(remoteRecord.id)) {
      remoteOnly.push(remoteRecord)
    }
  }

  return { localOnly, remoteOnly, localNewer, remoteNewer }
}

/**
 * 从远端 profile 构建完整 profile 对象，缺字段用默认值填充
 * 远端无 name 时 fallback 到 local 或默认 profile
 */
export function buildProfileFromRemote(
  remoteProfile: Partial<UserProfile> | null | undefined,
  localProfile: UserProfile | null | undefined
): UserProfile {
  const defaultProfile: UserProfile = {
    id: '',
    user_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name: '阿斯汤加习练者',
    signature: '练习、练习，一切随之而来。',
    avatar: null,
    historical_days: 0,
    historical_avg_minutes: 0,
  }

  if (remoteProfile && remoteProfile.name) {
    return {
      id: remoteProfile.id || '',
      user_id: remoteProfile.user_id || '',
      created_at: remoteProfile.created_at || new Date().toISOString(),
      updated_at: remoteProfile.updated_at || remoteProfile.created_at || new Date().toISOString(),
      name: remoteProfile.name,
      signature: remoteProfile.signature || '练习、练习，一切随之而来。',
      avatar: remoteProfile.avatar || null,
      phone: remoteProfile.phone,
      historical_days: remoteProfile.historical_days || 0,
      historical_avg_minutes: remoteProfile.historical_avg_minutes || 0,
    }
  }

  return localProfile || defaultProfile
}

/**
 * 合并记录：以 local 为基础，追加 remoteOnly，用 remoteNewer 覆盖同 ID 的旧记录
 */
export function mergeRecords(
  localRecords: PracticeRecord[],
  remoteOnly: PracticeRecord[],
  remoteNewer: PracticeRecord[]
): PracticeRecord[] {
  const remoteNewerMap = new Map(remoteNewer.map(r => [r.id, r]))
  return [...localRecords, ...remoteOnly].map(r => remoteNewerMap.get(r.id) || r)
}

/**
 * 合并选项：以 remote options 为基础，对同 ID 的项保留 local 的 is_preset/audio_src/can_edit/color_level 字段
 */
export function mergeOptions(
  remoteOptions: any[],
  localOptions: any[]
): any[] {
  return (remoteOptions || []).map(remoteOpt => {
    const localOpt = (localOptions || []).find(o => o.id === remoteOpt.id)
    if (localOpt) {
      return {
        ...remoteOpt,
        is_preset: localOpt.is_preset,
        audio_src: localOpt.audio_src,
        can_edit: localOpt.can_edit,
        color_level: localOpt.color_level,
      }
    }
    return remoteOpt
  })
}

/**
 * 获取有效色阶（免费用户不可使用等级 1 和 4）
 */
export function getEffectiveOptionColor(
  options: { label: string; color_level?: number }[],
  label: string,
  isPro: boolean
): number {
  const raw = options.find(o => o.label === label)?.color_level ?? 3
  return (!isPro && (raw === 1 || raw === 4)) ? 3 : raw
}

/**
 * 色阶等级 → CSS class 映射
 * level 1=最浅绿, 2=浅绿, 3=中绿(默认), 4=深绿
 */
export function getColorClass(level: number): string {
  if (level === 1) return 'green-gradient-1'
  if (level === 2) return 'green-gradient-2'
  if (level === 4) return 'green-gradient-4'
  return 'green-gradient-3' // level 3 或 undefined
}

/**
 * 把本地记录按日期倒序排序并限制同步数量。
 */
export function sortAndLimitRecords<T extends { date: string }>(
  records: T[],
  maxSync: number,
): { toSync: T[]; localOnlyCount: number } {
  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const toSync = sorted.slice(0, maxSync)
  return { toSync, localOnlyCount: records.length - toSync.length }
}

/**
 * 把一条本地练习记录映射为 upsert 格式。
 */
export function buildUploadRecordPayload(
  r: PracticeRecord,
  userId: string,
  colorLevel: number,
): UploadRecordPayload {
  return {
    id: r.id,
    user_id: userId,
    date: r.date,
    type: r.type,
    duration: Number(r.duration) || 0,
    notes: r.notes || '',
    photos: r.photos && r.photos.length > 0 ? r.photos : null,
    breakthrough: r.breakthrough || null,
    start_time: r.start_time || null,
    color_level: colorLevel,
    updated_at: r.updated_at || r.created_at || new Date().toISOString(),
  }
}

/**
 * 获取记录的有效色阶：优先用记录自身，其次用选项默认，最后用 3。
 */
export function resolveRecordColorLevel(
  record: { color_level?: number; type: string },
  options?: { label: string; color_level?: number }[],
): number {
  return record.color_level ?? options?.find(o => o.label === record.type)?.color_level ?? 3
}

// ==================== 差异检测（同步编排用） ====================

/** 选项差异检测结果 */
export interface OptionDiffResult {
  changed: boolean
  source: 'local' | 'remote' | null
}

/** 比较本地和云端选项，检测是否有差异 */
export function detectOptionChanges(
  localOptions: any[],
  remoteOptions: any[],
): OptionDiffResult {
  const localOptionIds = new Set(localOptions.map((o: any) => o.id))
  const remoteOptionIds = new Set(remoteOptions.map((o: any) => o.id))

  if (localOptions.length !== remoteOptions.length) {
    return {
      changed: true,
      source: localOptions.length > remoteOptions.length ? 'local' : 'remote',
    }
  }

  // 数量相同，检查是否有不同的选项ID
  const hasDifferentOptions = localOptions.some((o: any) => !remoteOptionIds.has(o.id)) ||
    remoteOptions.some((o: any) => !localOptionIds.has(o.id))
  if (hasDifferentOptions) {
    return { changed: true, source: 'local' }
  }

  return { changed: false, source: null }
}

/** Profile 差异检测结果 */
export interface ProfileDiffResult {
  changed: boolean
  source: 'local' | 'remote' | null
}

/** 比较本地和云端 profile，检测是否有差异 */
export function detectProfileChanges(
  localProfile: Record<string, any> | null | undefined,
  remoteProfile: Record<string, any> | null | undefined,
): ProfileDiffResult {
  if (!localProfile && !remoteProfile) return { changed: false, source: null }
  if (localProfile && !remoteProfile) return { changed: true, source: 'local' }
  if (!localProfile && remoteProfile) return { changed: true, source: 'remote' }

  // 本地是默认 profile（id 为空），强制从云端下载
  if (!localProfile!.id || localProfile!.id === '') {
    return { changed: true, source: 'remote' }
  }

  const hasContentDiff = localProfile!.name !== remoteProfile!.name ||
    localProfile!.signature !== remoteProfile!.signature ||
    localProfile!.avatar !== remoteProfile!.avatar ||
    (localProfile!.historical_days || 0) !== (remoteProfile!.historical_days || 0) ||
    (localProfile!.historical_avg_minutes || 0) !== (remoteProfile!.historical_avg_minutes || 0)

  if (!hasContentDiff) return { changed: false, source: null }

  // 基于时间戳判断谁更新
  const localTime = new Date(localProfile!.updated_at || localProfile!.created_at || 0).getTime()
  const remoteTime = new Date(remoteProfile!.updated_at || remoteProfile!.created_at || 0).getTime()

  if (localTime > remoteTime) return { changed: true, source: 'local' }
  if (remoteTime > localTime) return { changed: true, source: 'remote' }
  return { changed: true, source: 'local' } // 时间相同默认本地优先
}

// ==================== 同步日志条目创建 ====================

/** 同步日志条目 */
export interface SyncLogEntry {
  timestamp: string
  action: string
  status: 'success' | 'error' | 'warning'
  triggerReason: string
  localCount?: number
  remoteCount?: number
  recordId?: string
  error?: string
  details?: {
    stack?: string
    retryCount?: number
    requestInfo?: string
    responseStatus?: number
  }
}

/** 创建同步日志条目（纯函数，不含 React 状态写入） */
export function createSyncLogEntry(
  action: string,
  status: SyncLogEntry['status'],
  options: {
    recordId?: string
    error?: string
    triggerReason?: string
    localCount?: number
    remoteCount?: number
    details?: SyncLogEntry['details']
  } = {},
): SyncLogEntry {
  const truncatedError = options.error
    ? options.error.slice(0, 200) + (options.error.length > 200 ? '...' : '')
    : undefined
  const truncatedStack = options.details?.stack
    ? options.details.stack.slice(0, 500) + (options.details.stack.length > 500 ? '...' : '')
    : undefined

  return {
    timestamp: new Date().toISOString(),
    action,
    status,
    triggerReason: options.triggerReason || '未知触发原因',
    localCount: options.localCount,
    remoteCount: options.remoteCount,
    recordId: options.recordId,
    error: truncatedError,
    details: options.details
      ? {
          stack: truncatedStack,
          retryCount: options.details.retryCount,
          requestInfo: options.details.requestInfo,
          responseStatus: options.details.responseStatus,
        }
      : undefined,
  }
}

/** 限制日志列表大小（最多 50 条，总大小不超过 100KB） */
export function trimSyncLogs(
  logs: SyncLogEntry[],
  newEntry: SyncLogEntry,
): SyncLogEntry[] {
  const combined = [newEntry, ...(logs ?? [])].slice(0, 50)
  const size = new Blob([JSON.stringify(combined)]).size
  return size > 100 * 1024 ? combined.slice(0, 20) : combined
}

/** 把同步错误写入 localStorage 全局错误历史 */
export function appendSyncErrorHistory(entry: SyncLogEntry): void {
  if (entry.status !== 'error' || typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem('__errorHistory') || '[]')
    const errorEntry = {
      timestamp: entry.timestamp,
      action: entry.action,
      error: entry.error,
      stack: entry.details?.stack,
      retryCount: entry.details?.retryCount,
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
    }
    const updated = [errorEntry, ...existing].slice(0, 20)
    localStorage.setItem('__errorHistory', JSON.stringify(updated))
  } catch {
    // 忽略 localStorage 错误
  }
}

// ==================== 批量上传 ====================

/** 分批上传记录（执行 upsert） */
export type RecordUpsertFn<T extends { id: string }> = (batch: T[]) => Promise<{ error: any }>

/** 批量上传结果 */
export interface BatchUploadResult {
  successCount: number
  failedIds: string[]
  lastError: any
}

/**
 * 把记录分批上传，返回每批的成功/失败结果。
 * 不包含日志输出——由调用方根据返回结果处理。
 */
export async function batchUploadRecords<T extends { id: string }>(
  records: T[],
  upsertFn: (batch: T[]) => Promise<{ error: any }>,
  batchSize = 50,
): Promise<BatchUploadResult> {
  let successCount = 0
  let lastError: any = null
  const failedIds: string[] = []

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    // 每批最多重试 2 次（指数退避：1s, 2s）
    try {
      await withRetry(
        async () => {
          const { error } = await upsertFn(batch)
          if (error) throw error
        },
        {
          maxRetries: 2,
          baseDelay: 1000,
        },
      )
      successCount += batch.length
    } catch (error) {
      lastError = error
      batch.forEach((r) => failedIds.push(r.id))
    }
  }

  return { successCount, failedIds, lastError }
}

/** 上传选项的载荷格式 */
export interface OptionsUploadPayload {
  id: string
  user_id: string
  label: string
  notes: string | null
  is_custom: boolean
}

/** 把自定义选项映射为上传 payload */
export function buildOptionsUploadPayload(
  options: any[],
  userId: string,
): OptionsUploadPayload[] {
  return options
    .filter((o: any) => o.is_custom && o.id !== 'custom')
    .map((o: any) => ({
      id: o.id,
      user_id: userId,
      label: o.label || '',
      notes: o.notes || null,
      is_custom: o.is_custom || false,
    }))
}
