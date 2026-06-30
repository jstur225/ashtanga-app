import React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthModal } from "@/components/AuthModal"

// ==================== Mock setup (hoisted) ====================

const { toastMock, signInMock, signUpMock, fetchMock } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: signInMock, signUp: signUpMock }),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { email: "test@test.com" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
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
  vi.stubGlobal("fetch", undefined)
})

// ==================== Helpers ====================

const defaultProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onAuthSuccess: vi.fn(),
  onModeChange: vi.fn(),
})

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: email } })
  fireEvent.change(screen.getByPlaceholderText("至少8位字符"), { target: { value: password } })
}

function fillRegisterStep1(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: email } })
  const passwordInputs = screen.getAllByPlaceholderText("至少8位字符")
  fireEvent.change(passwordInputs[0], { target: { value: password } })
}

// ==================== Tests ====================

describe("AuthModal — 渲染状态", () => {
  it("login 模式渲染所有关键元素", () => {
    render(<AuthModal {...defaultProps()} mode="login" />)
    expect(screen.getByText("🔐 登录")).toBeTruthy()
    expect(screen.getByPlaceholderText("your@email.com")).toBeTruthy()
    expect(screen.getByText("忘记密码？")).toBeTruthy()
    expect(screen.getByText("取消")).toBeTruthy()
    expect(screen.getByText("登录")).toBeTruthy()
  })

  it("register 模式渲染绑定邮箱账号标题和 Pro 会员引导", () => {
    render(<AuthModal {...defaultProps()} mode="register" />)
    expect(screen.getByText("📧 绑定邮箱账号")).toBeTruthy()
    expect(screen.getByText("🎁 绑定邮箱即享31天Pro会员")).toBeTruthy()
    expect(screen.getByText("发送验证码")).toBeTruthy()
  })

  it("forgot-password 模式渲染忘记密码标题和返回登录", () => {
    render(<AuthModal {...defaultProps()} mode="forgot-password" />)
    expect(screen.getByText("🔑 忘记密码")).toBeTruthy()
    expect(screen.getByPlaceholderText("your@email.com")).toBeTruthy()
    expect(screen.getByText("返回登录")).toBeTruthy()
  })
})

describe("AuthModal — 模式切换与关闭", () => {
  it("login 模式点击「忘记密码？」→ onModeChange('forgot-password')", () => {
    const props = defaultProps()
    render(<AuthModal {...props} mode="login" />)
    fireEvent.click(screen.getByText("忘记密码？"))
    expect(props.onModeChange).toHaveBeenCalledWith("forgot-password")
  })

  it("forgot-password 模式点击「返回登录」→ onModeChange('login')", () => {
    const props = defaultProps()
    render(<AuthModal {...props} mode="forgot-password" />)
    fireEvent.click(screen.getByText("返回登录"))
    expect(props.onModeChange).toHaveBeenCalledWith("login")
  })

  it("login 模式点击 X 关闭按钮 → onClose", () => {
    const onClose = vi.fn()
    render(<AuthModal {...defaultProps()} mode="login" onClose={onClose} />)
    // AuthModal 通过 createPortal 渲染到 document.body
    const buttons = Array.from(document.body.querySelectorAll("button"))
    const closeBtn = buttons.find((btn) => {
      return btn.textContent?.trim() === "" && btn.querySelector("svg")
    }) as HTMLElement
    expect(closeBtn).toBeTruthy()
    if (closeBtn) fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("register 模式点击「取消」按钮 → onClose", () => {
    const onClose = vi.fn()
    render(<AuthModal {...defaultProps()} mode="register" onClose={onClose} />)
    fireEvent.click(screen.getByText("取消"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("login 模式点击「取消」按钮 → onClose", () => {
    const onClose = vi.fn()
    render(<AuthModal {...defaultProps()} mode="login" onClose={onClose} />)
    fireEvent.click(screen.getByText("取消"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("点击背景遮罩 → onClose", () => {
    const onClose = vi.fn()
    render(<AuthModal {...defaultProps()} mode="login" onClose={onClose} />)
    // 背景遮罩也在 document.body（portal）
    const backdrop = document.body.querySelector(".fixed.inset-0") as HTMLElement
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("AuthModal — 注册步骤 1：密码强度验证", () => {
  it("密码 < 8 位 → 显示「密码至少需要8位字符」", () => {
    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "Ab1")
    fireEvent.click(screen.getByText("发送验证码"))
    expect(screen.getByText("密码至少需要8位字符")).toBeTruthy()
  })

  it("密码无字母 → 显示「密码必须包含字母」", () => {
    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "12345678")
    fireEvent.click(screen.getByText("发送验证码"))
    expect(screen.getByText("密码必须包含字母")).toBeTruthy()
  })

  it("密码无数字 → 显示「密码必须包含数字」", () => {
    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "abcdefgh")
    fireEvent.click(screen.getByText("发送验证码"))
    expect(screen.getByText("密码必须包含数字")).toBeTruthy()
  })

  it("弱密码（qwerty123）→ 显示「密码过于简单」", () => {
    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "qwerty123")
    fireEvent.click(screen.getByText("发送验证码"))
    expect(screen.getByText("密码过于简单，请使用更强的密码")).toBeTruthy()
  })
})

describe("AuthModal — 注册步骤 1 → 步骤 2 流转", () => {
  it("合法密码 + fetch 成功 → 切换到验证码输入步骤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response))

    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "Abcd1234")

    await act(async () => {
      fireEvent.click(screen.getByText("发送验证码"))
    })

    // 切换后应出现「确认并注册」按钮
    expect(screen.getByText("确认并注册")).toBeTruthy()
    expect(toastMock.success).toHaveBeenCalled()
  })

  it("合法密码 + fetch 失败 → 显示错误，不切换步骤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "发送失败，请稍后再试" }),
    } as Response))

    render(<AuthModal {...defaultProps()} mode="register" />)
    fillRegisterStep1("test@test.com", "Abcd1234")

    await act(async () => {
      fireEvent.click(screen.getByText("发送验证码"))
    })

    // 步骤未切换，仍在 form 步骤
    expect(screen.getByText("发送验证码")).toBeTruthy()
    // 错误显示
    expect(screen.getByText("发送失败，请稍后再试")).toBeTruthy()
  })
})

describe("AuthModal — 登录提交", () => {
  it("登录成功 → 调用 onAuthSuccess + onClose", async () => {
    signInMock.mockResolvedValueOnce({ error: null })

    const props = defaultProps()
    render(<AuthModal {...props} mode="login" />)
    fillLogin("test@test.com", "Abcd1234")

    await act(async () => {
      fireEvent.click(screen.getByText("登录"))
    })

    expect(signInMock).toHaveBeenCalledWith("test@test.com", "Abcd1234")
    expect(props.onAuthSuccess).toHaveBeenCalledTimes(1)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it("登录失败（Invalid login credentials）→ 显示翻译错误「邮箱或密码错误」", async () => {
    signInMock.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } })

    const props = defaultProps()
    render(<AuthModal {...props} mode="login" />)
    fillLogin("wrong@test.com", "WrongPass1")

    await act(async () => {
      fireEvent.click(screen.getByText("登录"))
    })

    expect(screen.getByText("邮箱或密码错误")).toBeTruthy()
    expect(props.onAuthSuccess).not.toHaveBeenCalled()
  })

  it("登录网络错误 → 显示「网络连接失败...」", async () => {
    signInMock.mockRejectedValueOnce(new Error("Failed to fetch"))

    render(<AuthModal {...defaultProps()} mode="login" />)
    fillLogin("test@test.com", "Abcd1234")

    await act(async () => {
      fireEvent.click(screen.getByText("登录"))
    })

    expect(screen.getByText(/网络连接失败/)).toBeTruthy()
  })
})

describe("AuthModal — 忘记密码步骤流转", () => {
  it("邮箱为空点击发送验证码 → 显示「请输入邮箱地址」", () => {
    render(<AuthModal {...defaultProps()} mode="forgot-password" />)
    fireEvent.click(screen.getByText("发送验证码"))
    expect(screen.getByText("请输入邮箱地址")).toBeTruthy()
  })

  it("填邮箱 + fetch 成功 → 切换到验证码步骤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response))

    render(<AuthModal {...defaultProps()} mode="forgot-password" />)
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "test@test.com" } })

    await act(async () => {
      fireEvent.click(screen.getByText("发送验证码"))
    })

    // 进入 verify 步骤
    expect(screen.getByText("下一步")).toBeTruthy()
    expect(toastMock.success).toHaveBeenCalled()
  })

  it("验证码长度不对点击下一步 → 显示「请输入6位验证码」", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response))

    render(<AuthModal {...defaultProps()} mode="forgot-password" />)
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "test@test.com" } })

    await act(async () => {
      fireEvent.click(screen.getByText("发送验证码"))
    })

    // 验证码步骤，不填验证码直接下一步
    fireEvent.click(screen.getByText("下一步"))
    expect(screen.getByText("请输入6位验证码")).toBeTruthy()
  })
})
