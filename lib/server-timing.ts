/**
 * 轻量级 Server-Timing 工具。
 *
 * 把服务端各阶段耗时写入 `Server-Timing` 响应头，便于网页端/小程序日志
 * （日志已记录服务端 Request-ID）直接定位慢请求的时间花在哪一段。
 * 只追加响应头、不改响应体，对任何客户端都无行为影响。
 */

export interface TimingMetric {
  name: string
  durationMs: number
}

/** 将指标格式化为 `Server-Timing` 头值，如 `auth;dur=42.5, profile;dur=13.0` */
export function formatServerTiming(metrics: TimingMetric[]): string {
  return metrics
    .filter((m) => m.durationMs >= 0)
    .map((m) => `${m.name};dur=${m.durationMs.toFixed(1)}`)
    .join(', ')
}

/** 简易秒表：执行 fn 并返回结果与耗时（毫秒）。fn 抛错时原样向上抛。 */
export async function timed<T>(
  fn: () => PromiseLike<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now()
  const result = await fn()
  return { result, durationMs: performance.now() - start }
}