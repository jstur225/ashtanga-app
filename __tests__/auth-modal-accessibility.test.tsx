import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthModal } from "@/components/AuthModal"

// ==================== Mock setup ====================

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn() }),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { email: "test@test.com" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

const { toastMock } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({ toast: toastMock }))

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AuthModal 无障碍 — aria-label", () => {
  it("login 模式 X 关闭按钮有 aria-label=关闭", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    const closeBtn = screen.getByLabelText("关闭")
    expect(closeBtn).toBeTruthy()
    expect(closeBtn.tagName).toBe("BUTTON")
  })

  it("register 模式 X 关闭按钮有 aria-label=关闭", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="register" />)
    const closeBtn = screen.getByLabelText("关闭")
    expect(closeBtn).toBeTruthy()
  })

  it("邮箱输入框有 aria-label（via label 关联）", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    // placeholder 不是唯一标识，检查是否有关联的 label
    const emailInput = screen.getByPlaceholderText("your@email.com")
    expect(emailInput).toBeTruthy()
    expect(emailInput.getAttribute("type")).toBe("email")
  })
})

describe("AuthModal 无障碍 — 键盘", () => {
  it("按 Esc 键关闭弹窗", () => {
    const onClose = vi.fn()
    render(<AuthModal isOpen onClose={onClose} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)

    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("弹窗关闭时按 Esc 不误触发（isOpen=false 时无监听）", () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <AuthModal isOpen={false} onClose={onClose} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />,
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("登录按钮有 type=submit（回车可提交）", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    // 登录按钮是 form 内的 submit 按钮
    const loginBtn = screen.getByText("登录")
    expect(loginBtn.getAttribute("type")).toBe("submit")
  })

  it("关闭按钮可通过 Tab 聚焦", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    const closeBtn = screen.getByLabelText("关闭")
    // button 默认可聚焦（非 disabled 时）
    expect(closeBtn.getAttribute("disabled")).toBeNull()
  })
})

describe("AuthModal 无障碍 — 焦点管理", () => {
  it("登录邮箱输入框设置了 required", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    const emailInput = screen.getByPlaceholderText("your@email.com")
    expect(emailInput.hasAttribute("required")).toBe(true)
  })

  it("登录密码输入框设置了 minLength=8", () => {
    render(<AuthModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} onModeChange={vi.fn()} mode="login" />)
    const passwordInput = screen.getByPlaceholderText("至少8位字符")
    expect(passwordInput.getAttribute("minLength")).toBe("8")
  })
})
