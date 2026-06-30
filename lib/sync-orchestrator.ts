import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'
import { applySafeMerge, detectOptionChanges, detectProfileChanges, computeSmartMergeData, diffRecords } from './sync-utils'
import { buildCompleteProfile } from './sync-mappers'
import type { CloudRecordForMerge } from './supabase-repository'

// ── Types ──────────────────────────────────────────

export type SyncAction =
  | { action: 'noop'; reason: string }
  | { action: 'upload-local'; localRecords: PracticeRecord[]; localOptions: PracticeOption[]; userId: string }
  | { action: 'merge-remote'; mergedRecords: PracticeRecord[]; remoteOptions: PracticeOption[]; mergedCount: number }
  | { action: 'use-remote-only'; remoteRecords: PracticeRecord[]; remoteOptions: PracticeOption[]; remoteProfile: UserProfile | null }
  | { action: 'conflict'; localRecords: PracticeRecord[]; remoteRecords: PracticeRecord[] }

export interface SyncAnalysis {
  decision: SyncAction
  localCount: number
  remoteCount: number
}

export interface SyncStats {
  totalPractices: number
  recentMonthsTotal: number
  thisMonthTotal: number
}

// ── Color level sync detection ─────────────────────

function colorLevelDiffers(
  localRecords: PracticeRecord[],
  remoteRecords: PracticeRecord[],
): boolean {
  if (!localRecords.length || !remoteRecords.length) return false
  const byDate = (a: { date: string }, b: { date: string }) =>
    b.date.localeCompare(a.date)
  const sortedLocal = [...localRecords].sort(byDate)
  const sortedRemote = [...remoteRecords].sort(byDate)
  const recentLocal = sortedLocal.slice(0, 5)
  const recentRemote = sortedRemote.slice(0, 5)
  return recentLocal.some((l) => {
    const r = recentRemote.find((r) => r.date === l.date)
    return !r || r.color_level !== l.color_level
  })
}

// ── Main decision tree ─────────────────────────────

export function analyzeSync(
  localRecords: PracticeRecord[],
  remoteRecords: PracticeRecord[],
  localOptions: PracticeOption[],
  remoteOptions: PracticeOption[],
  localProfile: UserProfile | null,
  remoteProfile: UserProfile | null,
  maxSyncRecords: number,
  userId: string,
): SyncAnalysis {
  const localCount = localRecords.length
  const remoteCount = remoteRecords.length
  const hasLocalData = localCount > 0
  const hasRemoteData = remoteCount > 0
  const optionsChanged = localOptions.length > 0 && remoteOptions.length > 0
    ? detectOptionChanges(localOptions, remoteOptions).changed
    : localOptions.length !== remoteOptions.length

  // Branch 1: Both sides have data
  if (hasLocalData && hasRemoteData) {
    if (!colorLevelDiffers(localRecords, remoteRecords) && !optionsChanged) {
      return {
        decision: { action: 'noop', reason: 'No changes detected' },
        localCount,
        remoteCount,
      }
    }

    // Check for actual record-level diffs
    const localIds = new Set(localRecords.map((r) => r.id))
    const remoteIds = new Set(remoteRecords.map((r) => r.id))
    const localOnlyIds = [...localRecords].filter((r) => !remoteIds.has(r.id))
    const remoteOnlyIds = [...remoteRecords].filter((r) => !localIds.has(r.id))

    // If only color levels or options changed (not actual records), upload local
    if (localOnlyIds.length === 0 && remoteOnlyIds.length === 0) {
      return {
        decision: {
          action: 'upload-local',
          localRecords,
          localOptions,
          userId,
        },
        localCount,
        remoteCount,
      }
    }

    // Real diffs exist: merge if local fits, upload otherwise
    if (localCount <= maxSyncRecords) {
      return {
        decision: {
          action: 'merge-remote',
          mergedRecords: localRecords,
          remoteOptions,
          mergedCount: 0,
        },
        localCount,
        remoteCount,
      }
    }

    return {
      decision: {
        action: 'upload-local',
        localRecords,
        localOptions,
        userId,
      },
      localCount,
      remoteCount,
    }
  }

  // Branch 2: Only remote data
  if (!hasLocalData && hasRemoteData) {
    const profileChanged = localProfile && remoteProfile
      ? detectProfileChanges(localProfile, remoteProfile).changed
      : false
    if (!profileChanged && !optionsChanged) {
      return {
        decision: { action: 'noop', reason: 'Remote data unchanged' },
        localCount,
        remoteCount,
      }
    }
    return {
      decision: {
        action: 'use-remote-only',
        remoteRecords,
        remoteOptions,
        remoteProfile,
      },
      localCount,
      remoteCount,
    }
  }

  // Branch 3: Only local data
  if (hasLocalData && !hasRemoteData) {
    return {
      decision: {
        action: 'upload-local',
        localRecords,
        localOptions,
        userId,
      },
      localCount,
      remoteCount,
    }
  }

  // Branch 4: No data at all
  return {
    decision: { action: 'noop', reason: 'No data to sync' },
    localCount: 0,
    remoteCount: 0,
  }
}

// ── Conflict resolution ────────────────────────────

export function executeConflictStrategy(
  strategy: 'local' | 'remote' | 'merge',
  localData: {
    records: PracticeRecord[]
    options: PracticeOption[]
    profile: UserProfile | null
  },
  remoteData: {
    records: PracticeRecord[]
    options: PracticeOption[]
    profile: UserProfile | null
  },
): {
  resolvedRecords: PracticeRecord[]
  resolvedOptions: PracticeOption[]
  resolvedProfile: UserProfile | null
} {
  switch (strategy) {
    case 'local':
      return {
        resolvedRecords: localData.records,
        resolvedOptions: localData.options,
        resolvedProfile: null,
      }
    case 'remote':
      return {
        resolvedRecords: remoteData.records,
        resolvedOptions: remoteData.options,
        resolvedProfile: remoteData.profile,
      }
    case 'merge': {
      // 计算差异，然后智能合并
      const { localOnly, remoteOnly, localNewer, remoteNewer } = diffRecords(
        localData.records,
        remoteData.records,
      )
      // 需要上传的记录 = localOnly + localNewer
      const result = computeSmartMergeData(
        localData.records, localData.options, localData.profile,
        remoteOnly, remoteNewer,
        remoteData.options, remoteData.profile,
      )
      return {
        resolvedRecords: result.records,
        resolvedOptions: result.options,
        resolvedProfile: result.profile,
        // 注意：toUpload 由调用方计算（localOnly + localNewer 的简单合并）
      }
    }
  }
}

// ── Stats ──────────────────────────────────────────

export function computeSyncStats(records: PracticeRecord[]): SyncStats {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    totalPractices: records.length,
    recentMonthsTotal: records.filter(
      (r) => new Date(r.date || r.created_at) >= threeMonthsAgo,
    ).length,
    thisMonthTotal: records.filter(
      (r) => new Date(r.date || r.created_at) >= thisMonthStart,
    ).length,
  }
}

// ── Conflict execution dependencies ───────────────

export interface ConflictDeps {
  downloadRemoteData: (userId: string) => Promise<RemoteSyncData | null>
  uploadLocalData: (userId: string, localData: { records: PracticeRecord[]; options: PracticeOption[]; profile: UserProfile }, user: any) => Promise<{ success: boolean; localOnlyCount?: number; syncedCount?: number; totalCount?: number }>
  uploadLocalRecords: (userId: string, records: PracticeRecord[], options?: PracticeOption[]) => Promise<{ success: boolean; localOnlyCount?: number }>
  repoDeleteAllUserRecords: (userId: string) => Promise<{ error: any }>
  repoDeleteAllUserOptions: (userId: string) => Promise<{ error: any }>
  onSyncComplete: (data: { records: PracticeRecord[]; options: PracticeOption[]; profile: UserProfile | null }) => void
  addLog: (action: string, status: string, recordId?: string, error?: string, details?: unknown, extra?: unknown) => void
}

export type RemoteSyncData = {
  records: PracticeRecord[]
  options: PracticeOption[]
  profile: UserProfile
}

/**
 * 智能合并：将本地与云端记录合并，上传本地独有/更新的记录。
 * 已在同步编排器中使用 executeConflictStrategy('merge') 计算合并结果后调用。
 */
export async function smartMerge(
  localOnly: PracticeRecord[],
  remoteOnly: PracticeRecord[],
  localNewer: PracticeRecord[],
  remoteNewer: PracticeRecord[],
  remoteData: RemoteSyncData,
  userId: string,
  localData: { records: PracticeRecord[]; options: PracticeOption[]; profile: UserProfile },
  deps: Pick<ConflictDeps, 'uploadLocalRecords' | 'onSyncComplete' | 'addLog'>,
): Promise<void> {
  const { records, options, profile } = computeSmartMergeData(
    localData.records, localData.options, localData.profile,
    remoteOnly, remoteNewer,
    remoteData.options, remoteData.profile,
  )

  const toUpload = [...localOnly, ...localNewer]
  const downloadCount = remoteOnly.length + remoteNewer.length
  if (downloadCount > 0) {
    deps.addLog(`下载${downloadCount}条云端记录（新增${remoteOnly.length}，更新${remoteNewer.length}）`, 'success')
  }

  deps.onSyncComplete({ records, options, profile })

  if (toUpload.length > 0) {
    deps.addLog(`上传${toUpload.length}条本地记录（新增${localOnly.length}，更新${localNewer.length}）`, 'success')
    const result = await deps.uploadLocalRecords(userId, toUpload, localData.options)
    if (!result.success) {
      throw new Error('上传本地记录失败')
    }
  }
}

/**
 * 执行冲突解决的三分支（remote / local / merge）
 * 返回 success 状态，调用方处理 React state。
 */
export async function resolveConflict(
  strategy: 'local' | 'remote' | 'merge',
  userId: string,
  user: any,
  localData: { records: PracticeRecord[]; options: PracticeOption[]; profile: UserProfile },
  deps: ConflictDeps,
): Promise<{ success: boolean; error?: string }> {
  try {
    const remoteData = await deps.downloadRemoteData(userId)
    if (!remoteData) {
      return { success: false, error: '下载云端数据失败' }
    }

    const localCount = localData.records.length
    const remoteCount = remoteData.records.length

    switch (strategy) {
      case 'remote': {
        deps.addLog('冲突解决：选择云端数据覆盖本地', 'success', undefined, undefined, undefined, {
          triggerReason: '用户手动选择云端',
          localCount,
          remoteCount,
        })

        const remoteProfile = buildCompleteProfile(remoteData.profile)

        deps.onSyncComplete({
          records: remoteData.records,
          options: remoteData.options || [],
          profile: remoteProfile,
        })
        localStorage.setItem('ashtanga_records', JSON.stringify(remoteData.records))
        localStorage.setItem('ashtanga_options', JSON.stringify(remoteData.options || []))
        return { success: true }
      }

      case 'local': {
        deps.addLog('冲突解决：选择本地数据覆盖云端', 'success', undefined, undefined, undefined, {
          triggerReason: '用户手动选择本地',
          localCount,
          remoteCount,
        })

        const { error: deleteError } = await deps.repoDeleteAllUserRecords(userId)
        if (deleteError) {
          return { success: false, error: `删除云端数据失败: ${deleteError.message}` }
        }

        const { error: deleteOptionsError } = await deps.repoDeleteAllUserOptions(userId)
        if (deleteOptionsError) {
          return { success: false, error: `删除云端选项失败: ${deleteOptionsError.message}` }
        }

        deps.addLog('云端数据已清空', 'success')

        const result = await deps.uploadLocalData(userId, localData, user)
        if (!result.success) {
          return { success: false, error: '上传本地数据失败' }
        }
        return { success: true }
      }

      case 'merge': {
        deps.addLog('冲突解决：智能合并', 'success', undefined, undefined, undefined, {
          triggerReason: '用户手动选择合并',
          localCount,
          remoteCount,
        })

        const { localOnly, remoteOnly, localNewer, remoteNewer } = diffRecords(localData.records, remoteData.records)
        await smartMerge(localOnly, remoteOnly, localNewer, remoteNewer, remoteData, userId, localData, deps)
        return { success: true }
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

export function recordPracticeIfNeeded(): void {
  try {
    const uuid = typeof window !== 'undefined' ? localStorage.getItem('ashtanga_uuid') : null
    if (!uuid || typeof window === 'undefined') return

    const recordsStr = localStorage.getItem('ashtanga_records')
    if (!recordsStr) return

    const records: PracticeRecord[] = JSON.parse(recordsStr)
    if (!records.length) return

    const beijingNow = new Date(Date.now() + 8 * 3600 * 1000)
    const today = beijingNow.toISOString().slice(0, 10)
    const practicedToday = records.some((r) => r.date === today)
    if (practicedToday) {
      fetch('/api/stats/record-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      }).catch(() => {})
    }
  } catch {
    // Ignore
  }
}
