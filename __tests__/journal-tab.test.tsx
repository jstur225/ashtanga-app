import React, { type ComponentProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JournalTab } from "@/components/journal/JournalTab"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) => {
        const Component = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
          const safeProps = { ...props }
          delete (safeProps as Record<string, unknown>).initial
          delete (safeProps as Record<string, unknown>).animate
          delete (safeProps as Record<string, unknown>).exit
          delete (safeProps as Record<string, unknown>).transition
          return React.createElement(tag, safeProps, children)
        }
        return Component
      },
    },
  ),
}))

vi.mock("@/components/journal/MonthlyHeatmap", () => ({
  MonthlyHeatmap: (props: Record<string, unknown>) => {
    const { onAddRecord } = props as { onAddRecord?: () => void }
    return (
      <div data-testid="monthly-heatmap">
        <button type="button" onClick={onAddRecord} data-testid="add-record-btn">
          +
        </button>
      </div>
    )
  },
}))

vi.mock("@/components/practice-record/RecordModals", () => ({
  EditRecordModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-modal" /> : null,
  AddPracticeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-modal" /> : null,
}))

vi.mock("@/components/ShareCardModal", () => ({
  ShareCardModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="share-modal" /> : null,
}))

vi.mock("@/components/MonthlyStatsShareModal", () => ({
  MonthlyStatsShareModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="stats-share-modal" /> : null,
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-15T08:00:00+08:00"))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function record(overrides: Partial<PracticeRecord> = {}): PracticeRecord {
  return {
    id: `record-${Math.random().toString(36).slice(2, 8)}`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    date: "2026-06-01",
    type: "一序列",
    duration: 3600,
    notes: "",
    photos: [],
    ...overrides,
  }
}

const practiceOptions: PracticeOption[] = [
  {
    id: "opt-1",
    created_at: "2026-01-01T00:00:00.000Z",
    label: "一序列",
    notes: "",
    is_custom: false,
    color_level: 4,
  },
]

const profile: UserProfile = {
  id: "profile-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  name: "练习者",
  signature: "练习、练习",
  avatar: null,
}

function createProps(
  overrides: Partial<ComponentProps<typeof JournalTab>> = {},
): ComponentProps<typeof JournalTab> {
  return {
    practiceHistory: [],
    practiceOptions,
    profile,
    onEditRecord: vi.fn(),
    onDeleteRecord: vi.fn(),
    onAddRecord: vi.fn() as ComponentProps<typeof JournalTab>["onAddRecord"],
    onOpenFakeDoor: vi.fn(),
    onOpenVoiceFakeDoor: vi.fn(),
    onOpenPhotoFakeDoor: vi.fn(),
    onShowMembershipPrompt: vi.fn(),
    votedCloud: false,
    onLogExport: vi.fn(),
    editingRecord: null,
    onSetEditingRecord: vi.fn(),
    showAddModal: false,
    onSetShowAddModal: vi.fn(),
    syncStatus: "idle" as const,
    user: null,
    onOpenXiaohongshuModal: vi.fn(),
    hasNewXhsMessage: false,
    onReadInvite: vi.fn(),
    isPro: false,
    ...overrides,
  }
}

describe("JournalTab", () => {
  it("无记录时显示查看更多按钮（最早记录为空）", () => {
    render(<JournalTab {...createProps({ practiceHistory: [] })} />)
    expect(screen.getByText("查看更多")).toBeTruthy()
  })

  it("记录所在月与加载月份相同时显示已经到底啦~", () => {
    const records = [
      record({ id: "r1", date: "2026-06-01", duration: 3600 }),
    ]
    render(<JournalTab {...createProps({ practiceHistory: records })} />)
    expect(screen.getByText("已经到底啦~")).toBeTruthy()
  })

  it("渲染记录时间线：日期、时长、类型、笔记", () => {
    const records = [
      record({ id: "r1", date: "2026-06-01", duration: 3600, notes: "今天练了一序列" }),
    ]
    render(<JournalTab {...createProps({ practiceHistory: records })} />)
    expect(screen.getAllByText("6/1").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("60").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("分钟")).toBeTruthy()
    expect(screen.getByText("今天练了一序列")).toBeTruthy()
  })

  it("点击日期区域触发 onSetEditingRecord", () => {
    const onSetEditingRecord = vi.fn()
    const records = [record({ id: "r1", date: "2026-06-01", duration: 3600 })]
    render(<JournalTab {...createProps({ practiceHistory: records, onSetEditingRecord })} />)
    fireEvent.click(screen.getByText("6/1"))
    expect(onSetEditingRecord).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }))
  })

  it("点击笔记区域打开分享弹窗", () => {
    const records = [
      record({ id: "r1", date: "2026-06-01", duration: 3600, notes: "今天练了一序列" }),
    ]
    render(<JournalTab {...createProps({ practiceHistory: records })} />)
    fireEvent.click(screen.getByText("今天练了一序列"))
    expect(screen.getByTestId("share-modal")).toBeTruthy()
  })

  it("未登录用户显示绑定邮箱提示", () => {
    render(<JournalTab {...createProps({ practiceHistory: [], user: null })} />)
    expect(screen.getByText(/绑定邮箱，免费领/)).toBeTruthy()
  })

  it("已登录用户不显示绑定邮箱提示", () => {
    render(<JournalTab {...createProps({ practiceHistory: [], user: { email: "test@test.com" } })} />)
    expect(screen.queryByText(/绑定邮箱，免费领/)).toBeNull()
  })

  it("有突破笔记的记录显示 Sparkles 图标", () => {
    const records = [
      record({ id: "r1", date: "2026-06-01", duration: 3600, breakthrough: "今天突破了！" }),
    ]
    render(<JournalTab {...createProps({ practiceHistory: records })} />)
    expect(screen.getByText("今天突破了！")).toBeTruthy()
  })

  it("多个照片以网格布局渲染", () => {
    const records = [
      record({
        id: "r2",
        date: "2026-06-02",
        duration: 3600,
        notes: "有照片的记录",
        photos: ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"],
      }),
    ]
    render(<JournalTab {...createProps({ practiceHistory: records })} />)
    expect(screen.getAllByRole("img")).toHaveLength(3)
  })

  it("点击补录按钮打开添加弹窗", () => {
    const onSetShowAddModal = vi.fn()
    render(
      <JournalTab {...createProps({ practiceHistory: [], onSetShowAddModal })} />,
    )
    fireEvent.click(screen.getByTestId("add-record-btn"))
    expect(onSetShowAddModal).toHaveBeenCalledWith(true)
  })
})
