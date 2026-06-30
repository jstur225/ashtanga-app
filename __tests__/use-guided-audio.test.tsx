import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const cache = vi.hoisted(() => ({
  isCacheValid: vi.fn(),
  getAudioBuffer: vi.fn(),
  clearCache: vi.fn(),
  downloadAndCache: vi.fn(),
}))

vi.mock("@/lib/audioCache", () => ({ audioCache: cache }))

import { shouldShowPracticeControls, useGuidedAudio } from "@/hooks/useGuidedAudio"

class AudioMock {
  static instances: AudioMock[] = []
  src = ""
  duration = 100
  currentTime = 0
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  listeners = new Map<string, Array<() => void>>()

  constructor(src?: string) {
    if (src) this.src = src
    AudioMock.instances.push(this)
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener())
  }
}

describe("useGuidedAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AudioMock.instances = []
    vi.stubGlobal("Audio", AudioMock)
    cache.isCacheValid.mockResolvedValue(false)
    cache.downloadAndCache.mockResolvedValue(new ArrayBuffer(1))
  })

  it("流式加载期间拒绝重复启动，元数据就绪后恢复练习", async () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => useGuidedAudio({
      source: "/audio/test.m4a",
      onReady,
      onEnded: vi.fn(),
    }))

    let first = false
    let second = true
    await act(async () => { first = await result.current.load() })
    await act(async () => { second = await result.current.load() })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(AudioMock.instances).toHaveLength(1)
    act(() => { AudioMock.instances[0].emit("loadedmetadata") })
    expect(result.current.isLoaded).toBe(true)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(AudioMock.instances[0].play).toHaveBeenCalledTimes(1)
  })

  it("播放失败后恢复普通计时并保留可重试错误", async () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => useGuidedAudio({
      source: "/audio/test.m4a",
      onReady,
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })
    act(() => { AudioMock.instances[0].emit("error") })

    expect(result.current.error).toContain("网络连接")
    expect(result.current.isLoading).toBe(false)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it("音频事件使用最新的会话回调，避免捕获启动前状态", async () => {
    const initialReady = vi.fn()
    const latestReady = vi.fn()
    const { result, rerender } = renderHook(
      ({ onReady }) => useGuidedAudio({ source: "/audio/test.m4a", onReady, onEnded: vi.fn() }),
      { initialProps: { onReady: initialReady } },
    )

    await act(async () => { await result.current.load() })
    rerender({ onReady: latestReady })
    act(() => { AudioMock.instances[0].emit("loadedmetadata") })

    expect(initialReady).not.toHaveBeenCalled()
    expect(latestReady).toHaveBeenCalledTimes(1)
  })

  it("快进后退限制在音频边界内，重置时释放媒体", async () => {
    const { result } = renderHook(() => useGuidedAudio({
      source: "/audio/test.m4a",
      onReady: vi.fn(),
      onEnded: vi.fn(),
    }))
    await act(async () => { await result.current.load() })
    const audio = AudioMock.instances[0]
    act(() => { audio.emit("loadedmetadata") })

    audio.currentTime = 95
    act(() => { result.current.seek("forward") })
    expect(audio.currentTime).toBe(100)
    audio.currentTime = 5
    act(() => { result.current.seek("backward") })
    expect(audio.currentTime).toBe(0)

    act(() => { result.current.reset() })
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.src).toBe("")
    expect(result.current.isLoaded).toBe(false)
  })

  it("音频失败时保留普通计时控制", () => {
    expect(shouldShowPracticeControls("guided_audio", false, true, null)).toBe(false)
    expect(shouldShowPracticeControls("guided_audio", false, false, "音频失败")).toBe(true)
    expect(shouldShowPracticeControls("guided_audio", true, false, null)).toBe(true)
    expect(shouldShowPracticeControls("primary", false, false, null)).toBe(true)
  })
})
