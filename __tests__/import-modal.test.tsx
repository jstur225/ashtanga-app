import React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { ImportModal } from "@/components/ImportModal"

vi.mock("sonner")

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

describe("ImportModal", () => {
  it("isOpen=true 时渲染", () => {
    render(<ImportModal isOpen onClose={vi.fn()} onImport={vi.fn()} />)
    expect(screen.getByText("导入数据胶囊")).toBeTruthy()
  })

  it("isOpen=false 时不渲染", () => {
    const { container } = render(<ImportModal isOpen={false} onClose={vi.fn()} onImport={vi.fn()} />)
    expect(container.innerHTML).toBe("")
  })

  it("空文本点击确认时提示错误", () => {
    render(<ImportModal isOpen onClose={vi.fn()} onImport={vi.fn()} />)
    fireEvent.click(screen.getByText("确认导入"))
    expect(toast.error).toHaveBeenCalledWith("请先粘贴数据胶囊")
  })

  it("输入文本后点击确认调用 onImport", () => {
    const onImport = vi.fn()
    render(<ImportModal isOpen onClose={vi.fn()} onImport={onImport} />)

    const textarea = screen.getByPlaceholderText("在此粘贴数据胶囊...")
    fireEvent.change(textarea, { target: { value: '{"records":[]}' } })
    fireEvent.click(screen.getByText("确认导入"))

    expect(onImport).toHaveBeenCalledWith('{"records":[]}')
  })

  it("确认后清空输入框", async () => {
    const onImport = vi.fn()
    render(<ImportModal isOpen onClose={vi.fn()} onImport={onImport} />)

    const textarea = screen.getByPlaceholderText("在此粘贴数据胶囊...") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '{"records":[]}' } })

    await act(async () => {
      fireEvent.click(screen.getByText("确认导入"))
    })

    // 重新查找 textarea（可能因 state 更新重新渲染）
    const freshTextarea = screen.getByPlaceholderText("在此粘贴数据胶囊...") as HTMLTextAreaElement
    expect(freshTextarea.value).toBe("")
  })

  it("单击背景调用 onClose", () => {
    const onClose = vi.fn()
    const { container } = render(<ImportModal isOpen onClose={onClose} onImport={vi.fn()} />)
    // 背景遮罩是第一个 div
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
