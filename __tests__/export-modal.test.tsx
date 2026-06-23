import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExportModal } from "@/components/ExportModal"

const testData = JSON.stringify(
  { records: [{ id: "1", date: "2026-06-01" }], options: [], export_at: "2026-06-23T00:00:00.000Z" },
)

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const safeProps = { ...props } as Record<string, unknown>
      delete safeProps.initial
      delete safeProps.animate
      delete safeProps.exit
      delete safeProps.transition
      return React.createElement(tag, safeProps, children)
    },
  }),
}))

afterEach(() => cleanup())

describe("ExportModal", () => {
  it("isOpen=true 时渲染", () => {
    render(<ExportModal isOpen onClose={vi.fn()} data={testData} />)
    expect(screen.getByText("导出数据胶囊")).toBeTruthy()
  })

  it("isOpen=false 时不渲染", () => {
    const { container } = render(<ExportModal isOpen={false} onClose={vi.fn()} data={testData} />)
    expect(container.innerHTML).toBe("")
  })

  it("显示传入的数据", () => {
    render(<ExportModal isOpen onClose={vi.fn()} data={testData} />)
    // textarea 为只读，用 getByRole 查找
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.readOnly).toBe(true)
    // 验证内容包含数据字段
    expect(textarea.value).toContain("records")
    expect(textarea.value).toContain("2026-06-01")
  })

  it("显示复制按钮", () => {
    render(<ExportModal isOpen onClose={vi.fn()} data={testData} />)
    expect(screen.getByText("一键复制")).toBeTruthy()
  })

  it("显示提示信息", () => {
    render(<ExportModal isOpen onClose={vi.fn()} data={testData} />)
    expect(screen.getByText(/完整数据/)).toBeTruthy()
    expect(screen.getByText(/妥善保存/)).toBeTruthy()
  })

  it("单击背景调用 onClose", () => {
    const onClose = vi.fn()
    const { container } = render(<ExportModal isOpen onClose={onClose} data={testData} />)
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
