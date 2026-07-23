import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PosesTab } from "@/components/PosesTab"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, props, children),
    },
  ),
}))

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe("PosesTab", () => {
  it("站立体式详情显示梵文、中文名、呼吸和凝视点", () => {
    render(<PosesTab />)

    fireEvent.click(screen.getByRole("button", { name: "站立体式" }))
    const poseImage = screen.getByRole("img", { name: "Pādāṅguṣṭhāsana" })
    fireEvent.click(poseImage.closest("button")!)

    expect(screen.getByRole("heading", { name: "Pādāṅguṣṭhāsana" })).toBeTruthy()
    expect(screen.getByText("手抓大脚趾式")).toBeTruthy()
    expect(screen.getByText("呼气进入，停留 5 次呼吸")).toBeTruthy()
    expect(screen.getByText("鼻尖")).toBeTruthy()
    expect(screen.getByText("nāsāgre")).toBeTruthy()
  })

  it("搜索可通过站立体式中文名定位梵文卡片", () => {
    render(<PosesTab />)

    fireEvent.change(screen.getByPlaceholderText("搜索中文名或梵文名"), {
      target: { value: "扭转三角式" },
    })

    expect(screen.getByRole("img", { name: "Parivṛtta Trikoṇāsana" })).toBeTruthy()
  })
})
