import { supabase, TABLES } from '@/lib/supabase'

/**
 * Supabase 远端仓库层
 *
 * 把 useSync 中分散的 Supabase 调用集中为 I/O 原语：
 * - 每个函数只做一次 RPC（查询/写入/删除），返回 `{ data, error }` 风格。
 * - 不做业务决策：不重试、不分批、不安全合并、不归一化。
 * - 调用方（useSync）负责重试、超时编排、批量分片、日志和状态管理。
 *
 * 设计原则：
 * - 纯 I/O，无副作用，不访问 React 状态或 console。
 * - 失败信息透传给调用方判断。
 * - 单一查询超时（30s）由 `withQueryTimeout` 提供，可在调用方包装。
 */

const DEFAULT_QUERY_TIMEOUT_MS = 30_000

/**
 * 给单个查询加超时保护，超时后 reject。
 * 与原 useSync 内联 `queryWithTimeout` 行为等价。
 */
export function withQueryTimeout<T>(
  queryName: string,
  queryFn: () => PromiseLike<T>,
  timeoutMs = DEFAULT_QUERY_TIMEOUT_MS,
): Promise<T> {
  const startTime = Date.now()
  const queryPromise = Promise.resolve(queryFn())
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime
      reject(new Error(`${queryName} 查询超时 (${elapsed}ms)`))
    }, timeoutMs)
  })
  return Promise.race([queryPromise, timeoutPromise])
}

/**
 * 并发拉取用户全部同步数据（记录、选项、资料），每个查询独立带超时。
 *
 * 返回原始结果（含 error），由调用方处理错误和归一化。
 * PGRST116 表示 profile 未找到，由调用方决定是否忽略。
 *
 * 注：返回类型保持 any 风格（与原 useSync 内联实现一致），
 * 因为调用方 downloadRemoteData 会用 mapRemoteRecord 做归一化。
 */
export async function fetchAllUserData(userId: string): Promise<{
  recordsRes: any
  optionsRes: any
  profileRes: any
}> {
  const [recordsRes, optionsRes, profileRes] = await Promise.all([
    withQueryTimeout('记录', () =>
      supabase
        .from(TABLES.PRACTICE_RECORDS)
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .neq('type', '草稿'),
    ),
    withQueryTimeout('选项', () =>
      supabase
        .from(TABLES.PRACTICE_OPTIONS)
        .select('*')
        .eq('user_id', userId),
    ),
    withQueryTimeout('资料', () =>
      supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ),
  ])

  return { recordsRes, optionsRes, profileRes }
}

/**
 * 安全合并所需的云端记录字段。
 * 仅用于 uploadLocalRecords / uploadLocalData 的上传前合并检查。
 */
export type CloudRecordForMerge = {
  id: string
  notes: string | null
  breakthrough: string | null
  photos: string[] | null
  duration: number | null
  updated_at: string | null
}

/**
 * 按 ID 查询云端记录的合并用字段（用于上传前安全合并）。
 * 只取合并判断需要的字段，避免传输整条记录。
 */
export async function fetchCloudRecordsForMerge(ids: string[]): Promise<{
  data: CloudRecordForMerge[] | null
  error: any
}> {
  if (ids.length === 0) return { data: [], error: null }
  const res = await supabase
    .from(TABLES.PRACTICE_RECORDS)
    .select('id, notes, breakthrough, photos, duration, updated_at')
    .in('id', ids)
  const rawData = (res.data as unknown as CloudRecordForMerge[]) ?? null
  // 过滤无效记录（无 id 或 id 不是字符串）
  const data = rawData
    ? rawData.filter((r) => r && typeof r.id === 'string')
    : null
  return { data, error: res.error }
}

/**
 * 单次 upsert 记录（不分批）。
 * 调用方负责分批和批量上限。
 */
export async function upsertRecords(records: Record<string, unknown>[]) {
  return supabase
    .from(TABLES.PRACTICE_RECORDS)
    .upsert(records, { onConflict: 'id' })
    .select()
}

/**
 * 单次 upsert 选项。
 */
export async function upsertOptions(options: Record<string, unknown>[]) {
  return supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .upsert(options, { onConflict: 'id' })
}

/**
 * 删除用户全部记录（用于冲突策略 'local'）。
 */
export async function deleteAllUserRecords(userId: string) {
  return supabase
    .from(TABLES.PRACTICE_RECORDS)
    .delete()
    .eq('user_id', userId)
}

/**
 * 删除用户全部选项（用于冲突策略 'local'）。
 */
export async function deleteAllUserOptions(userId: string) {
  return supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .delete()
    .eq('user_id', userId)
}
