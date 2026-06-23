import type { UserProfile } from '@/lib/supabase'

/**
 * 同步层字段映射与归一化纯函数
 *
 * 这些函数把远端 Supabase 返回的"原始数据"（可能含 JSON 字符串、缺失字段、
 * 旧版脏数据）归一化为强类型领域模型，供 useSync 的下载、上传、冲突决策使用。
 *
 * 设计原则：
 * - 纯函数，无副作用，不访问 Supabase 或 LocalStorage
 * - 不改变冲突决策（local/remote/merge）和 I/O 行为
 * - 调用点的输入输出完全等价于原内联实现
 */

export type RemoteProfileInput = Partial<UserProfile> | null | undefined

export const DEFAULT_PROFILE_NAME = '阿斯汤加习练者'
export const DEFAULT_PROFILE_SIGNATURE = '练习、练习，一切随之而来。'

/**
 * 把远端 photos 字段归一化为 string[]。
 * 兼容历史格式：JSON 字符串、数组、null、非法值。
 */
export function parseRemotePhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) {
    return photos.filter((item): item is string => typeof item === 'string')
  }
  if (typeof photos !== 'string' || !photos) return []
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

/**
 * 把不完整的 profile 对象补全为完整 UserProfile。
 * 缺失字段使用默认值。
 */
export function buildCompleteProfile(remoteProfile: RemoteProfileInput): UserProfile {
  const now = new Date().toISOString()
  return {
    id: remoteProfile?.id || '',
    user_id: remoteProfile?.user_id || '',
    created_at: remoteProfile?.created_at || now,
    updated_at: remoteProfile?.updated_at || remoteProfile?.created_at || now,
    name: remoteProfile?.name || DEFAULT_PROFILE_NAME,
    signature: remoteProfile?.signature || DEFAULT_PROFILE_SIGNATURE,
    avatar: remoteProfile?.avatar || null,
    phone: remoteProfile?.phone,
    historical_days: remoteProfile?.historical_days || 0,
    historical_avg_minutes: remoteProfile?.historical_avg_minutes || 0,
  }
}

/**
 * 把远端记录归一化：保留所有字段，把 photos 字段统一转为 string[]。
 */
export function mapRemoteRecord<T extends object>(raw: T): Omit<T, 'photos'> & { photos: string[] } {
  return {
    ...raw,
    photos: parseRemotePhotos((raw as { photos?: unknown }).photos),
  }
}

/**
 * 判断远端选项是否有效。
 * 无效标准：缺 id，或同时缺 label 和 notes（兼容历史脏数据）。
 */
export function isValidRemoteOption(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const option = raw as Record<string, unknown>
  return Boolean(
    option.id &&
    (option.label || option.notes)
  )
}

/**
 * 把远端 profile 映射为 UserProfile。
 *
 * 与 buildCompleteProfile 的区别：
 * - name 为纯数字（旧版脏数据）时，回退到 DEFAULT_PROFILE_NAME。
 * - 这是 downloadRemoteData 的历史兼容逻辑，buildCompleteProfile 在其他路径
 *   （conflict、merge）仍保持原行为，避免引入行为变化。
 */
export function mapRemoteProfile(raw: RemoteProfileInput): UserProfile {
  const profile = buildCompleteProfile(raw)
  if (typeof profile.name === 'string' && /^\d+$/.test(profile.name)) {
    return { ...profile, name: DEFAULT_PROFILE_NAME }
  }
  return profile
}
