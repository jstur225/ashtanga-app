import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DataConflictModal } from "@/components/DataConflictModal"

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

describe("DataConflictModal", () => {
  it("isOpen=true 时渲染", () => {
    render(<DataConflictModal isOpen localCount={10} remoteCount={20} onSelect={vi.fn()} />)
    expect(screen.getByText("数据冲突")).toBeTruthy()
  })

  it("isOpen=false 时不渲染", () => {
    const { container } = render(<DataConflictModal isOpen={false} localCount={10} remoteCount={20} onSelect={vi.fn()} />)
    expect(container.innerHTML).toBe("")
  })

  it("显示本地和云端条数", () => {
    render(<DataConflictModal isOpen localCount={5} remoteCount={30} onSelect={vi.fn()} />)
    expect(screen.getByText("5")).toBeTruthy()
    expect(screen.getByText("30")).toBeTruthy()
  })

  it("智能合并按钮调用 onSelect('merge')", () => {
    const onSelect = vi.fn()
    render(<DataConflictModal isOpen localCount={10} remoteCount={20} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("智能合并"))
    expect(onSelect).toHaveBeenCalledWith("merge")
  })

  it("使用云端数据按钮调用 onSelect('remote')", () => {
    const onSelect = vi.fn()
    render(<DataConflictModal isOpen localCount={10} remoteCount={20} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("使用云端数据"))
    expect(onSelect).toHaveBeenCalledWith("remote")
  })

  it("云端远多于本地时保留本地需要二次确认", () => {
    const onSelect = vi.fn()
    render(<DataConflictModal isOpen localCount={5} remoteCount={30} onSelect={onSelect} />)
    // remoteCount(30) > localCount(5) * 2 → needWarning=true
    const localButton = screen.getByText("保留本地数据")
    fireEvent.click(localButton)
    // 等待二次确认弹窗出现
    expect(screen.getByText("确认删除云端数据？")).toBeTruthy()
    // 点击取消 → onSelect 未被调用
    fireEvent.click(screen.getByText("取消"))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("二次确认后调用 onSelect('local')", () => {
    const onSelect = vi.fn()
    render(<DataConflictModal isOpen localCount={5} remoteCount={30} onSelect={onSelect} />)
    const localButton = screen.getByText("保留本地数据")
    fireEvent.click(localButton)
    // 二次确认弹窗出现
    fireEvent.click(screen.getByText("确认"))
    expect(onSelect).toHaveBeenCalledWith("local")
  })

  it("云端未远多于本地时保留本地可直接选择", () => {
    const onSelect = vi.fn()
    render(<DataConflictModal isOpen localCount={20} remoteCount={30} onSelect={onSelect} />)
    // remoteCount(30) ≤ localCount(20) * 2 → needWarning=false
    const localButton = screen.getByText("保留本地数据")
    fireEvent.click(localButton)
    expect(onSelect).toHaveBeenCalledWith("local")
  })
})
