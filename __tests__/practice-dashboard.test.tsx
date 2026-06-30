import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PracticeDashboard } from "@/components/practice/PracticeDashboard"
import type { PracticeOption } from "@/hooks/usePracticeData"

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const safeProps = { ...props } as Record<string, unknown>
      delete safeProps.whileTap
      delete safeProps.layout
      delete safeProps.animate
      delete safeProps.transition
      return React.createElement(tag, safeProps, children)
    },
  }),
}))

afterEach(() => cleanup())

const options: PracticeOption[] = [
  { id: "mysore", created_at: "2026-06-19", label: "一序列", notes: "Mysore", is_custom: false },
  { id: "guided", created_at: "2026-06-19", label: "口令练习", notes: "音频", is_custom: false, is_preset: true },
  { id: "custom", created_at: "2026-06-19", label: "", is_custom: true },
]

describe("PracticeDashboard", () => {
  it("分发选项点击并展示锁定与音频状态", () => {
    const onOptionTap = vi.fn()
    render(
      <PracticeDashboard
        practiceOptions={options}
        selectedOption="mysore"
        lockedOptionIds={new Set(["guided"])}
        chantEnabled={false}
        onOptionTap={onOptionTap}
        onStartPractice={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /一序列Mysore/ }))
    expect(onOptionTap).toHaveBeenCalledWith(options[0])
    expect(screen.getByLabelText("会员专属")).toBeTruthy()
    expect(screen.getByLabelText("包含口令音频")).toBeTruthy()
    expect(screen.getByRole("button", { name: "+ 自定义" })).toBeTruthy()
  })

  it("未选择时禁止开始，选择后允许开始", () => {
    const onStartPractice = vi.fn()
    const { rerender } = render(
      <PracticeDashboard
        practiceOptions={options}
        selectedOption={null}
        lockedOptionIds={new Set()}
        chantEnabled={false}
        onOptionTap={vi.fn()}
        onStartPractice={onStartPractice}
      />,
    )

    const disabledStart = screen.getByRole("button", { name: "请先选择练习类型" })
    expect(disabledStart.hasAttribute("disabled")).toBe(true)
    fireEvent.click(disabledStart)
    expect(onStartPractice).not.toHaveBeenCalled()

    rerender(
      <PracticeDashboard
        practiceOptions={options}
        selectedOption="mysore"
        lockedOptionIds={new Set()}
        chantEnabled={false}
        onOptionTap={vi.fn()}
        onStartPractice={onStartPractice}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "开始练习" }))
    expect(onStartPractice).toHaveBeenCalledTimes(1)
  })
})
