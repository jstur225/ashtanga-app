import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PosesTab } from "@/components/PosesTab"
import { POSES } from "@/lib/pose-data"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, props, children),
    },
  ),
}))

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe("PosesTab", () => {
  it("站立体式卡片和详情显示梵文、中文名及完整分解", () => {
    render(<PosesTab />)

    fireEvent.click(screen.getByRole("button", { name: "站立体式" }))
    expect(screen.getByText("手抓脚趾前弯式")).toBeTruthy()
    expect(screen.queryByText("Pādāṅguṣṭhāsana")).toBeNull()

    const poseImage = screen.getByRole("img", { name: "Pādāṅguṣṭhāsana" })
    fireEvent.click(poseImage.closest("button")!)

    expect(screen.getByRole("heading", { name: "Pādāṅguṣṭhāsana" })).toBeTruthy()
    expect(screen.getAllByText("手抓脚趾前弯式")).toHaveLength(2)
    expect(screen.getByText("VINYASA 总数")).toBeTruthy()
    expect(screen.getByText("鼻尖")).toBeTruthy()
    expect(screen.getByText("nāsāgre")).toBeTruthy()
    expect(screen.getByText("前弯，头靠近两膝之间，腿打直。")).toBeTruthy()
    expect(screen.getByText("-")).toBeTruthy()
    expect(screen.queryByText("回")).toBeNull()
    expect(screen.getByText("体式库以动作解析为主，与实际练习中的串联有所差别。内容来源为网络资料人工整理，如果有错漏，可联系开发者修正，Namaste🙏")).toBeTruthy()
  })

  it("搜索可通过旧中文名定位更新后的梵文和中文卡片", () => {
    render(<PosesTab />)

    fireEvent.change(screen.getByPlaceholderText("搜索中文名或梵文名"), {
      target: { value: "扭转三角式" },
    })

    expect(screen.getByRole("img", { name: "Parivṛtta Trikoṇāsana" })).toBeTruthy()
    expect(screen.getByText("反三角式")).toBeTruthy()
  })

  it("第 14、15、16 章分别突出各自的体位法位置", () => {
    const phase1 = POSES.find(pose => pose.sourceFilename.endsWith("utthita-hasta-padangusthasana-01.png"))
    const phase2 = POSES.find(pose => pose.sourceFilename.endsWith("utthita-hasta-padangusthasana-02.png"))
    const phase3 = POSES.find(pose => pose.sourceFilename.endsWith("utthita-hasta-padangusthasana-03.png"))

    expect(phase1?.vinyasaSteps?.filter(item => item.isAsana).map(item => item.count)).toEqual(["2", "9"])
    expect(phase2?.vinyasaSteps?.filter(item => item.isAsana).map(item => item.count)).toEqual(["4", "11"])
    expect(phase3?.vinyasaSteps?.filter(item => item.isAsana).map(item => item.count)).toEqual(["7", "14"])
    expect(phase1?.vinyasaSteps).not.toBe(phase2?.vinyasaSteps)
    expect(phase2?.vinyasaSteps).not.toBe(phase3?.vinyasaSteps)
  })

  it("拜日步骤使用手册动作、呼吸和凝视点", () => {
    const suryaAEkam = POSES.find(pose => pose.sourceFilename === "surya-a/surya-a-02.png")
    const suryaBWarrior = POSES.find(pose => pose.sourceFilename === "surya-b/surya-b-08.png")

    expect(suryaAEkam).toMatchObject({
      name: "Ekam",
      action: "双手举过头合十，微微抬头。",
      breath: "吸气",
      drishti: "眉心",
      vinyasaCount: 9,
      vinyasaStep: "1",
    })
    expect(suryaBWarrior).toMatchObject({
      cueName: "英雄式 A（右侧）",
      drishti: "指尖",
      vinyasaCount: 17,
    })
  })

  it("拜日详情使用与站立体式一致的 Vinyasa 步骤卡", () => {
    render(<PosesTab />)

    fireEvent.click(screen.getByRole("img", { name: "Ekam" }).closest("button")!)

    expect(screen.getByText("VINYASA 分解")).toBeTruthy()
    expect(screen.getByText("V1")).toBeTruthy()
    expect(screen.getByText("吸气")).toBeTruthy()
    expect(screen.getByText("看眉心")).toBeTruthy()
    expect(screen.getByText("双手举过头合十，微微抬头。")).toBeTruthy()
    expect(screen.queryByText("动作解析")).toBeNull()
  })

  it("尚未整理动作的详情页也显示统一说明", () => {
    render(<PosesTab />)

    fireEvent.click(screen.getByRole("button", { name: "坐立体式" }))
    fireEvent.click(screen.getByRole("img", { name: "手杖式" }).closest("button")!)

    expect(screen.getByText("动作提示整理中")).toBeTruthy()
    expect(screen.getByText("体式库以动作解析为主，与实际练习中的串联有所差别。内容来源为网络资料人工整理，如果有错漏，可联系开发者修正，Namaste🙏")).toBeTruthy()
  })
})
