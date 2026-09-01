import React, { type ComponentProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PracticeModalHost } from "@/components/practice/PracticeModalHost"
import { GUIDED_AUDIO_VARIANTS } from "@/lib/guided-audio-variants"

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

function createProps(overrides: Partial<ComponentProps<typeof PracticeModalHost>> = {}): ComponentProps<typeof PracticeModalHost> {
  return {
    clearData: {
      isOpen: false,
      step: 1,
      confirmPhrase: "",
      onClose: vi.fn(),
      onStepChange: vi.fn(),
      onConfirmPhraseChange: vi.fn(),
      onInvalidConfirmPhrase: vi.fn(),
      onComplete: vi.fn(),
    },
    chantSettings: {
      isOpen: false,
      isPro: false,
      minutes: 1,
      seconds: 0,
      delaySeconds: 60,
      onMinutesChange: vi.fn(),
      onSecondsChange: vi.fn(),
      onDelayChange: vi.fn(),
      onClose: vi.fn(),
      onUpgrade: vi.fn(),
    },
    guidedAudioVersions: {
      isOpen: false,
      variants: GUIDED_AUDIO_VARIANTS,
      selectedId: "guruji-led-primary",
      onSelect: vi.fn(),
      onClose: vi.fn(),
    },
    ...overrides,
  }
}

describe("PracticeModalHost", () => {
  it("转发清空数据三步确认流程", () => {
    const onStepChange = vi.fn()
    const onInvalidConfirmPhrase = vi.fn()
    const onComplete = vi.fn()
    const base = createProps()
    const { rerender } = render(
      <PracticeModalHost {...base} clearData={{ ...base.clearData, isOpen: true, step: 1, onStepChange, onInvalidConfirmPhrase, onComplete }} />,
    )

    expect(screen.getByRole("dialog", { name: "⚠️ 危险操作警告" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "关闭清空数据确认" }).className).toContain("z-[200]")
    fireEvent.click(screen.getByRole("button", { name: "继续操作" }))
    expect(onStepChange).toHaveBeenCalledWith(2)

    rerender(<PracticeModalHost {...base} clearData={{ ...base.clearData, isOpen: true, step: 2, onStepChange, onInvalidConfirmPhrase, onComplete }} />)
    fireEvent.click(screen.getByRole("button", { name: "确认" }))
    expect(onInvalidConfirmPhrase).toHaveBeenCalledTimes(1)

    rerender(<PracticeModalHost {...base} clearData={{ ...base.clearData, isOpen: true, step: 2, confirmPhrase: "确认删除", onStepChange, onInvalidConfirmPhrase, onComplete }} />)
    fireEvent.click(screen.getByRole("button", { name: "确认" }))
    expect(onStepChange).toHaveBeenCalledWith(3)

    rerender(<PracticeModalHost {...base} clearData={{ ...base.clearData, isOpen: true, step: 3, onStepChange, onInvalidConfirmPhrase, onComplete }} />)
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("Pro 唱诵设置限制数值并同步总秒数", () => {
    const onMinutesChange = vi.fn()
    const onSecondsChange = vi.fn()
    const onDelayChange = vi.fn()
    const props = createProps()
    render(
      <PracticeModalHost
        {...props}
        chantSettings={{ ...props.chantSettings, isOpen: true, isPro: true, minutes: 2, seconds: 10, onMinutesChange, onSecondsChange, onDelayChange }}
      />,
    )

    expect(screen.getByRole("dialog", { name: "唱诵设置" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "增加分钟" }))
    expect(onMinutesChange).toHaveBeenCalledWith(3)
    expect(onDelayChange).toHaveBeenCalledWith(190)

    fireEvent.change(screen.getByLabelText("倒计时秒数"), { target: { value: "80" } })
    expect(onSecondsChange).toHaveBeenCalledWith(59)
    expect(onDelayChange).toHaveBeenCalledWith(179)
  })

  it("免费用户从唱诵设置进入升级流程", () => {
    const onUpgrade = vi.fn()
    const props = createProps()
    render(<PracticeModalHost {...props} chantSettings={{ ...props.chantSettings, isOpen: true, onUpgrade }} />)

    expect(screen.getByText("Pro 功能")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "升级 Pro 解锁自定义时长" }))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })

  it("口令版本弹窗展示当前版本并选择 Sharath Jois", () => {
    const onSelect = vi.fn()
    const props = createProps()
    render(
      <PracticeModalHost
        {...props}
        guidedAudioVersions={{ ...props.guidedAudioVersions, isOpen: true, onSelect }}
      />,
    )

    expect(screen.getByRole("dialog", { name: "选择口令版本" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /老掌门人/ }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: /Sharath Jois/ }))
    expect(onSelect).toHaveBeenCalledWith("sharath-jois-led-primary")
  })
})
