export interface PracticeSessionState {
  isPracticing: boolean
  isPaused: boolean
  startTime: number | null
  pauseStartTime: number | null
  totalPausedTime: number
}

export const EMPTY_PRACTICE_SESSION: PracticeSessionState = {
  isPracticing: false,
  isPaused: false,
  startTime: null,
  pauseStartTime: null,
  totalPausedTime: 0,
}

function validTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function validDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

export function normalizePracticeSession(value: Partial<PracticeSessionState> | null | undefined): PracticeSessionState {
  if (!value?.isPracticing) return { ...EMPTY_PRACTICE_SESSION }

  const startTime = validTimestamp(value.startTime)
  if (startTime === null) return { ...EMPTY_PRACTICE_SESSION }

  const isPaused = Boolean(value.isPaused)
  return {
    isPracticing: true,
    isPaused,
    startTime,
    pauseStartTime: isPaused ? validTimestamp(value.pauseStartTime) : null,
    totalPausedTime: validDuration(value.totalPausedTime),
  }
}

export function startPracticeSession(now: number, initiallyPaused = false): PracticeSessionState {
  const timestamp = validTimestamp(now) ?? 0
  return {
    isPracticing: true,
    isPaused: initiallyPaused,
    startTime: timestamp,
    pauseStartTime: initiallyPaused ? timestamp : null,
    totalPausedTime: 0,
  }
}

export function pausePracticeSession(state: PracticeSessionState, now: number): PracticeSessionState {
  const current = normalizePracticeSession(state)
  if (!current.isPracticing || current.isPaused) return current

  return { ...current, isPaused: true, pauseStartTime: validTimestamp(now) ?? current.startTime }
}

export function resumePracticeSession(state: PracticeSessionState, now: number): PracticeSessionState {
  const current = normalizePracticeSession(state)
  if (!current.isPracticing || !current.isPaused) return current

  const resumedAt = validTimestamp(now) ?? current.pauseStartTime ?? current.startTime ?? 0
  const pausedAt = current.pauseStartTime ?? resumedAt
  return {
    ...current,
    isPaused: false,
    pauseStartTime: null,
    totalPausedTime: current.totalPausedTime + Math.max(0, resumedAt - pausedAt),
  }
}

export function calculateElapsedSeconds(state: PracticeSessionState, now: number): number {
  const current = normalizePracticeSession(state)
  if (!current.isPracticing || current.startTime === null) return 0

  const currentTime = validTimestamp(now) ?? current.startTime
  const endTime = current.isPaused && current.pauseStartTime !== null
    ? current.pauseStartTime
    : currentTime
  return Math.max(0, Math.floor((endTime - current.startTime - current.totalPausedTime) / 1000))
}

export function resetPracticeSession(): PracticeSessionState {
  return { ...EMPTY_PRACTICE_SESSION }
}
