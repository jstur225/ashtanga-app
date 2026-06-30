import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CompletionSheet } from "@/components/practice-record/CompletionSheet"
import type { PracticeRecord } from "@/hooks/usePracticeData"

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: mocks.toast }))

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(tag, props, children),
  }),
}))

vi.mock("@/components/practice-record/RecordPickers", () => ({
  DatePickerModal: () => null,
  TypeSelectorModal: () => null,
}))

vi.mock("@/components/PracticeForm", () => ({
  PracticeForm: ({ onSave }: { onSave: (data: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onSave({
        date: "2026-06-18",
        type: "一序列",
        duration: 75,
        notes: "完成记录",
        breakthrough: "新突破",
        photos: ["photo.jpg"],
        color_level: 3,
      })}
    >
      保存练习
    </button>
  ),
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

const draft: PracticeRecord = {
  id: "draft-1",
  created_at: "2026-06-18T00:00:00.000Z",
  updated_at: "2026-06-18T00:00:00.000Z",
  date: "2026-06-18",
  type: "一序列",
  duration: 3600,
  notes: "",
  photos: [],
}

function renderCompletion(overrides: Record<string, unknown> = {}) {
  const props = {
    isOpen: true,
    practiceType: "一序列",
    duration: "60",
    startTime: "2026-06-18T01:00:00.000Z",
    onFinalizeRecord: vi.fn(),
    onClose: vi.fn(),
    addRecord: vi.fn().mockReturnValue(draft),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    onDeleteDraft: vi.fn(),
    autoSync: vi.fn().mockResolvedValue(true),
    user: { email: "user@example.com" },
    userProfile: null,
    practiceOptions: [{
      id: "primary",
      created_at: "2026-01-01T00:00:00.000Z",
      label: "一序列",
      is_custom: false,
      color_level: 3,
    }],
    isPro: false,
    ...overrides,
  }

  const view = render(<CompletionSheet {...props} />)
  return { props, ...view }
}

describe("CompletionSheet", () => {
  it("打开时创建草稿，并为登录用户延迟触发同步", async () => {
    const { props } = renderCompletion()

    expect(props.addRecord).toHaveBeenCalledWith(expect.objectContaining({
      type: "一序列",
      duration: 3600,
      color_level: 3,
    }))

    await vi.advanceTimersByTimeAsync(500)
    expect(props.autoSync).toHaveBeenCalledWith("完成弹窗草稿创建后同步")
  })

  it("保存时把草稿更新为正式记录并关闭弹窗", async () => {
    const { props } = renderCompletion()

    fireEvent.click(screen.getByText("保存练习"))

    expect(props.addRecord).toHaveBeenCalledTimes(1)
    expect(props.updateRecord).toHaveBeenCalledWith("draft-1", expect.objectContaining({
      date: "2026-06-18",
      type: "一序列",
      duration: 4500,
      notes: "完成记录",
      breakthrough: "新突破",
      photos: ["photo.jpg"],
      color_level: 3,
      start_time: "2026-06-18T01:00:00.000Z",
    }))
    expect(props.onFinalizeRecord).toHaveBeenCalledWith(expect.objectContaining({
      id: "draft-1",
      duration: 4500,
      start_time: "2026-06-18T01:00:00.000Z",
    }))
    expect(mocks.toast.success).toHaveBeenCalledWith("记录已保存！")
    expect(props.onClose).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)
    expect(props.autoSync).toHaveBeenCalledWith("完成弹窗保存记录后同步")
  })

  it("组件直接卸载时清理最新草稿", () => {
    const { props, unmount } = renderCompletion()

    unmount()

    expect(props.onDeleteDraft).toHaveBeenCalledWith("draft-1")
  })

  it("快速重复保存只提交一次", () => {
    const { props } = renderCompletion()

    fireEvent.click(screen.getByText("保存练习"))
    fireEvent.click(screen.getByText("保存练习"))

    expect(props.updateRecord).toHaveBeenCalledTimes(1)
    expect(props.onFinalizeRecord).toHaveBeenCalledTimes(1)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it("保存失败时保留草稿并允许再次提交", () => {
    const updateRecord = vi.fn()
      .mockImplementationOnce(() => { throw new Error("storage unavailable") })
    const { props } = renderCompletion({ updateRecord })

    fireEvent.click(screen.getByText("保存练习"))
    expect(mocks.toast.error).toHaveBeenCalledWith("保存失败，请重试")
    expect(props.onFinalizeRecord).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("保存练习"))
    expect(updateRecord).toHaveBeenCalledTimes(2)
    expect(props.onFinalizeRecord).toHaveBeenCalledTimes(1)
  })

  it("关闭时草稿删除失败会在卸载时重试", () => {
    const onDeleteDraft = vi.fn()
      .mockImplementationOnce(() => { throw new Error("delete unavailable") })
    const { props, rerender, unmount } = renderCompletion({ onDeleteDraft })

    rerender(<CompletionSheet {...props} isOpen={false} />)
    expect(mocks.toast.error).toHaveBeenCalledWith("草稿清理失败，将自动重试")

    unmount()
    expect(onDeleteDraft).toHaveBeenCalledTimes(2)
  })
})
