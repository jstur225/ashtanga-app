import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 确保用户有 profile 记录，返回 profileId
 * 从 activate/route.ts 提取的共享函数
 */
export async function ensureProfileAndGetId(
  supabase: SupabaseClient,
  user: { id: string; email?: string },
): Promise<string> {
  const { data: userProfile, error: queryError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (queryError) {
    throw new Error('查询 profile 失败: ' + queryError.message)
  }

  if (userProfile) {
    return userProfile.id
  }

  // 不存在则创建
  const now = new Date()
  const { data, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      name: user.email?.split('@')[0] || '用户',
      signature: '',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !data) {
    throw new Error('创建 profile 失败: ' + (insertError?.message || '未知错误'))
  }

  return data.id
}
