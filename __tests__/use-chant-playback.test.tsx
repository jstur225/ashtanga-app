import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useChantPlayback } from "@/hooks/useChantPlayback"

class ChantAudioMock {
  static instances: ChantAudioMock[] = []
  src = ""
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  listeners = new Map<string, Array<() => void>>()

  constructor(src?: string) {
    if (src) this.src = src
    ChantAudioMock.instances.push(this)
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener())
  }
}

describe("useChantPlayback", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ChantAudioMock.instances = []
    vi.stubGlobal("Audio", ChantAudioMock)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("倒计时可跳过并立即播放唱诵", () => {
    const onStart = vi.fn()
    const { result } = renderHook(() => useChantPlayback({
      delaySeconds: 2,
      onStart,
      onFinished: vi.fn(),
      onError: vi.fn(),
    }))
    const context = { optionId: "primary", label: "一序列", notes: "Mysore" }

    act(() => { result.current.start(context) })
    expect(result.current.isCountdown).toBe(true)
    expect(result.current.countdown).toBe(2)
    expect(onStart).toHaveBeenCalledWith(context, expect.any(Number))

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.countdown).toBe(1)
    act(() => { result.current.skip() })
    expect(result.current.isPlaying).toBe(true)
    expect(ChantAudioMock.instances).toHaveLength(1)
  })

  it("ended/error 重复到达也只完成一次练习", () => {
    const onFinished = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChantPlayback({
      delaySeconds: 0,
      onStart: vi.fn(),
      onFinished,
      onError,
    }))

    act(() => { result.current.start({ optionId: "primary", label: "一序列", notes: "" }) })
    const audio = ChantAudioMock.instances[0]
    act(() => {
      audio.emit("ended")
      audio.emit("error")
    })

    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(false)
  })

  it("重置时停止倒计时和正在播放的资源", () => {
    const { result } = renderHook(() => useChantPlayback({
      delaySeconds: 0,
      onStart: vi.fn(),
      onFinished: vi.fn(),
      onError: vi.fn(),
    }))
    act(() => { result.current.start({ optionId: "primary", label: "一序列", notes: "" }) })
    const audio = ChantAudioMock.instances[0]

    act(() => { result.current.reset() })
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.src).toBe("")
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.countdown).toBe(0)
  })
})
