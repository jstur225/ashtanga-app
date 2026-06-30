"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { audioCache } from "@/lib/audioCache"

interface UseGuidedAudioOptions {
  source: string
  onReady: () => void
  onEnded: () => void
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

export function useGuidedAudio({ source, onReady, onEnded }: UseGuidedAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
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
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
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
    const fail = (message: string) => {
      if (failed) return
      failed = true
      loadingRef.current = false
      setIsLoading(false)
      setError(message)
      if (cacheBacked) void audioCache.clearCache()
      onReadyRef.current()
    }

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration)
      setIsLoaded(true)
      setIsLoading(false)
      loadingRef.current = false
      onReadyRef.current()
      void audio.play().catch(() => fail("音频播放失败，请重试"))
    })
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0)
    })
    audio.addEventListener("ended", () => onEndedRef.current())
    audio.addEventListener("error", () => fail(cacheBacked ? "音频播放失败，请重试" : "音频播放失败，请检查网络连接"))
  }, [])

  const load = useCallback(async () => {
    if (loadingRef.current) return false
    loadingRef.current = true
    setIsLoading(true)
    setError(null)
    setIsBackgroundCaching(false)
    releaseMedia()
    loadingRef.current = true

    try {
      const hasCache = await audioCache.isCacheValid()
      if (hasCache) {
        setIsUsingCache(true)
        const buffer = await audioCache.getAudioBuffer()
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
        setIsBackgroundCaching(true)
        void audioCache.downloadAndCache(source, undefined, { priority: "low" })
          .catch(() => undefined)
          .finally(() => setIsBackgroundCaching(false))
      }
      return true
    } catch {
      loadingRef.current = false
      setIsLoading(false)
      setError("音频加载失败")
      onReadyRef.current()
      return false
    }
  }, [attachEvents, releaseMedia, source])

  const pause = useCallback(() => audioRef.current?.pause(), [])
  const play = useCallback(() => {
    if (audioRef.current) void audioRef.current.play()
  }, [])
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
