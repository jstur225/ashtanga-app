/**
 * L3 集成测试：sortAndLimitRecords 在 useSync 上传路径中的应用
 *
 * 验证：当本地有 1001+ 条记录时，useSync.uploadLocalData 只上传最新 1000 条，
 * 最旧的 1 条仅保留在本地（localOnly）。
 *
 * 这是测试矩阵中「1000 条限制与排序 L1/L3」的 L3 部分。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { PracticeRecord, PracticeOption, UserProfile } from "@/lib/supabase"

// ==================== Mocks ====================

const { upsertRecordsMock, fetchCloudRecordsForMergeMock, upsertOptionsMock, deleteAllUserRecordsMock, deleteAllUserOptionsMock, fetchAllUserDataMock } = vi.hoisted(() => ({
  upsertRecordsMock: vi.fn().mockResolvedValue({ error: null }),
  fetchCloudRecordsForMergeMock: vi.fn().mockResolvedValue({ data: [], error: null }),
  upsertOptionsMock: vi.fn().mockResolvedValue({ error: null }),
  deleteAllUserRecordsMock: vi.fn().mockResolvedValue({ error: null }),
  deleteAllUserOptionsMock: vi.fn().mockResolvedValue({ error: null }),
  fetchAllUserDataMock: vi.fn().mockResolvedValue({ records: [], options: [], profile: null }),
}))

vi.mock("@/lib/supabase-repository", () => ({
  fetchAllUserData: fetchAllUserDataMock,
  fetchCloudRecordsForMerge: fetchCloudRecordsForMergeMock,
  upsertRecords: upsertRecordsMock,
  upsertOptions: upsertOptionsMock,
  deleteAllUserRecords: deleteAllUserRecordsMock,
  deleteAllUserOptions: deleteAllUserOptionsMock,
}))

// withRetry 直接调用一次（不实际重试）
vi.mock("@/lib/sync-retry", () => ({
  withRetry: async (fn: () => Promise<unknown>) => fn(),
  persistFailedSyncIds: vi.fn(),
  loadFailedSyncIds: () => [],
}))

// fetch（用于 uploadLocalData 中的 profile 上传 API 调用）
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
} as Response))

// localStorage mock（react-use useLocalStorage 依赖）
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
vi.stubGlobal("localStorage", localStorageMock)

// ==================== Helpers ====================

function makeRecords(count: number): PracticeRecord[] {
  // 生成从最早到最晚的记录，每条记录有唯一日期
  // r0 是最旧（date 最早），r(count-1) 是最新
  const baseDate = new Date(2020, 0, 1).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(baseDate + i * dayMs)
    const isoDate = d.toISOString().slice(0, 10) // yyyy-MM-dd
    return {
      id: `r${i}`,
      user_id: "u1",
      created_at: isoDate,
      updated_at: isoDate,
      date: isoDate,
      type: "一序列",
      duration: 3600,
      notes: `record ${i}`,
      photos: [],
    }
  })
}

function makeProfile(): UserProfile {
  return {
    id: "p1",
    user_id: "u1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    name: "测试",
    signature: "",
    avatar: null,
  }
}

const emptyUser = { id: "u1", email: "test@test.com" }

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ==================== Tests ====================

describe("useSync — 1000 条限制 L3 集成", () => {
  it("传入 1001 条记录 → uploadLocalData 只上传最新 1000 条", async () => {
    const { useSync } = await import("@/hooks/useSync")
    const records = makeRecords(1001)

    const { result } = renderHook(() =>
      useSync(
        emptyUser,
        { records, options: [], profile: makeProfile() },
        vi.fn(),
        vi.fn(),
      ),
    )

    await act(async () => {
      await result.current.uploadLocalData("u1", { records, options: [], profile: makeProfile() }, emptyUser)
    })

    // upsert 应该被调用，且只传入 1000 条
    expect(upsertRecordsMock).toHaveBeenCalled()
    const uploadedPayload = upsertRecordsMock.mock.calls[0][0] as unknown[]
    expect(uploadedPayload).toHaveLength(1000)

    // 验证：最旧的 r0 不在上传列表中
    const uploadedIds = uploadedPayload.map((r: any) => r.id)
    expect(uploadedIds).not.toContain("r0")

    // 验证：最新的 r1000 在上传列表中
    expect(uploadedIds).toContain("r1000")
  })

  it("传入 500 条记录 → 全部上传，不触发限制", async () => {
    const { useSync } = await import("@/hooks/useSync")
    const records = makeRecords(500)

    const { result } = renderHook(() =>
      useSync(
        emptyUser,
        { records, options: [], profile: makeProfile() },
        vi.fn(),
        vi.fn(),
      ),
    )

    await act(async () => {
      await result.current.uploadLocalData("u1", { records, options: [], profile: makeProfile() }, emptyUser)
    })

    expect(upsertRecordsMock).toHaveBeenCalled()
    const uploadedPayload = upsertRecordsMock.mock.calls[0][0] as unknown[]
    expect(uploadedPayload).toHaveLength(500)
  })

  it("传入 0 条记录 → 不调用 upsert（早退）", async () => {
    const { useSync } = await import("@/hooks/useSync")

    const { result } = renderHook(() =>
      useSync(
        emptyUser,
        { records: [], options: [], profile: makeProfile() },
        vi.fn(),
        vi.fn(),
      ),
    )

    await act(async () => {
      await result.current.uploadLocalData("u1", { records: [], options: [], profile: makeProfile() }, emptyUser)
    })

    // records 长度为 0 时 uploadLocalRecords 早退，不调用 upsertRecords
    expect(upsertRecordsMock).not.toHaveBeenCalled()
  })

  it("1000 条边界 → 全部上传", async () => {
    const { useSync } = await import("@/hooks/useSync")
    const records = makeRecords(1000)

    const { result } = renderHook(() =>
      useSync(
        emptyUser,
        { records, options: [], profile: makeProfile() },
        vi.fn(),
        vi.fn(),
      ),
    )

    await act(async () => {
      await result.current.uploadLocalData("u1", { records, options: [], profile: makeProfile() }, emptyUser)
    })

    expect(upsertRecordsMock).toHaveBeenCalled()
    const uploadedPayload = upsertRecordsMock.mock.calls[0][0] as unknown[]
    expect(uploadedPayload).toHaveLength(1000)
  })

  it("1002 条记录 → 上传 1000 条，排除最旧 2 条（r0、r1）", async () => {
    const { useSync } = await import("@/hooks/useSync")
    const records = makeRecords(1002)

    const { result } = renderHook(() =>
      useSync(
        emptyUser,
        { records, options: [], profile: makeProfile() },
        vi.fn(),
        vi.fn(),
      ),
    )

    await act(async () => {
      await result.current.uploadLocalData("u1", { records, options: [], profile: makeProfile() }, emptyUser)
    })

    expect(upsertRecordsMock).toHaveBeenCalled()
    const uploadedPayload = upsertRecordsMock.mock.calls[0][0] as unknown[]
    expect(uploadedPayload).toHaveLength(1000)

    const uploadedIds = uploadedPayload.map((r: any) => r.id)
    expect(uploadedIds).not.toContain("r0")
    expect(uploadedIds).not.toContain("r1")
    expect(uploadedIds).toContain("r1001")
  })
})
