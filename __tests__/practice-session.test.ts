import { describe, expect, it } from "vitest"
import {
  EMPTY_PRACTICE_SESSION,
  calculateElapsedSeconds,
  normalizePracticeSession,
  pausePracticeSession,
  resetPracticeSession,
  resumePracticeSession,
  startPracticeSession,
} from "@/lib/practice-session"

describe("practice session state", () => {
  it("开始会话并按时间戳计算前台或后台经过时间", () => {
    const state = startPracticeSession(1_000)
    expect(calculateElapsedSeconds(state, 61_999)).toBe(60)
  })

  it("暂停期间不计时，恢复后累计多次暂停时长", () => {
    let state = startPracticeSession(0)
    state = pausePracticeSession(state, 10_000)
    expect(calculateElapsedSeconds(state, 50_000)).toBe(10)

    state = resumePracticeSession(state, 50_000)
    state = pausePracticeSession(state, 70_000)
    state = resumePracticeSession(state, 80_000)

    expect(state.totalPausedTime).toBe(50_000)
    expect(calculateElapsedSeconds(state, 100_000)).toBe(50)
  })

  it("重复暂停和重复恢复保持幂等", () => {
    const started = startPracticeSession(1_000)
    const paused = pausePracticeSession(started, 2_000)
    expect(pausePracticeSession(paused, 9_000)).toEqual(paused)

    const resumed = resumePracticeSession(paused, 4_000)
    expect(resumePracticeSession(resumed, 9_000)).toEqual(resumed)
  })

  it("设备时间倒退时不产生负计时或负暂停时长", () => {
    const started = startPracticeSession(10_000)
    const paused = pausePracticeSession(started, 8_000)
    const resumed = resumePracticeSession(paused, 7_000)

    expect(resumed.totalPausedTime).toBe(0)
    expect(calculateElapsedSeconds(resumed, 5_000)).toBe(0)
  })

  it("缺失、损坏或部分持久化字段恢复为空会话", () => {
    expect(normalizePracticeSession(null)).toEqual(EMPTY_PRACTICE_SESSION)
    expect(normalizePracticeSession({ isPracticing: true, startTime: Number.NaN })).toEqual(EMPTY_PRACTICE_SESSION)
    expect(normalizePracticeSession({ isPracticing: true, startTime: null })).toEqual(EMPTY_PRACTICE_SESSION)
  })

  it("暂停恢复数据会清理异常累计值并保留合法字段", () => {
    expect(normalizePracticeSession({
      isPracticing: true,
      isPaused: true,
      startTime: 1_000,
      pauseStartTime: 2_000,
      totalPausedTime: -5,
    })).toEqual({
      isPracticing: true,
      isPaused: true,
      startTime: 1_000,
      pauseStartTime: 2_000,
      totalPausedTime: 0,
    })
  })

  it("重置后清除全部计时持久状态", () => {
    expect(resetPracticeSession()).toEqual(EMPTY_PRACTICE_SESSION)
  })
})
