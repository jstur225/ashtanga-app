import type { PracticeRecord, UserProfile } from '@/lib/supabase'

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
