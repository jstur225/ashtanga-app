import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const cache = vi.hoisted(() => ({
  isCacheValid: vi.fn(),
  getAudioBuffer: vi.fn(),
  clearCache: vi.fn(),
  downloadAndCache: vi.fn(),
}))

vi.mock("@/lib/audioCache", () => ({ audioCache: cache }))

import { shouldShowPracticeControls, useGuidedAudio } from "@/hooks/useGuidedAudio"

const guidedOptions = {
  source: "/audio/test.m4a",
  cacheKey: "test-audio",
  cacheVersion: "1.0",
}

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
  const recordDiagnostic = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    AudioMock.instances = []
    vi.stubGlobal("Audio", AudioMock)
    cache.isCacheValid.mockResolvedValue(false)
    cache.downloadAndCache.mockResolvedValue(new ArrayBuffer(1))
    ;(window as Window & { __ashtangaRuntimeDiagnostic?: typeof recordDiagnostic })
      .__ashtangaRuntimeDiagnostic = recordDiagnostic
  })

  it("流式加载期间拒绝重复启动，元数据就绪后恢复练习", async () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady,
      onEnded: vi.fn(),
    }))

    let first = false
    let second = true
    await act(async () => { first = await result.current.load() })
    await act(async () => { second = await result.current.load() })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(cache.isCacheValid).toHaveBeenCalledWith("test-audio", "1.0")
    expect(cache.downloadAndCache).toHaveBeenCalledWith(
      "/audio/test.m4a",
      "test-audio",
      "1.0",
      undefined,
      { priority: "low", signal: expect.any(AbortSignal) },
    )
    expect(AudioMock.instances).toHaveLength(1)
    await act(async () => {
      AudioMock.instances[0].emit("loadedmetadata")
      await Promise.resolve()
    })
    expect(result.current.isLoaded).toBe(true)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(AudioMock.instances[0].play).toHaveBeenCalledTimes(1)
  })

  it("播放失败后恢复普通计时并保留可重试错误", async () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady,
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })
    act(() => { AudioMock.instances[0].emit("error") })

    expect(result.current.error).toContain("网络连接")
    expect(result.current.isLoading).toBe(false)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(recordDiagnostic).toHaveBeenCalledWith(
      "guided_audio_playback_error",
      expect.objectContaining({
        cacheKey: "test-audio",
        phase: "media_element",
        source: "/audio/test.m4a",
      }),
    )
  })

  it("浏览器阻止自动播放时保持暂停等待用户继续，不显示音频故障", async () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady,
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })
    const audio = AudioMock.instances[0]
    audio.play.mockRejectedValueOnce(Object.assign(new Error("user activation required"), { name: "NotAllowedError" }))
    await act(async () => {
      audio.emit("loadedmetadata")
      await Promise.resolve()
    })

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.error).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    expect(cache.clearCache).not.toHaveBeenCalled()
    expect(recordDiagnostic).toHaveBeenCalledWith(
      "guided_audio_autoplay_blocked",
      expect.objectContaining({ cacheKey: "test-audio", phase: "autoplay" }),
    )
  })

  it("后台缓存下载失败时记录原始错误，方便导出运行日志", async () => {
    cache.downloadAndCache.mockRejectedValue(new Error("响应不是有效音频: text/html"))
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady: vi.fn(),
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })

    await waitFor(() => expect(recordDiagnostic).toHaveBeenCalledWith(
      "guided_audio_cache_error",
      expect.objectContaining({
        cacheKey: "test-audio",
        message: "响应不是有效音频: text/html",
        source: "/audio/test.m4a",
      }),
    ))
  })

  it("命中缓存时只读取当前口令版本", async () => {
    cache.isCacheValid.mockResolvedValue(true)
    cache.getAudioBuffer.mockResolvedValue(new ArrayBuffer(4))
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady: vi.fn(),
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })

    expect(cache.getAudioBuffer).toHaveBeenCalledWith("test-audio")
    expect(cache.downloadAndCache).not.toHaveBeenCalled()
    expect(result.current.isUsingCache).toBe(true)
  })

  it("音频事件使用最新的会话回调，避免捕获启动前状态", async () => {
    const initialReady = vi.fn()
    const latestReady = vi.fn()
    const { result, rerender } = renderHook(
      ({ onReady }) => useGuidedAudio({ ...guidedOptions, onReady, onEnded: vi.fn() }),
      { initialProps: { onReady: initialReady } },
    )

    await act(async () => { await result.current.load() })
    rerender({ onReady: latestReady })
    await act(async () => {
      AudioMock.instances[0].emit("loadedmetadata")
      await Promise.resolve()
    })

    expect(initialReady).not.toHaveBeenCalled()
    expect(latestReady).toHaveBeenCalledTimes(1)
  })

  it("快进后退限制在音频边界内，重置时释放媒体", async () => {
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
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

  it("释放后的媒体错误事件不会被误报为播放失败或清除缓存", async () => {
    cache.isCacheValid.mockResolvedValue(true)
    cache.getAudioBuffer.mockResolvedValue(new ArrayBuffer(4))
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady: vi.fn(),
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })
    const audio = AudioMock.instances[0]
    recordDiagnostic.mockClear()
    act(() => { result.current.reset() })
    act(() => { audio.emit("error") })

    expect(result.current.error).toBeNull()
    expect(cache.clearCache).not.toHaveBeenCalled()
    expect(recordDiagnostic).not.toHaveBeenCalledWith(
      "guided_audio_playback_error",
      expect.anything(),
    )
  })

  it("重置时取消尚未完成的后台缓存下载，防止清空后重新写回", async () => {
    cache.downloadAndCache.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useGuidedAudio({
      ...guidedOptions,
      onReady: vi.fn(),
      onEnded: vi.fn(),
    }))

    await act(async () => { await result.current.load() })
    const options = cache.downloadAndCache.mock.calls[0][4] as { signal: AbortSignal }
    expect(options.signal.aborted).toBe(false)

    act(() => { result.current.reset() })

    expect(options.signal.aborted).toBe(true)
  })

  it("音频失败时保留普通计时控制", () => {
    expect(shouldShowPracticeControls("guided_audio", false, true, null)).toBe(false)
    expect(shouldShowPracticeControls("guided_audio", false, false, "音频失败")).toBe(true)
    expect(shouldShowPracticeControls("guided_audio", true, false, null)).toBe(true)
    expect(shouldShowPracticeControls("primary", false, false, null)).toBe(true)
  })
})
