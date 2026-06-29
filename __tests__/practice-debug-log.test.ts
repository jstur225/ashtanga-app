import { beforeEach, describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"
import {
  collectPracticeDebugLog,
  summarizePracticeData,
  summarizeSyncLogs,
  withDiagnosticTimeout,
} from "@/lib/practice-debug-log"

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}))

vi.mock("@/lib/photo-logger", () => ({
  getPhotoLogs: () => [{ action: "upload" }],
  getPhotoErrorLogs: () => [],
}))

const record = (overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: "record-1",
  created_at: "2026-06-21T08:00:00.000Z",
  updated_at: "2026-06-21T09:00:00.000Z",
  date: "2026-06-21",
  type: "一序列",
  duration: 60,
  notes: "稳定",
  photos: [],
  ...overrides,
})

const option = (overrides: Partial<PracticeOption> = {}): PracticeOption => ({
  id: "option-1",
  created_at: "2026-06-21T08:00:00.000Z",
  label: "一序列",
  is_custom: false,
  ...overrides,
})

const profile: UserProfile = {
  id: "profile-1",
  created_at: "2026-06-21T08:00:00.000Z",
  updated_at: "2026-06-21T09:00:00.000Z",
  name: "测试用户",
  signature: "练习",
  avatar: null,
}

describe("practice debug log summaries", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("汇总练习数量、时长、色阶与选项默认色阶", () => {
    const summary = summarizePracticeData(
      { practiceOptions: [option(), option({ id: "custom", is_custom: true, color_level: 4 })], userProfile: profile, membershipIsPro: true },
      [
        record({ duration: 60, color_level: 1, photos: ["photo.jpg"] }),
        record({ id: "record-2", duration: 30, color_level: undefined, notes: "", breakthrough: "突破" }),
      ],
    )

    expect(summary.records).toMatchObject({
      totalCount: 2,
      withPhotos: 1,
      withNotes: 1,
      withBreakthrough: 1,
      totalDuration: 90,
      averageDuration: 45,
      colorLevelDistribution: { level1: 1, level2: 0, level3: 1, level4: 0 },
    })
    expect(summary.options.list.map((item) => item.colorLevel)).toEqual([3, 4])
    expect(summary.profile).toMatchObject({ name: "测试用户", hasSignature: true, isPro: true })
  })

  it("同步日志生成冲突、上传、下载和最近触发摘要", () => {
    const result = summarizeSyncLogs([
      { timestamp: "new", action: "检测冲突", status: "warning", triggerReason: "页面恢复", localCount: 3, remoteCount: 4 },
      { timestamp: "old", action: "上传本地记录", status: "success" },
      { timestamp: "older", action: "从云端下载", status: "success" },
    ])

    expect(result.summary).toMatchObject({
      total: 3,
      conflicts: 1,
      uploadCount: 1,
      downloadCount: 1,
      lastTriggerReason: "页面恢复",
      lastLocalCount: 3,
      lastRemoteCount: 4,
      lastSyncTime: "new",
    })
  })

  it("损坏或非数组同步日志安全回退为空摘要", () => {
    expect(summarizeSyncLogs(null)).toEqual({ entries: [], summary: {} })
    expect(summarizeSyncLogs({ action: "not-an-array" })).toEqual({ entries: [], summary: {} })
  })

  it("页面只编排采集，诊断细节归独立模块所有", () => {
    const root = path.resolve(__dirname, "..")
    const page = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const collector = fs.readFileSync(path.join(root, "lib/practice-debug-log.ts"), "utf8")

    expect(page).toContain("collectPracticeDebugLog({")
    expect(page).not.toContain("Service Worker 状态")
    expect(page).not.toContain("色阶同步诊断")
    expect(collector).toContain("collectServiceWorkerStatus")
    expect(collector).toContain("collectColorSyncDiagnostics")
  })

  it("完整采集在未登录环境生成可序列化日志并安全降级", async () => {
    localStorage.setItem("sync_logs", JSON.stringify([{ action: "上传本地记录", timestamp: "now" }]))
    const result = await collectPracticeDebugLog({
      user: null,
      syncStatus: "idle",
      lastSyncTime: null,
      failedSyncIds: [],
      conflictLocalCount: 0,
      conflictRemoteCount: 0,
      showDataConflict: false,
      practiceHistory: [record()],
      practiceOptions: [option()],
      userProfile: profile,
      membership: null,
      membershipIsPro: false,
      membershipLoading: false,
      exportLogs: [],
      activeTab: "practice",
      showSettings: true,
      showAccountSync: false,
      showAuthModal: false,
      authMode: "login",
      showClearDataConfirm: false,
      clearDataStep: 1,
      selectedOption: null,
      isPracticing: true,
      isPaused: false,
      elapsedTime: 0,
      totalPausedTime: 0,
      customPracticeName: "",
      showImportModal: false,
      showExportModal: false,
      showDebugLogModal: false,
      showCompletion: false,
      showFakeDoor: false,
      chantEnabled: false,
      chantDelaySeconds: 60,
    })

    expect(result._meta).toMatchObject({ version: "2.5", description: "熬汤日记调试日志 - 用于问题排查" })
    expect(result.supabaseConnection).toMatchObject({ testStatus: "success", error: null })
    expect(result.membershipLogs).toMatchObject({ hasSession: false, note: "用户未登录，无法查询后端会员状态" })
    expect(result.photoLogs).toMatchObject({ summary: { total: 1, errors: 0 } })
    expect(result.syncLogs.summary).toMatchObject({ total: 1, uploadCount: 1 })
    expect(result.currentAppState).toMatchObject({ isPracticing: true })
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  it("单项诊断超时后返回降级结果，不阻塞日志导出", async () => {
    const result = await withDiagnosticTimeout(
      "网络诊断",
      new Promise<Record<string, unknown>>(() => {}),
      { status: "timeout" },
      5,
    )

    expect(result).toEqual({
      status: "timeout",
      diagnosticTimeout: "网络诊断",
    })
  })
})
