import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { BreathingRipples, ConfirmEndDialog } from "@/components/practice/PracticeSessionControls"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => React.createElement(tag, props, children),
  }),
}))

afterEach(() => cleanup())

describe("PracticeSessionControls", () => {
  it("暂停时隐藏呼吸波纹", () => {
    const { container, rerender } = render(<BreathingRipples isPaused={false} />)
    expect(container.querySelectorAll(".animate-ripple, .animate-ripple-delayed")).toHaveLength(2)
    rerender(<BreathingRipples isPaused />)
    expect(container.children).toHaveLength(0)
  })

  it("结束确认框分发关闭、放弃与保存动作", () => {
    const onClose = vi.fn()
    const onDiscard = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmEndDialog isOpen onClose={onClose} onDiscard={onDiscard} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: "不保存退出" }))
    fireEvent.click(screen.getByRole("button", { name: "保存并退出" }))
    fireEvent.click(screen.getByRole("button", { name: "关闭结束确认" }))
    fireEvent.click(screen.getByTestId("confirm-end-backdrop"))

    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
