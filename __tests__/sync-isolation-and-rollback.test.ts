/**
 * L3 集成测试：用户隔离 & 回滚（resolveConflict 错误传播）
 *
 * 覆盖测试矩阵中三项高价值缺口：
 *   1. 未登录用户直接调 uploadLocalData → 必须 silent return，不触发任何网络请求 / 写库
 *      （这是真 bug fix：原本 uploadLocalData 没有 !user 守卫）
 *   2. resolveConflict('local') 删除 options 静默失败 → 必须像 records 删除失败那样 throw
 *      （错误处理一致性回归）
 *   3. resolveConflict('local') 删除成功但上传失败 → 必须 setSyncStatus('error') 且日志含「上传本地数据失败」
 *
 * 复用 sync-limit-integration.test.ts 的 mock 套路（vi.hoisted + vi.mock supabase-repository）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { PracticeRecord, PracticeOption, UserProfile } from "@/lib/supabase"

// ==================== Mocks ====================

const {
  upsertRecordsMock,
  fetchCloudRecordsForMergeMock,
  upsertOptionsMock,
  deleteAllUserRecordsMock,
  deleteAllUserOptionsMock,
  fetchAllUserDataMock,
} = vi.hoisted(() => ({
  upsertRecordsMock: vi.fn().mockResolvedValue({ error: null }),
  fetchCloudRecordsForMergeMock: vi.fn().mockResolvedValue({ data: [], error: null }),
  upsertOptionsMock: vi.fn().mockResolvedValue({ error: null }),
  deleteAllUserRecordsMock: vi.fn().mockResolvedValue({ error: null }),
  deleteAllUserOptionsMock: vi.fn().mockResolvedValue({ error: null }),
  fetchAllUserDataMock: vi.fn().mockResolvedValue({
    recordsRes: { data: [], error: null },
    optionsRes: { data: [], error: null },
    profileRes: { data: null, error: null },
  }),
}))

vi.mock("@/lib/supabase-repository", () => ({
  fetchAllUserData: fetchAllUserDataMock,
  fetchCloudRecordsForMerge: fetchCloudRecordsForMergeMock,
  upsertRecords: upsertRecordsMock,
  upsertOptions: upsertOptionsMock,
  deleteAllUserRecords: deleteAllUserRecordsMock,
  deleteAllUserOptions: deleteAllUserOptionsMock,
}))

vi.mock("@/lib/sync-retry", () => ({
  withRetry: async (fn: () => Promise<unknown>) => fn(),
  persistFailedSyncIds: vi.fn(),
  loadFailedSyncIds: () => [],
}))

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  } as Response),
)

// localStorage mock（react-use useLocalStorage 依赖）
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()
vi.stubGlobal("localStorage", localStorageMock)

// ==================== Helpers ====================

function makeRecords(count: number): PracticeRecord[] {
  const baseDate = new Date(2020, 0, 1).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Array.from({ length: count }, (_, i) => {
    const isoDate = new Date(baseDate + i * dayMs).toISOString().slice(0, 10)
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

describe("useSync — 用户隔离 & 回滚 L3", () => {
  describe("测试 1：未登录用户调 uploadLocalData 必须被拒绝", () => {
    it("user=null → fetch / upsert / upsertOptions 全部未被调用，返回 success=false", async () => {
      const { useSync } = await import("@/hooks/useSync")
      const records = makeRecords(3)
      const options: PracticeOption[] = []
      const profile = makeProfile()

      const { result } = renderHook(() =>
        useSync(
          null, // ⭐ 未登录
          { records, options, profile },
          vi.fn(),
          vi.fn(),
        ),
      )

      let res: any
      await act(async () => {
        // @ts-expect-error: 故意用 null user 测试守卫
        res = await result.current.uploadLocalData("u1", { records, options, profile }, null)
      })

      // 验证返回值是 silent-fail shape
      expect(res.success).toBe(false)
      expect(res.totalCount).toBe(0)

      // 关键：所有写库 / 网络操作都必须未被调用
      expect(fetch).not.toHaveBeenCalled()
      expect(upsertRecordsMock).not.toHaveBeenCalled()
      expect(upsertOptionsMock).not.toHaveBeenCalled()
      expect(deleteAllUserRecordsMock).not.toHaveBeenCalled()
      expect(deleteAllUserOptionsMock).not.toHaveBeenCalled()
    })

    it("user=undefined → 同样被拒绝（falsy 守卫）", async () => {
      const { useSync } = await import("@/hooks/useSync")
      const records = makeRecords(2)

      const { result } = renderHook(() =>
        useSync(
          undefined,
          { records, options: [], profile: makeProfile() },
          vi.fn(),
          vi.fn(),
        ),
      )

      let res: any
      await act(async () => {
        res = await result.current.uploadLocalData(
          "u1",
          { records, options: [], profile: makeProfile() },
          undefined,
        )
      })

      expect(res.success).toBe(false)
      expect(upsertRecordsMock).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe("测试 2：resolveConflict('local') 删除 options 静默失败 → 必须 throw 并 setSyncStatus('error')", () => {
    it("repoDeleteAllUserOptions 返回 error → syncStatus='error'", async () => {
      // 安排：records 删除成功，options 删除失败
      deleteAllUserRecordsMock.mockResolvedValueOnce({ error: null })
      deleteAllUserOptionsMock.mockResolvedValueOnce({
        error: new Error("mock 删除选项失败"),
      })
      // 同时让 fetchAllUserData 在 resolveConflict 内的 downloadRemoteData 返回空集
      fetchAllUserDataMock.mockResolvedValueOnce({
        recordsRes: { data: [], error: null },
        optionsRes: { data: [], error: null },
        profileRes: { data: null, error: null },
      })

      const { useSync } = await import("@/hooks/useSync")
      const records = makeRecords(2)

      const { result } = renderHook(() =>
        useSync(
          emptyUser,
          { records, options: [], profile: makeProfile() },
          vi.fn(),
          vi.fn(),
        ),
      )

      await act(async () => {
        await result.current.resolveConflict("local")
      })

      // 验证：因为没有走到上传分支（throw 在前），upsert 不应被调用
      expect(upsertRecordsMock).not.toHaveBeenCalled()

      // syncStatus 应为 error
      expect(result.current.syncStatus).toBe("error")
    })
  })

  describe("测试 3：resolveConflict('local') 删除成功 + 上传失败 → syncStatus='error'", () => {
    it("upsert 返回 error → syncStatus='error'，result.success=false 触发 throw", async () => {
      // 安排：两个删除都成功，但 upsert 失败
      deleteAllUserRecordsMock.mockResolvedValueOnce({ error: null })
      deleteAllUserOptionsMock.mockResolvedValueOnce({ error: null })
      // fetchAllUserData 在 downloadRemoteData 内调用
      fetchAllUserDataMock.mockResolvedValueOnce({
        recordsRes: { data: [], error: null },
        optionsRes: { data: [], error: null },
        profileRes: { data: null, error: null },
      })
      // upsert 失败：uploadLocalData 内部会 catch 这个 error 并把 success 置 false
      upsertRecordsMock.mockResolvedValueOnce({ error: new Error("mock 上传记录失败") })

      const { useSync } = await import("@/hooks/useSync")
      const records = makeRecords(3)

      const { result } = renderHook(() =>
        useSync(
          emptyUser,
          { records, options: [], profile: makeProfile() },
          vi.fn(),
          vi.fn(),
        ),
      )

      await act(async () => {
        await result.current.resolveConflict("local")
      })

      // 关键断言：删除都被调用、upsert 也被调用（但失败），最终 syncStatus 是 error
      expect(deleteAllUserRecordsMock).toHaveBeenCalledWith("u1")
      expect(deleteAllUserOptionsMock).toHaveBeenCalledWith("u1")
      expect(upsertRecordsMock).toHaveBeenCalled()
      expect(result.current.syncStatus).toBe("error")
    })
  })
})
