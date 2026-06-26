import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { User } from "@supabase/supabase-js"
import type { PracticeOption, PracticeRecord } from "@/hooks/usePracticeData"
import { deletePracticeRecord } from "@/lib/database"
import {
  getPracticeOptionRules,
  normalizeOptionColorLevel,
  usePracticeCommands,
} from "@/hooks/usePracticeCommands"

const { toast } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(() => "toast-id"), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
}))

vi.mock("sonner", () => ({ toast }))
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), setUserProfile: vi.fn() }))
vi.mock("@/lib/database", () => ({ deletePracticeRecord: vi.fn() }))
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })),
  },
}))

const option = (id: string, overrides: Partial<PracticeOption> = {}): PracticeOption => ({
  id,
  created_at: "2026-06-22T00:00:00.000Z",
  label: id,
  is_custom: true,
  ...overrides,
})

function createArgs(overrides: Record<string, unknown> = {}) {
  const practiceOptions = [option("one"), option("two")]
  return {
    user: null,
    practiceOptions,
    selectedOption: null,
    membershipIsPro: false,
    chantEnabled: false,
    chantDelaySeconds: 60,
    setPracticeOptions: vi.fn(),
    setSelectedOption: vi.fn(),
    setCustomPracticeName: vi.fn(),
    setChantEnabled: vi.fn(),
    setChantMins: vi.fn(),
    setChantSecs: vi.fn(),
    setShowChantSettings: vi.fn(),
    setEditingOption: vi.fn(),
    setShowEditModal: vi.fn(),
    setShowCustomModal: vi.fn(),
    setMembershipPromptReason: vi.fn(),
    setShowMembershipPrompt: vi.fn(),
    fetchTodayCount: vi.fn(),
    updateOption: vi.fn(),
    deleteOption: vi.fn(),
    addOption: vi.fn(() => option("new")),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    addRecord: vi.fn((record) => ({
      ...record,
      id: "record-new",
      created_at: "2026-06-22T00:00:00.000Z",
      updated_at: "2026-06-22T00:00:00.000Z",
      photos: [],
    } as PracticeRecord)),
    autoSync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("practice command rules", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("免费色阶锁定值降为默认色阶，Pro 保留原值", () => {
    expect(normalizeOptionColorLevel(false, 1)).toBe(3)
    expect(normalizeOptionColorLevel(false, 4)).toBe(3)
    expect(normalizeOptionColorLevel(false, 2)).toBe(2)
    expect(normalizeOptionColorLevel(true, 4)).toBe(4)
  })

  it("固定按钮与 custom 不占名额，免费用户锁定第四个用户选项", () => {
    const rules = getPracticeOptionRules([
      option("fixed", { is_fixed: true }),
      option("one"), option("two"), option("three"), option("four"),
      option("custom"),
    ], false)

    expect(rules.isOptionsFull).toBe(true)
    expect(rules.canDeleteOption).toBe(true)
    expect([...rules.lockedOptionIds]).toEqual(["four"])
  })

  it("免费名额已满时打开会员提示，不创建选项或触发同步", async () => {
    const args = createArgs({ practiceOptions: [option("one"), option("two"), option("three")] })
    const { result } = renderHook(() => usePracticeCommands(args as never))

    await result.current.handleAddOption("新选项", "备注", 3)

    expect(args.setMembershipPromptReason).toHaveBeenCalledWith("options_full")
    expect(args.setShowMembershipPrompt).toHaveBeenCalledWith(true)
    expect(args.addOption).not.toHaveBeenCalled()
    expect(args.autoSync).not.toHaveBeenCalled()
  })

  it("已登录用户新增选项后延迟触发同步", async () => {
    const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
    const { result } = renderHook(() => usePracticeCommands(args as never))

    await result.current.handleAddOption("新选项", "备注", 3)
    expect(args.autoSync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)
    expect(args.autoSync).toHaveBeenCalledWith("添加自定义选项后同步")
  })

  describe("handleDeleteRecord 同步路径（草稿/软删除/孤立记录）", () => {
    it("已登录 + 远端删除成功（skipConfirm=true）→ 本地删除 + 触发 autoSync，无成功 toast", async () => {
      vi.mocked(deletePracticeRecord).mockResolvedValue(true)
      const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      await result.current.handleDeleteRecord("record-1", true)

      expect(args.deleteRecord).toHaveBeenCalledWith("record-1")
      expect(deletePracticeRecord).toHaveBeenCalledWith("record-1")
      expect(args.autoSync).toHaveBeenCalledWith("删除记录后同步")
      // skipConfirm=true 时不弹成功 toast
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("已登录 + 远端删除成功（skipConfirm=false）→ 弹成功 toast + 触发 autoSync", async () => {
      vi.mocked(deletePracticeRecord).mockResolvedValue(true)
      const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      const promise = result.current.handleDeleteRecord("record-1", false)
      const confirmToastOptions = (vi.mocked(toast).mock.calls[0] as unknown as [string, any])[1]
      confirmToastOptions.action.onClick()
      await promise

      expect(args.deleteRecord).toHaveBeenCalledWith("record-1")
      expect(deletePracticeRecord).toHaveBeenCalledWith("record-1")
      expect(args.autoSync).toHaveBeenCalledWith("删除记录后同步")
      expect(toast.success).toHaveBeenCalledWith("已删除记录")
    })

    it("草稿删除（skipConfirm=true）+ 成功 → 本地删除 + 触发 autoSync", async () => {
      vi.mocked(deletePracticeRecord).mockResolvedValue(true)
      const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      await result.current.handleDeleteRecord("draft-1", true)

      expect(args.deleteRecord).toHaveBeenCalledWith("draft-1")
      expect(deletePracticeRecord).toHaveBeenCalledWith("draft-1")
      expect(toast.success).not.toHaveBeenCalled()
      expect(args.autoSync).toHaveBeenCalledWith("删除记录后同步")
    })

    it("远端删除失败（返回 false）→ 本地删除保留，不触发 autoSync", async () => {
      vi.mocked(deletePracticeRecord).mockResolvedValue(false)
      const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      await result.current.handleDeleteRecord("record-1", true)

      expect(args.deleteRecord).toHaveBeenCalledWith("record-1")
      expect(args.autoSync).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("删除同步失败，记录仅在本设备删除")
    })

    it("未登录用户 → 本地删除成功，不触发 autoSync", async () => {
      vi.mocked(deletePracticeRecord).mockResolvedValue(true)
      const args = createArgs({ user: null })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      await result.current.handleDeleteRecord("record-1", true)

      expect(args.deleteRecord).toHaveBeenCalledWith("record-1")
      expect(deletePracticeRecord).toHaveBeenCalledWith("record-1")
      expect(args.autoSync).not.toHaveBeenCalled()
    })

    it("远端调用异常 → 本地删除保留，异常向上传播，不触发 autoSync", async () => {
      vi.mocked(deletePracticeRecord).mockRejectedValue(new Error("网络错误"))
      const args = createArgs({ user: { id: "user-1", email: "user@example.com" } as User })
      const { result } = renderHook(() => usePracticeCommands(args as never))

      // handleDeleteRecord 无 try/catch，异常向上传播
      await expect(result.current.handleDeleteRecord("record-1", true)).rejects.toThrow("网络错误")

      // 但本地删除已同步完成
      expect(args.deleteRecord).toHaveBeenCalledWith("record-1")
      expect(args.autoSync).not.toHaveBeenCalled()
    })
  })
})
