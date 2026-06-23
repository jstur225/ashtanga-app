import { describe, it, expect, vi } from 'vitest'
import { batchUploadRecords } from '@/lib/sync-utils'

interface TestRecord {
  id: string
  name: string
}

describe('batchUploadRecords with retry', () => {
  it('全部成功时返回全成功', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null })
    const records: TestRecord[] = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]

    const result = await batchUploadRecords(records, upsertFn, 2)
    expect(result.successCount).toBe(2)
    expect(result.failedIds).toEqual([])
    expect(result.lastError).toBeNull()
  })

  it('临时失败后重试成功', async () => {
    const mockUpsert = vi.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValue({ error: null })

    const records: TestRecord[] = [{ id: '1', name: 'a' }]

    const result = await batchUploadRecords(records, mockUpsert, 2)
    expect(result.successCount).toBe(1)
    expect(result.failedIds).toEqual([])
    expect(mockUpsert).toHaveBeenCalledTimes(2) // 1 次初始 + 1 次重试
  })

  it('重试耗尽后记录为失败', async () => {
    const mockError = new Error('持续错误')
    const mockUpsert = vi.fn().mockRejectedValue(mockError)

    const records: TestRecord[] = [{ id: '1', name: 'a' }]

    const result = await batchUploadRecords(records, mockUpsert, 2)
    expect(result.successCount).toBe(0)
    expect(result.failedIds).toEqual(['1'])
    expect(result.lastError).toBe(mockError)
  })

  it('多批中只失败一批', async () => {
    const mockUpsert = vi.fn().mockImplementation(async (batch: TestRecord[]) => {
      // 让第一批失败，第二批成功
      if (batch[0].id === '1' || batch[0].id === '2') throw new Error('第一批错误')
      return { error: null }
    })

    const records: TestRecord[] = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
      { id: '4', name: 'd' },
    ]

    const result = await batchUploadRecords(records, mockUpsert, 2)
    // 第一批 2 条重试耗尽后失败，第二批 2 条成功
    expect(result.successCount).toBe(2)
    expect(result.failedIds).toEqual(['1', '2'])
  })
})
