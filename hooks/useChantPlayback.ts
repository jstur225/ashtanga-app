"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivePracticeContext } from "@/hooks/usePracticeSession"

interface UseChantPlaybackOptions {
  delaySeconds: number
  onStart: (context: ActivePracticeContext, now: number) => void
  onFinished: (now: number) => void
  onError: () => void
}

export function useChantPlayback({ delaySeconds, onStart, onFinished, onError }: UseChantPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completionRef = useRef(false)
  const [isCountdown, setIsCountdown] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const releaseMedia = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    releaseMedia()
    completionRef.current = false
    setIsCountdown(false)
    setCountdown(0)
    setIsPlaying(false)
  }, [releaseMedia])

  const play = useCallback(() => {
    setIsCountdown(false)
    setIsPlaying(true)
    completionRef.current = false
    const audio = new Audio("/audio/opening-chant.mp3")
    audioRef.current = audio

    const finish = (failed: boolean) => {
      if (completionRef.current) return
      completionRef.current = true
      audio.pause()
      audio.src = ""
      audioRef.current = null
      setIsPlaying(false)
      if (failed) onError()
      onFinished(Date.now())
    }

    audio.addEventListener("ended", () => finish(false))
    audio.addEventListener("error", () => finish(true))
    void audio.play().catch(() => finish(true))
  }, [onError, onFinished])

  const skip = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    play()
  }, [play])

  const start = useCallback((context: ActivePracticeContext) => {
    reset()
    onStart(context, Date.now())
    let remaining = Math.max(0, delaySeconds)
    setCountdown(remaining)
    if (remaining === 0) {
      play()
      return
    }
    setIsCountdown(true)
    countdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = null
        play()
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }, [delaySeconds, onStart, play, reset])

  useEffect(() => releaseMedia, [releaseMedia])

  return { isCountdown, countdown, isPlaying, start, skip, reset }
}
