"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useInterval, useLocalStorage } from "react-use"
import { formatMinutes } from "@/lib/practice-utils"
import {
  calculateElapsedSeconds,
  normalizePracticeSession,
  pausePracticeSession,
  resetPracticeSession,
  resumePracticeSession,
  startPracticeSession,
  type PracticeSessionState,
} from "@/lib/practice-session"

export const PRACTICE_SESSION_STORAGE_KEYS = {
  isPracticing: 'ashtanga_is_practicing',
  isPaused: 'ashtanga_is_paused',
  startTime: 'ashtanga_start_time',
  pauseStartTime: 'ashtanga_pause_start_time',
  totalPausedTime: 'ashtanga_total_paused_time',
} as const

export function usePracticeSession() {
  const [storedIsPracticing, setStoredIsPracticing] = useLocalStorage(PRACTICE_SESSION_STORAGE_KEYS.isPracticing, false)
  const [storedIsPaused, setStoredIsPaused] = useLocalStorage(PRACTICE_SESSION_STORAGE_KEYS.isPaused, false)
  const [storedStartTime, setStoredStartTime] = useLocalStorage<number | null>(PRACTICE_SESSION_STORAGE_KEYS.startTime, null)
  const [storedPauseStartTime, setStoredPauseStartTime] = useLocalStorage<number | null>(PRACTICE_SESSION_STORAGE_KEYS.pauseStartTime, null)
  const [storedTotalPausedTime, setStoredTotalPausedTime] = useLocalStorage(PRACTICE_SESSION_STORAGE_KEYS.totalPausedTime, 0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [finalDuration, setFinalDuration] = useState("")
  const completedStartTimeRef = useRef<number | null>(null)

  const state = useMemo(() => normalizePracticeSession({
    isPracticing: storedIsPracticing,
    isPaused: storedIsPaused,
    startTime: storedStartTime,
    pauseStartTime: storedPauseStartTime,
    totalPausedTime: storedTotalPausedTime,
  }), [storedIsPaused, storedIsPracticing, storedPauseStartTime, storedStartTime, storedTotalPausedTime])

  const persist = useCallback((next: PracticeSessionState) => {
    setStoredIsPracticing(next.isPracticing)
    setStoredIsPaused(next.isPaused)
    setStoredStartTime(next.startTime)
    setStoredPauseStartTime(next.pauseStartTime)
    setStoredTotalPausedTime(next.totalPausedTime)
  }, [setStoredIsPaused, setStoredIsPracticing, setStoredPauseStartTime, setStoredStartTime, setStoredTotalPausedTime])

  const start = useCallback((initiallyPaused = false, now = Date.now()) => {
    if (state.isPracticing) return false
    persist(startPracticeSession(now, initiallyPaused))
    completedStartTimeRef.current = now
    setElapsedTime(0)
    return true
  }, [persist, state.isPracticing])

  const restartTimer = useCallback((now = Date.now()) => {
    persist(startPracticeSession(now, false))
    completedStartTimeRef.current = now
    setElapsedTime(0)
  }, [persist])

  const pause = useCallback((now = Date.now()) => {
    const next = pausePracticeSession(state, now)
    persist(next)
    return next.isPaused
  }, [persist, state])

  const resume = useCallback((now = Date.now()) => {
    const next = resumePracticeSession(state, now)
    persist(next)
    return !next.isPaused
  }, [persist, state])

  const reset = useCallback(() => {
    persist(resetPracticeSession())
  }, [persist])

  const requestEnd = useCallback(() => setShowConfirmEnd(true), [])
  const cancelEnd = useCallback(() => setShowConfirmEnd(false), [])

  const confirmEnd = useCallback(() => {
    completedStartTimeRef.current = state.startTime
    setShowConfirmEnd(false)
    setFinalDuration(formatMinutes(elapsedTime))
    setShowCompletion(true)
    reset()
  }, [elapsedTime, reset, state.startTime])

  const discardEnd = useCallback(() => {
    setShowConfirmEnd(false)
    setShowCompletion(false)
    completedStartTimeRef.current = null
    setElapsedTime(0)
    reset()
  }, [reset])

  const finishCompletion = useCallback(() => {
    setShowCompletion(false)
    completedStartTimeRef.current = null
    setElapsedTime(0)
  }, [])

  useInterval(() => {
    setElapsedTime(calculateElapsedSeconds(state, Date.now()))
  }, state.isPracticing && !state.isPaused ? 1000 : null)

  useEffect(() => {
    setElapsedTime(calculateElapsedSeconds(state, Date.now()))
    // Only restore the persisted timer on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...state,
    elapsedTime,
    showConfirmEnd,
    showCompletion,
    finalDuration,
    completedStartTimeRef,
    start,
    restartTimer,
    pause,
    resume,
    requestEnd,
    cancelEnd,
    confirmEnd,
    discardEnd,
    finishCompletion,
  }
}
