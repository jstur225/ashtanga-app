import React, { type ComponentProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PracticeSessionView } from "@/components/practice/PracticeSessionView"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const safeProps = { ...props } as Record<string, unknown>
      delete safeProps.whileTap
      delete safeProps.initial
      delete safeProps.animate
      delete safeProps.exit
      delete safeProps.transition
      return React.createElement(tag, safeProps, children)
    },
  }),
}))

afterEach(() => cleanup())

function createProps(overrides: Partial<ComponentProps<typeof PracticeSessionView>> = {}): ComponentProps<typeof PracticeSessionView> {
  return {
    elapsedTime: 125,
    isPaused: false,
    practiceLabel: "一序列",
    practiceNotes: "Mysore",
    activeOptionId: "mysore",
    isChantCountdown: false,
    chantCountdown: 5,
    onSkipChantCountdown: vi.fn(),
    isChantPlaying: false,
    isAudioLoaded: false,
    isAudioLoading: false,
    audioError: null,
    isUsingCache: false,
    audioProgress: 0,
    audioCurrentTime: 0,
    audioDuration: 0,
    onRetryAudio: vi.fn(),
    onPauseResume: vi.fn(),
    onRequestEnd: vi.fn(),
    seekStepOptions: [10, 15, 30],
    seekStep: 15,
    onSeekStepChange: vi.fn(),
    onAudioSeek: vi.fn(),
    showConfirmEnd: false,
    onCancelEnd: vi.fn(),
    onConfirmEnd: vi.fn(),
    onDiscardEnd: vi.fn(),
    ...overrides,
  }
}

describe("PracticeSessionView", () => {
  it("展示计时与练习信息，并分发暂停和结束事件", () => {
    const props = createProps()
    render(<PracticeSessionView {...props} />)

    expect(screen.getByText("2")).toBeTruthy()
    expect(screen.getByText("05秒")).toBeTruthy()
    expect(screen.getByText("一序列")).toBeTruthy()
    expect(screen.getByText("Mysore")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "暂停" }))
    fireEvent.click(screen.getByRole("button", { name: "结束" }))
    expect(props.onPauseResume).toHaveBeenCalledTimes(1)
    expect(props.onRequestEnd).toHaveBeenCalledTimes(1)
  })

  it("展示唱诵倒计时和播放状态", () => {
    const onSkipChantCountdown = vi.fn()
    render(<PracticeSessionView {...createProps({ isChantCountdown: true, chantCountdown: 3, isChantPlaying: true, onSkipChantCountdown })} />)

    expect(screen.getByText("3")).toBeTruthy()
    expect(screen.getByText("唱诵中...")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "跳过" }))
    expect(onSkipChantCountdown).toHaveBeenCalledTimes(1)
  })

  it("口令加载与失败状态保留正常计时控制", () => {
    const { rerender } = render(
      <PracticeSessionView {...createProps({ activeOptionId: "guided_audio", isAudioLoading: true, isUsingCache: true })} />,
    )
    expect(screen.getByRole("status", { name: "正在加载口令音频" })).toBeTruthy()
    expect(screen.getByText("从缓存读取...")).toBeTruthy()

    const onRetryAudio = vi.fn()
    rerender(<PracticeSessionView {...createProps({ activeOptionId: "guided_audio", audioError: "音频加载失败", onRetryAudio })} />)
    expect(screen.getByRole("alert")).toBeTruthy()
    expect(screen.getByRole("button", { name: "暂停" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "重试" }))
    expect(onRetryAudio).toHaveBeenCalledTimes(1)
  })

  it("口令就绪后展示进度、步长与前后跳转", () => {
    const onSeekStepChange = vi.fn()
    const onAudioSeek = vi.fn()
    render(
      <PracticeSessionView
        {...createProps({
          activeOptionId: "guided_audio",
          isAudioLoaded: true,
          audioProgress: 25,
          audioCurrentTime: 65,
          audioDuration: 300,
          onSeekStepChange,
          onAudioSeek,
        })}
      />,
    )

    expect(screen.getByLabelText("口令播放进度").getAttribute("style")).toContain("25%")
    expect(screen.getByText("01:05")).toBeTruthy()
    expect(screen.getByText("05:00")).toBeTruthy()
    expect(screen.getByRole("button", { name: "15秒" }).getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "30秒" }))
    fireEvent.click(screen.getByRole("button", { name: "后退口令音频" }))
    fireEvent.click(screen.getByRole("button", { name: "前进口令音频" }))
    expect(onSeekStepChange).toHaveBeenCalledWith(30)
    expect(onAudioSeek.mock.calls.map(([direction]) => direction)).toEqual(["backward", "forward"])
  })
})
