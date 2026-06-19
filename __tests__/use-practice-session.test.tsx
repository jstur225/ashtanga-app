import React from "react"
import { act, render, renderHook } from "@testing-library/react"
import { renderToString } from "react-dom/server"
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
  it("使用真实 hydration 从恢复壳切换到持久会话且不产生 mismatch", () => {
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.isPracticing, 'true')
    localStorage.setItem(PRACTICE_SESSION_STORAGE_KEYS.startTime, '1000')

    function SessionSurface() {
      const session = usePracticeSession() as ReturnType<typeof usePracticeSession> & { isHydrated?: boolean }
      if (!session.isHydrated) return <div>恢复中</div>
      return <div>{session.isPracticing ? '计时中' : '练习首页'}</div>
    }

    const serverHtml = renderToString(<SessionSurface />)
    expect(serverHtml).toContain("恢复中")

    const container = document.createElement("div")
    container.innerHTML = serverHtml
    document.body.appendChild(container)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const view = render(<SessionSurface />, { container, hydrate: true })

    expect(view.getByText("计时中")).toBeTruthy()
    expect(consoleError.mock.calls.flat().join("\n")).not.toContain("Hydration failed")
    consoleError.mockRestore()
  })

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

  it("口令练习可直接以暂停状态启动，音频就绪后再恢复", () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => { result.current.start(true, 1_000, { optionId: "guided_audio", label: "一序列", notes: "口令" }) })

    expect(result.current.isPracticing).toBe(true)
    expect(result.current.isPaused).toBe(true)

    act(() => { result.current.resume(2_000) })
    expect(result.current.isPracticing).toBe(true)
    expect(result.current.isPaused).toBe(false)
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

  it("立即结束时生成 0 分钟完成记录", () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => { result.current.start(false, 1_000) })
    act(() => { result.current.confirmEnd() })

    expect(result.current.finalDuration).toBe("0")
    expect(result.current.showCompletion).toBe(true)
  })

  it("开始时持久化练习类型快照，刷新后不依赖选项列表恢复", () => {
    const context = { optionId: "primary-id", label: "一序列", notes: "Mysore" }
    const first = renderHook(() => usePracticeSession())
    act(() => { (first.result.current.start as Function)(false, 1_000, context) })
    first.unmount()

    const restored = renderHook(() => usePracticeSession())
    expect((restored.result.current as typeof restored.result.current & { activePractice?: unknown }).activePractice).toEqual(context)
  })

  it("LocalStorage 损坏时回退到安全的空会话", () => {
    Object.values(PRACTICE_SESSION_STORAGE_KEYS).forEach((key) => {
      localStorage.setItem(key, "not-json")
    })

    const { result } = renderHook(() => usePracticeSession())

    expect(result.current.isHydrated).toBe(true)
    expect(result.current.isPracticing).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.startTime).toBeNull()
    expect(result.current.activePractice).toBeNull()
  })
})
