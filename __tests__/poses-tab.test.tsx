import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
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
  it("云端投票状态仍在加载时立即显示投票入口", () => {
    localStorage.setItem("ashtanga_uuid", "6cf9a14d-fac4-4a11-a363-cc8f3317ecf8")
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))

    render(<PosesTab />)

    expect(screen.getByText("要不要继续完善体式库？")).toBeTruthy()
    expect(screen.getByRole("button", { name: "要" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "不需要" })).toBeTruthy()
  })

  it("本地已有投票时立即显示感谢状态", () => {
    localStorage.setItem("pose_library_improvement_vote", JSON.stringify("yes"))
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))

    render(<PosesTab />)

    expect(screen.getByText("您已投票，感谢参与。")).toBeTruthy()
  })
})
