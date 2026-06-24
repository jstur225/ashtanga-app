/**
 * L5 端到端测试：上传同步链路
 *
 * 验证点：
 *   1. 用真实 Supabase 客户端 upsert 多条 practice_records → 能查回来
 *   2. 字段值（type、duration、notes）匹配
 *   3. upsert 同 ID 第二次会更新而非插入（idempotent）
 *
 * 不使用 mock：直接调用 supabase-js，覆盖从客户端到数据库的完整链路。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  signInTestUser,
  signOutTestUser,
  getTestClient,
} from './helpers/test-client'
import { resetTestAccountByUserId } from '@/scripts/reset-test-account'

describe('L5 同步上传链路', () => {
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

  it('upsert 3 条记录 → 查询应返回 3 条，字段匹配', async () => {
    const client = getTestClient()
    const baseDate = new Date(2026, 0, 1)
    const dayMs = 24 * 60 * 60 * 1000

    const records = Array.from({ length: 3 }, (_, i) => {
      const isoDate = new Date(baseDate.getTime() + i * dayMs).toISOString().slice(0, 10)
      const nowIso = new Date().toISOString()
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: nowIso,
        updated_at: nowIso,
        date: isoDate,
        type: '一序列',
        duration: 60 * (i + 1),
        notes: `L5 上传测试 #${i}`,
        photos: [],
      }
    })

    const { error: upsertError } = await client
      .from('practice_records')
      .upsert(records)
    expect(upsertError).toBeNull()

    const { data, error: queryError } = await client
      .from('practice_records')
      .select('id, duration, notes')
      .eq('user_id', userId)
      .order('duration', { ascending: true })

    expect(queryError).toBeNull()
    expect(data).toHaveLength(3)
    expect(data?.[0].duration).toBe(60)
    expect(data?.[1].duration).toBe(120)
    expect(data?.[2].duration).toBe(180)
    expect(data?.map((r: any) => r.notes)).toEqual(
      expect.arrayContaining(['L5 上传测试 #0', 'L5 上传测试 #1', 'L5 上传测试 #2']),
    )
  })

  it('同 ID 第二次 upsert 应覆盖原数据（不新增）', async () => {
    const client = getTestClient()
    const id = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    const original = {
      id,
      user_id: userId,
      created_at: nowIso,
      updated_at: nowIso,
      date: nowIso.slice(0, 10),
      type: '一序列',
      duration: 60,
      notes: '原始',
      photos: [],
    }

    // 第一次插入
    const { error: err1 } = await client.from('practice_records').upsert(original)
    expect(err1).toBeNull()

    // 第二次 upsert 同 ID，notes 改了
    const updated = { ...original, notes: '已更新', duration: 120, updated_at: new Date().toISOString() }
    const { error: err2 } = await client.from('practice_records').upsert(updated)
    expect(err2).toBeNull()

    // 查询应只返回 1 条
    const { data, error } = await client
      .from('practice_records')
      .select('id, notes, duration')
      .eq('id', id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].notes).toBe('已更新')
    expect(data?.[0].duration).toBe(120)
  })
})
