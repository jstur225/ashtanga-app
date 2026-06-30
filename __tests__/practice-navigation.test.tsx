import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { hasOpenPracticeOverlay, PracticeNavigation } from "@/components/practice/PracticeNavigation"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => React.createElement(tag, props, children),
  }),
}))

afterEach(() => cleanup())

describe("PracticeNavigation", () => {
  it("任一页面覆盖层打开时隐藏导航", () => {
    expect(hasOpenPracticeOverlay({ customModal: false, settings: false })).toBe(false)
    expect(hasOpenPracticeOverlay({ customModal: true, settings: false })).toBe(true)
  })

  it("标记当前 Tab，并分发四个导航目标", () => {
    const onChange = vi.fn()
    render(<PracticeNavigation activeTab="journal" hidden={false} onChange={onChange} />)

    expect(screen.getByRole("navigation", { name: "主要导航" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "觉察日记" }).getAttribute("aria-current")).toBe("page")

    fireEvent.click(screen.getByRole("button", { name: "今日练习" }))
    fireEvent.click(screen.getByRole("button", { name: "觉察日记" }))
    fireEvent.click(screen.getByRole("button", { name: "体式库" }))
    fireEvent.click(screen.getByRole("button", { name: "我的数据" }))

    expect(onChange.mock.calls.map(([tab]) => tab)).toEqual(["practice", "journal", "poses", "stats"])
  })

  it("有弹窗时不渲染导航", () => {
    render(<PracticeNavigation activeTab="practice" hidden onChange={vi.fn()} />)
    expect(screen.queryByRole("navigation", { name: "主要导航" })).toBeNull()
  })
})
