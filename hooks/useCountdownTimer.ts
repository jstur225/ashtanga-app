"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

export function useCountdownTimer() {
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCountdown(0)
  }, [])

  const start = useCallback((seconds: number) => {
    stop()
    setCountdown(seconds)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [stop])

  useEffect(() => stop, [stop])

  return { countdown, start, stop }
}
