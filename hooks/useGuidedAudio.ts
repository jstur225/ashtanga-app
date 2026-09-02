"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { audioCache } from "@/lib/audioCache"

interface UseGuidedAudioOptions {
  source: string
  cacheKey: string
  cacheVersion: string
  onReady: () => void
  onEnded: () => void
}

type RuntimeDiagnosticWindow = Window & {
  __ashtangaRuntimeDiagnostic?: (type: string, details: Record<string, unknown>) => void
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    const errorWithDetails = error as Error & { details?: unknown }
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 1200) ?? null,
      downloadDetails: errorWithDetails.details ?? null,
    }
  }
  return { name: null, message: String(error), stack: null, downloadDetails: null }
}

function getNetworkDetails() {
  if (typeof navigator === "undefined") return {}
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }
  }).connection
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType ?? null,
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
    saveData: connection?.saveData ?? null,
  }
}

function recordGuidedAudioDiagnostic(type: string, details: Record<string, unknown>) {
  if (typeof window === "undefined") return
  try {
    ;(window as RuntimeDiagnosticWindow).__ashtangaRuntimeDiagnostic?.(type, details)
  } catch {
    // Diagnostics must never interrupt playback or recovery.
  }
}

function isAutoplayBlocked(error: unknown) {
  return error instanceof Error && error.name === "NotAllowedError"
}

function getMediaDetails(audio: HTMLAudioElement) {
  return {
    currentSrc: audio.currentSrc || audio.src || null,
    networkState: audio.networkState,
    readyState: audio.readyState,
    mediaErrorCode: audio.error?.code ?? null,
    mediaErrorMessage: audio.error?.message ?? null,
  }
}

export function formatAudioTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "00:00"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function shouldShowPracticeControls(
  activeOptionId: string | null,
  isLoaded: boolean,
  isLoading: boolean,
  error: string | null,
): boolean {
  return activeOptionId !== "guided_audio" || Boolean(error) || (isLoaded && !isLoading)
}

export function useGuidedAudio({ source, cacheKey, cacheVersion, onReady, onEnded }: UseGuidedAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const cacheDownloadControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const onReadyRef = useRef(onReady)
  const onEndedRef = useRef(onEnded)
  onReadyRef.current = onReady
  onEndedRef.current = onEnded
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seekStep, setSeekStep] = useState(15)
  const [isUsingCache, setIsUsingCache] = useState(false)
  const [isBackgroundCaching, setIsBackgroundCaching] = useState(false)

  const releaseMedia = useCallback(() => {
    cacheDownloadControllerRef.current?.abort()
    cacheDownloadControllerRef.current = null
    const audio = audioRef.current
    // Detach first: assigning an empty src can itself emit a media error. Any
    // event from this released element must not affect the next playback.
    audioRef.current = null
    if (audio) {
      audio.pause()
      audio.src = ""
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    loadingRef.current = false
  }, [])

  const reset = useCallback(() => {
    releaseMedia()
    setProgress(0)
    setDuration(0)
    setCurrentTime(0)
    setIsLoaded(false)
    setIsLoading(false)
    setError(null)
    setIsUsingCache(false)
    setIsBackgroundCaching(false)
  }, [releaseMedia])

  const attachEvents = useCallback((audio: HTMLAudioElement, cacheBacked: boolean) => {
    let failed = false
    const fail = (message: string, phase: "autoplay" | "media_element", cause?: unknown) => {
      if (failed || audioRef.current !== audio) return
      failed = true
      recordGuidedAudioDiagnostic("guided_audio_playback_error", {
        source,
        cacheKey,
        cacheVersion,
        cacheBacked,
        phase,
        ...getMediaDetails(audio),
        ...describeError(cause),
        ...getNetworkDetails(),
      })
      loadingRef.current = false
      setIsLoading(false)
      setError(message)
      if (cacheBacked) {
        void audioCache.clearCache(cacheKey).catch((clearError) => {
          recordGuidedAudioDiagnostic("guided_audio_cache_clear_error", {
            source,
            cacheKey,
            cacheVersion,
            ...describeError(clearError),
          })
        })
      }
      onReadyRef.current()
    }

    audio.addEventListener("loadedmetadata", () => {
      if (audioRef.current !== audio) return
      setDuration(audio.duration)
      setIsLoaded(true)
      setIsLoading(false)
      loadingRef.current = false
      void audio.play()
        .then(() => {
          if (audioRef.current === audio) onReadyRef.current()
        })
        .catch((playError) => {
          if (audioRef.current !== audio) return
          if (isAutoplayBlocked(playError)) {
            recordGuidedAudioDiagnostic("guided_audio_autoplay_blocked", {
              source,
              cacheKey,
              cacheVersion,
              cacheBacked,
              phase: "autoplay",
              ...getMediaDetails(audio),
              ...describeError(playError),
              ...getNetworkDetails(),
            })
            setError(null)
            return
          }
          fail("音频播放失败，请重试", "autoplay", playError)
        })
    })
    audio.addEventListener("timeupdate", () => {
      if (audioRef.current !== audio) return
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0)
    })
    audio.addEventListener("ended", () => {
      if (audioRef.current === audio) onEndedRef.current()
    })
    audio.addEventListener("error", () => {
      if (audioRef.current !== audio) return
      fail(
        cacheBacked ? "音频播放失败，请重试" : "音频播放失败，请检查网络连接",
        "media_element",
        audio.error,
      )
    })
  }, [cacheKey, cacheVersion, source])

  const load = useCallback(async () => {
    if (loadingRef.current) return false
    loadingRef.current = true
    setIsLoading(true)
    setError(null)
    setIsBackgroundCaching(false)
    releaseMedia()
    loadingRef.current = true

    try {
      const hasCache = await audioCache.isCacheValid(cacheKey, cacheVersion)
      if (hasCache) {
        setIsUsingCache(true)
        const buffer = await audioCache.getAudioBuffer(cacheKey)
        if (!buffer) throw new Error("缓存数据无效")
        const url = URL.createObjectURL(new Blob([buffer], { type: "audio/mp4" }))
        blobUrlRef.current = url
        const audio = new Audio()
        audio.src = url
        attachEvents(audio, true)
        audioRef.current = audio
      } else {
        setIsUsingCache(false)
        const audio = new Audio(source)
        attachEvents(audio, false)
        audioRef.current = audio
        const cacheDownloadController = new AbortController()
        cacheDownloadControllerRef.current = cacheDownloadController
        setIsBackgroundCaching(true)
        void audioCache.downloadAndCache(source, cacheKey, cacheVersion, undefined, {
          priority: "low",
          signal: cacheDownloadController.signal,
        })
          .catch((cacheError) => {
            if (cacheError instanceof Error && cacheError.name === "AbortError") return
            recordGuidedAudioDiagnostic("guided_audio_cache_error", {
              source,
              cacheKey,
              cacheVersion,
              ...describeError(cacheError),
              ...getNetworkDetails(),
            })
          })
          .finally(() => {
            if (cacheDownloadControllerRef.current === cacheDownloadController) {
              cacheDownloadControllerRef.current = null
            }
            setIsBackgroundCaching(false)
          })
      }
      return true
    } catch (loadError) {
      recordGuidedAudioDiagnostic("guided_audio_load_error", {
        source,
        cacheKey,
        cacheVersion,
        ...describeError(loadError),
        ...getNetworkDetails(),
      })
      loadingRef.current = false
      setIsLoading(false)
      setError("音频加载失败")
      onReadyRef.current()
      return false
    }
  }, [attachEvents, cacheKey, cacheVersion, releaseMedia, source])

  const pause = useCallback(() => audioRef.current?.pause(), [])
  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    void audio.play().catch((playError) => {
      recordGuidedAudioDiagnostic("guided_audio_playback_error", {
        source,
        cacheKey,
        cacheVersion,
        cacheBacked: isUsingCache,
        phase: "manual_play",
        ...getMediaDetails(audio),
        ...describeError(playError),
        ...getNetworkDetails(),
      })
      setError("音频播放失败，请重试")
    })
  }, [cacheKey, cacheVersion, isUsingCache, source])
  const seek = useCallback((direction: "forward" | "backward") => {
    const audio = audioRef.current
    if (!audio || !isLoaded) return
    const delta = direction === "forward" ? seekStep : -seekStep
    const nextTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta))
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }, [isLoaded, seekStep])

  useEffect(() => releaseMedia, [releaseMedia])

  return {
    progress,
    duration,
    currentTime,
    isLoaded,
    isLoading,
    error,
    seekStep,
    isUsingCache,
    isBackgroundCaching,
    setSeekStep,
    load,
    retry: load,
    pause,
    play,
    seek,
    reset,
  }
}
