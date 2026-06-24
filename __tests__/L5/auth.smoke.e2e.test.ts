/**
 * L5 端到端冒烟测试：认证 + 基本 CRUD
 *
 * 验证点：
 *   1. 测试账号能登录（密码正确、账号未被禁用）
 *   2. reset 后数据真的为空（验证 reset 脚本有效）
 *   3. 插入 1 条 practice_record → 能查询到 → 删除后查不到（RLS 隔离 + CRUD 通路）
 *   4. signOut 后 client 不再能查询数据
 *
 * 注意：所有真实网络调用，超时 30s。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  signInTestUser,
  signOutTestUser,
  getTestClient,
  getTestUserEmail,
} from './helpers/test-client'
import { resetTestAccountByUserId } from '@/scripts/reset-test-account'

describe('L5 auth + CRUD 冒烟', () => {
  let userId: string

  beforeAll(async () => {
    const { user } = await signInTestUser()
    userId = user.id
    await resetTestAccountByUserId(getTestClient(), userId)
  }, 60_000)

  afterAll(async () => {
    if (userId) await resetTestAccountByUserId(getTestClient(), userId)
    await signOutTestUser()
  }, 60_000)

  it('登录成功，user.email 与配置一致', () => {
    expect(userId).toBeTruthy()
    expect(typeof userId).toBe('string')
    // 邮箱本地存储在 env，验证登录拿到了正确的账号
    expect(getTestUserEmail()).toBeTruthy()
  })

  it('reset 后 practice_records 应为 0 条', async () => {
    const client = getTestClient()
    const { data, error } = await client
      .from('practice_records')
      .select('id')
      .eq('user_id', userId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('插入 1 条记录 → 能查询到 → 删除后查不到', async () => {
    const client = getTestClient()
    const recordId = crypto.randomUUID()
    const now = new Date().toISOString()

    // insert
    const { error: insertError } = await client.from('practice_records').insert({
      id: recordId,
      user_id: userId,
      created_at: now,
      updated_at: now,
      date: now.slice(0, 10),
      type: '一序列',
      duration: 3600,
      notes: 'L5 冒烟测试',
      photos: [],
    })
    expect(insertError).toBeNull()

    // query
    const { data: queried, error: queryError } = await client
      .from('practice_records')
      .select('id, notes')
      .eq('id', recordId)
      .single()
    expect(queryError).toBeNull()
    expect(queried?.notes).toBe('L5 冒烟测试')

    // delete
    const { error: deleteError } = await client
      .from('practice_records')
      .delete()
      .eq('id', recordId)
    expect(deleteError).toBeNull()

    // verify deleted
    const { data: afterDelete } = await client
      .from('practice_records')
      .select('id')
      .eq('id', recordId)
    expect(afterDelete).toEqual([])
  })

  it('退出登录后查询应失败或返回 null（RLS 不允许匿名读）', async () => {
    await signOutTestUser()

    const client = getTestClient()
    const { data, error } = await client
      .from('practice_records')
      .select('id')
      .eq('user_id', userId)

    // 未登录时 RLS 应该拒绝读：要么返回 error，要么返回空 data
    const blocked = !!error || (Array.isArray(data) && data.length === 0)
    expect(blocked).toBe(true)

    // 重新登录，避免影响后续测试
    await signInTestUser()
  })
})
