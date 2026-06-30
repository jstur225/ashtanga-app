import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ZenDatePicker, ZenSelect } from "@/components/practice/PracticePickers"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => React.createElement(tag, props, children),
  }),
}))

afterEach(() => cleanup())

describe("PracticePickers", () => {
  it("日期选择器按本地日期显示并选择日期", () => {
    const onChange = vi.fn()
    render(<ZenDatePicker value="2026-06-18" maxDate="2026-06-20" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "2026年6月18日" }))
    expect(screen.getByRole("dialog", { name: "选择日期" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "19" }))
    expect(onChange).toHaveBeenCalledWith("2026-06-19")
  })

  it("日期选择器阻止超过 maxDate 的日期和月份", () => {
    const onChange = vi.fn()
    render(<ZenDatePicker value="2026-06-18" maxDate="2026-06-20" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "2026年6月18日" }))
    fireEvent.click(screen.getByRole("button", { name: "21" }))
    fireEvent.click(screen.getByRole("button", { name: "下个月" }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText("2026年6月")).toBeTruthy()
  })

  it("下拉选择器展示标签并返回稳定 value", () => {
    const onChange = vi.fn()
    const options = [{ value: "primary", label: "一序列" }, { value: "second", label: "二序列" }]
    render(<ZenSelect value="primary" onChange={onChange} options={options} placeholder="选择练习" />)

    fireEvent.click(screen.getByRole("button", { name: /一序列/ }))
    fireEvent.click(screen.getByRole("option", { name: "二序列" }))

    expect(onChange).toHaveBeenCalledWith("second")
  })
})
