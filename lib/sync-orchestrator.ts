import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'
import { applySafeMerge, detectOptionChanges, detectProfileChanges } from './sync-utils'
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
      return {
        resolvedRecords: localData.records,
        resolvedOptions: localData.options,
        resolvedProfile: null,
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

// ── Finally block ──────────────────────────────────

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
