/**
 * 同步重试工具
 *
 * 提供通用指数退避重试包装器，供 upload/download/autoSync 共用。
 * 重试代数 = baseDelay * 2^attempt（1s, 2s），最大 3 次尝试（1 初 + 2 重试）。
 * 匹配 downloadRemoteData 的现有行为。
 */

export interface RetryOptions {
  /** 最多重试次数（默认 2，即总计 3 次尝试） */
  maxRetries?: number
  /** 基础延迟 ms（默认 1000） */
  baseDelay?: number
  /** 每次重试前的回调 */
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * 用指数退避重试执行异步函数。
 *
 * @example
 * ```ts
 * const result = await withRetry(() => fetchData(), { maxRetries: 2 })
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelay = 1000, onRetry } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        onRetry?.(attempt + 1, lastError)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError ?? new Error('Retry exhausted')
}

/**
 * 持久化失败的记录 ID 到 LocalStorage，供下次同步重试。
 */
const FAILED_IDS_KEY = 'failed_sync_ids'

export function persistFailedSyncIds(ids: string[]): void {
  try {
    if (ids.length === 0) {
      localStorage.removeItem(FAILED_IDS_KEY)
    } else {
      localStorage.setItem(FAILED_IDS_KEY, JSON.stringify(ids))
    }
  } catch {
    // Storage full or unavailable — safe to ignore
  }
}

export function loadFailedSyncIds(): string[] {
  try {
    const raw = localStorage.getItem(FAILED_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
