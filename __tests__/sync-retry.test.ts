import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, persistFailedSyncIds, loadFailedSyncIds } from '@/lib/sync-retry'

// ── withRetry ───────────────────────────────────────

describe('withRetry', () => {
  it('成功时直接返回结果，不重试', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('失败后重试指定次数后成功', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValue('最终成功')

    const result = await withRetry(fn, { maxRetries: 2, baseDelay: 10 })
    expect(result).toBe('最终成功')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('重试耗尽后抛出最后一次错误', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('持续错误'))

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow('持续错误')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('使用指数退避延迟', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('错误'))
    const start = Date.now()

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 50 })).rejects.toThrow()
    const elapsed = Date.now() - start

    // baseDelay * (1 + 2) = 50 + 100 = 至少 150ms
    expect(elapsed).toBeGreaterThanOrEqual(140)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('maxRetries=0 时不重试', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('错误'))

    await expect(withRetry(fn, { maxRetries: 0, baseDelay: 10 })).rejects.toThrow('错误')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('触发 onRetry 回调', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('错误'))
    const onRetry = vi.fn()

    await expect(withRetry(fn, { maxRetries: 1, baseDelay: 10, onRetry })).rejects.toThrow()
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })
})

// ── persistFailedSyncIds / loadFailedSyncIds ─────────

describe('persistFailedSyncIds / loadFailedSyncIds', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('存入后可以正确读取', () => {
    persistFailedSyncIds(['id1', 'id2', 'id3'])
    expect(loadFailedSyncIds()).toEqual(['id1', 'id2', 'id3'])
  })

  it('空数组清除存储', () => {
    persistFailedSyncIds(['id1'])
    persistFailedSyncIds([])
    expect(loadFailedSyncIds()).toEqual([])
  })

  it('损坏数据返回空数组', () => {
    localStorage.setItem('failed_sync_ids', '不是合法JSON')
    expect(loadFailedSyncIds()).toEqual([])
  })

  it('不存在时返回空数组', () => {
    expect(loadFailedSyncIds()).toEqual([])
  })
})
