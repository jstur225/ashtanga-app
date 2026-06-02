import type { PracticeRecord, UserProfile } from '@/lib/supabase'

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
 * 色阶等级 → CSS class 映射
 * level 1=最浅绿, 2=浅绿, 3=中绿(默认), 4=深绿, 5=最深
 */
export function getColorClass(level: number): string {
  if (level === 1) return 'green-gradient-1'
  if (level === 2) return 'green-gradient-2'
  if (level === 4) return 'green-gradient-4'
  if (level === 5) return 'green-gradient-5'
  return 'green-gradient-3' // level 3 或 undefined
}
