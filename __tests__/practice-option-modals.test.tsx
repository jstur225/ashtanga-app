import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CustomPracticeModal, EditOptionModal } from "@/components/practice/OptionModals"
import type { PracticeOption } from "@/hooks/usePracticeData"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => React.createElement(tag, props, children),
  }),
}))

afterEach(() => cleanup())

const option: PracticeOption = {
  id: "custom-1",
  created_at: "2026-06-18T00:00:00.000Z",
  label: "一序列",
  notes: "稳定呼吸",
  is_custom: true,
  color_level: 4,
}

describe("CustomPracticeModal", () => {
  it("空名称不能提交，并限制名称与备注长度", () => {
    const onConfirm = vi.fn()
    render(<CustomPracticeModal isOpen onClose={vi.fn()} onConfirm={onConfirm} isFull={false} maxSlots={8} membership={{ is_active: true }} onShowMembershipPrompt={vi.fn()} />)

    const submit = screen.getByRole("button", { name: "添加选项" }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/练习名称/), { target: { value: "123456789012345" } })
    fireEvent.change(screen.getByLabelText(/备注/), { target: { value: "123456789012345678" } })
    fireEvent.click(screen.getByRole("button", { name: "色阶 1" }))
    fireEvent.click(screen.getByRole("button", { name: "添加选项" }))

    expect(onConfirm).toHaveBeenCalledWith("1234567890", "12345678901234", 1)
  })

  it("免费用户点击锁定色阶只打开会员提示", () => {
    const onPrompt = vi.fn()
    const onConfirm = vi.fn()
    render(<CustomPracticeModal isOpen onClose={vi.fn()} onConfirm={onConfirm} isFull={false} maxSlots={3} membership={{ is_active: false }} onShowMembershipPrompt={onPrompt} />)

    fireEvent.change(screen.getByLabelText(/练习名称/), { target: { value: "练习" } })
    fireEvent.click(screen.getByRole("button", { name: "色阶 1（Pro）" }))
    fireEvent.click(screen.getByRole("button", { name: "添加选项" }))

    expect(onPrompt).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith("练习", "", 3)
  })

  it("满额时只显示上限说明", () => {
    render(<CustomPracticeModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} isFull maxSlots={8} membership={null} onShowMembershipPrompt={vi.fn()} />)
    expect(screen.getByText("选项已满（Pro会员最多8个）")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "添加选项" })).toBeNull()
  })
})

describe("EditOptionModal", () => {
  it("免费用户加载 Pro 色阶时降级为 3，并保存编辑", () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<EditOptionModal isOpen onClose={onClose} option={option} onSave={onSave} onDelete={vi.fn()} canDelete membership={{ is_active: false }} />)

    fireEvent.change(screen.getByLabelText(/名称/), { target: { value: "修改后的练习名称" } })
    fireEvent.click(screen.getByRole("button", { name: "保存" }))

    expect(onSave).toHaveBeenCalledWith("custom-1", "修改后的练习名称".slice(0, 10), "稳定呼吸", 3)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("删除需要二次确认，取消不会删除，确认后关闭", () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(<EditOptionModal isOpen onClose={onClose} option={option} onSave={vi.fn()} onDelete={onDelete} canDelete membership={{ is_active: true }} />)

    fireEvent.click(screen.getByRole("button", { name: "删除选项" }))
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(onDelete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "删除选项" }))
    fireEvent.click(screen.getByRole("button", { name: "删除" }))
    expect(onDelete).toHaveBeenCalledWith("custom-1")
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
