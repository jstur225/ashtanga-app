import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PRACTICE_SESSION_STORAGE_KEYS, usePracticeSession } from "@/hooks/usePracticeSession"

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("usePracticeSession", () => {
  it("使用兼容的 LocalStorage 键开始并持久化会话", () => {
    const { result } = renderHook(() => usePracticeSession())

    act(() => { result.current.start(false, 1_000) })

    expect(result.current.isPracticing).toBe(true)
    expect(JSON.parse(localStorage.getItem(PRACTICE_SESSION_STORAGE_KEYS.isPracticing) || 'false')).toBe(true)
    expect(JSON.parse(localStorage.getItem(PRACTICE_SESSION_STORAGE_KEYS.startTime) || 'null')).toBe(1_000)
  })

  it("刷新挂载时恢复时间戳计时", () => {
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.isPracticing, 'true')
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.isPaused, 'false')
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.startTime, '1000')
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.pauseStartTime, 'null')
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.totalPausedTime, '0')
    vi.setSystemTime(61_000)

    const { result } = renderHook(() => usePracticeSession())
    expect(result.current.elapsedTime).toBe(60)
  })

  it("暂停和恢复不计算暂停期间，并支持多次暂停", () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => { result.current.start(false, 0) })
    act(() => { result.current.pause(10_000) })
    act(() => { result.current.resume(50_000) })
    act(() => { result.current.pause(70_000) })
    act(() => { result.current.resume(80_000) })
    vi.setSystemTime(100_000)
    act(() => { vi.advanceTimersByTime(1_000) })

    expect(result.current.totalPausedTime).toBe(50_000)
    expect(result.current.elapsedTime).toBe(51)
  })

  it("连续开始保持幂等，不覆盖原始开始时间", () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => { result.current.start(false, 1_000) })
    let secondStart = true
    act(() => { secondStart = result.current.start(false, 9_000) })

    expect(secondStart).toBe(false)
    expect(result.current.startTime).toBe(1_000)
  })

  it("确认结束保留完成记录开始时间，放弃则彻底清理", () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => { result.current.start(false, 1_000) })
    act(() => { result.current.requestEnd() })
    act(() => { result.current.confirmEnd() })

    expect(result.current.showCompletion).toBe(true)
    expect(result.current.completedStartTimeRef.current).toBe(1_000)
    expect(result.current.isPracticing).toBe(false)

    act(() => { result.current.discardEnd() })
    expect(result.current.showCompletion).toBe(false)
    expect(result.current.completedStartTimeRef.current).toBeNull()
  })
})
