import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MembershipPromptModal } from "@/components/Membership/MembershipPromptModal"
import { CustomPracticeModal } from "@/components/practice/OptionModals"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => React.createElement(tag, props, children),
  }),
}))

vi.mock("@/components/Membership/MembershipCard", () => ({
  MembershipCard: ({ headerAction }: { headerAction?: React.ReactNode }) => (
    <div>
      <div>会员权益</div>
      {headerAction}
    </div>
  ),
}))
vi.mock("@/components/Membership/MembershipActions", () => ({ MembershipActions: () => <div>会员操作</div> }))

afterEach(() => cleanup())

function NestedModalHarness() {
  const [showParent, setShowParent] = React.useState(true)
  const [showMembership, setShowMembership] = React.useState(false)

  return (
    <>
      <CustomPracticeModal
        isOpen={showParent}
        onClose={() => setShowParent(false)}
        onConfirm={vi.fn()}
        isFull={false}
        maxSlots={3}
        membership={{ is_active: false }}
        onShowMembershipPrompt={() => setShowMembership(true)}
      />
      <MembershipPromptModal
        isOpen={showMembership}
        onClose={() => setShowMembership(false)}
        reason="color_level"
      />
    </>
  )
}

describe("MembershipPromptModal stacking regression", () => {
  // Regression: ISSUE-001 — 子会员弹窗层级低于父弹窗，关闭时可能误触父弹窗
  // Found by /qa on 2026-06-18
  // Report: .gstack/qa-reports/qa-report-localhost-2026-06-18.md
  it("会员提示覆盖父弹窗，关闭后父弹窗保持打开", () => {
    render(<NestedModalHarness />)

    fireEvent.click(screen.getByRole("button", { name: "色阶 1（Pro）" }))
    const membershipClose = screen.getByRole("button", { name: "关闭会员提示" })
    expect(membershipClose.closest('.z-\\[120\\]')).toBeTruthy()

    fireEvent.click(membershipClose)

    expect(screen.getByRole("dialog", { name: "自定义练习" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "关闭会员提示" })).toBeNull()
  })
})
