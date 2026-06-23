import React, { type ComponentProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StatsTab } from "@/components/stats/StatsTab"
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

vi.mock("@/components/PWAInstallBanner", () => ({
  PWAInstallBanner: () => <div data-testid="pwa-banner" />,
}))

vi.mock("@/hooks/usePWAInstall", () => ({
  usePWAInstall: () => ({ promptInstall: vi.fn().mockResolvedValue(false) }),
}))

afterEach(() => cleanup())

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

const profile: UserProfile = {
  id: "profile-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  name: "练习者",
  signature: "练习、练习",
  avatar: null,
}

function createProps(
  overrides: Partial<ComponentProps<typeof StatsTab>> = {},
): ComponentProps<typeof StatsTab> {
  return {
    practiceHistory: [],
    practiceOptions: [],
    profile,
    membership: null,
    membershipLoading: false,
    onOpenSettings: vi.fn(),
    onOpenMembership: vi.fn(),
    onOpenFakeDoor: vi.fn(),
    showXiaohongshuModal: false,
    setShowXiaohongshuModal: vi.fn(),
    user: null,
    showPWAInstallTutorial: false,
    setShowPWAInstallTutorial: vi.fn(),
    ...overrides,
  }
}

describe("StatsTab", () => {
  it("空态显示暂无练习数据", () => {
    render(<StatsTab {...createProps()} />)
    expect(screen.getByText("暂无练习数据")).toBeTruthy()
  })

  it("有数据时显示总熬汤天数、总时数和平均分钟", () => {
    const records = [
      record({ date: "2026-06-01", duration: 3600 }),
      record({ date: "2026-06-02", duration: 1800 }),
    ]
    render(<StatsTab {...createProps({ practiceHistory: records })} />)
    expect(screen.getByText("总熬汤天数")).toBeTruthy()
    expect(screen.getByText("总熬汤时长（小时）")).toBeTruthy()
    expect(screen.getByText("平均分钟")).toBeTruthy()
  })

  it("免费用户显示 FREE 标签和升级入口", () => {
    render(<StatsTab {...createProps()} />)
    expect(screen.getByText("FREE")).toBeTruthy()
    expect(screen.getByText("升级 Pro 解锁更多功能")).toBeTruthy()
  })

  it("Pro 用户显示 PRO 标签和会员到期信息", () => {
    render(
      <StatsTab
        {...createProps({
          membership: {
            is_active: true,
            expires_at_formatted: "2026-12-31",
            days_remaining: 200,
            type: "year",
          },
        })}
      />,
    )
    expect(screen.getByText("PRO")).toBeTruthy()
    expect(screen.getByText(/Pro 有效期至/)).toBeTruthy()
    expect(screen.getByText(/200天/)).toBeTruthy()
  })

  it("会员加载中显示加载状态", () => {
    render(<StatsTab {...createProps({ membershipLoading: true })} />)
    expect(screen.getByText("正在加载会员状态...")).toBeTruthy()
  })

  it("点击设置按钮触发 onOpenSettings", () => {
    const onOpenSettings = vi.fn()
    render(<StatsTab {...createProps({ onOpenSettings })} />)
    fireEvent.click(screen.getByLabelText("打开设置"))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it("免费用户点击升级触发 onOpenMembership", () => {
    const onOpenMembership = vi.fn()
    render(<StatsTab {...createProps({ onOpenMembership })} />)
    fireEvent.click(screen.getByText("升级 Pro 解锁更多功能"))
    expect(onOpenMembership).toHaveBeenCalledTimes(1)
  })
})
