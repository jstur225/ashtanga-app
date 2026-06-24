/**
 * reset-test-account.ts — L5 测试账号数据重置
 *
 * 用途：被 vitest 的 beforeAll/afterAll 引用，在每项 L5 测试前后清空账号数据，
 *      保证测试间隔离。
 *
 * 安全设计：
 *   - 严格 WHERE user_id = $userId，绝不影响其他用户
 *   - 使用已登录的 anon client 删除（因其 RLS 策略允许用户删自己的数据）
 *   - 不删 auth.users 本身，保留账号本身和入门会籍以便复用
 *   - 按 FK 依赖顺序删除（photos → calendar_annotations → practice_records
 *     → practice_options → annotation_types → user_memberships → user_profiles）
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/** 按 FK 依赖顺序排列的表名（先删引用者，再删被引用者） */
const TABLES_IN_DELETE_ORDER = [
  'photos',
  'practice_records',
  'practice_options',
  'annotation_types',
  'user_memberships',
  'user_profiles',
] as const

export interface ResetResult {
  success: boolean
  userId: string
  deletedCounts: Record<string, number>
  /** 失败的表名列表 */
  failedTables: string[]
}

/**
 * 清空指定 userId 的所有业务数据。
 *
 * 重要：不使用 service_role key（Supabase 某些表有 FORCE RLS），
 * 而是接受一个已登录的 anon client，利用用户 RLS 策略删自己的数据。
 *
 * @param supabase 已通过 signInWithPassword 认证的 supabase 客户端
 * @param userId 目标用户 UUID
 */
export async function resetTestAccountByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResetResult> {
  const result: ResetResult = {
    success: true,
    userId,
    deletedCounts: {},
    failedTables: [],
  }

  for (const table of TABLES_IN_DELETE_ORDER) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)

    if (error) {
      result.failedTables.push(table)
      result.deletedCounts[table] = -1
      console.warn(`[reset] ⚠️ ${table} 删除失败: ${error.message}`)
    } else {
      result.deletedCounts[table] = 0
    }
  }

  return result
}
