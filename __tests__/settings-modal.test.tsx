import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import fs from "fs"
import path from "path"
import { AccountSyncModal } from "@/components/AccountSyncModal"
import { AccountSyncSection } from "@/components/settings/AccountSyncSection"
import { SettingsModal } from "@/components/settings/SettingsModal"
import type { UserProfile } from "@/hooks/usePracticeData"

const mocks = vi.hoisted(() => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  syncedProfile: {
    id: "profile-remote",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    name: "云端名字",
    signature: "云端签名",
    avatar: null,
  } as UserProfile,
}))

vi.mock("sonner", () => ({
  toast: mocks.toast,
}))

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, props, children),
    }
  ),
}))

vi.mock("@/components/AccountBindingSection", () => ({
  AccountBindingSection: (props: { onSyncComplete?: (data: { profile?: UserProfile }) => void }) => (
    <div>
      <div>Account Binding Mock</div>
      <button type="button" onClick={() => props.onSyncComplete?.({ profile: mocks.syncedProfile })}>
        mock sync profile
      </button>
    </div>
  ),
}))

vi.mock("@/components/Membership/MembershipCard", () => ({
  MembershipCard: () => <div>Membership Card Mock</div>,
}))

vi.mock("@/components/Membership/MembershipActions", () => ({
  MembershipActions: ({ onActivate }: { onActivate: () => void }) => (
    <div>
      <button type="button" onClick={onActivate}>
        开通会员
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const profile: UserProfile = {
  id: "profile-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  name: "旧名字",
  signature: "旧签名",
  avatar: null,
  historical_days: 3,
  historical_avg_minutes: 45,
}

function renderSettings(overrides: Partial<React.ComponentProps<typeof SettingsModal>> = {}) {
  const props: React.ComponentProps<typeof SettingsModal> = {
    isOpen: true,
    onClose: vi.fn(),
    profile,
    onSave: vi.fn(),
    onOpenExport: vi.fn(),
    onOpenImport: vi.fn(),
    onExportLog: vi.fn(),
    onClearData: vi.fn(),
    onShowClearDataConfirm: vi.fn(),
    onOpenLoginModal: vi.fn(),
    onOpenRegisterModal: vi.fn(),
    onUpdateProfile: vi.fn(),
    user: null,
    practiceHistory: [],
    practiceOptionsData: [],
    membership: null,
    ...overrides,
  }

  render(<SettingsModal {...props} />)
  return props
}

describe("SettingsModal", () => {
  it("渲染设置标题和四个设置 Tab", () => {
    renderSettings()

    expect(screen.getByText("设置")).toBeTruthy()
    expect(screen.getByText("个人资料")).toBeTruthy()
    expect(screen.getByText("会员")).toBeTruthy()
    expect(screen.getByText("账户同步")).toBeTruthy()
    expect(screen.getByText("数据管理")).toBeTruthy()
  })

  it("点击 Tab 能切换对应区域", () => {
    renderSettings()

    fireEvent.click(screen.getByText("会员"))
    expect(screen.getByText("Membership Card Mock")).toBeTruthy()

    fireEvent.click(screen.getByText("账户同步"))
    expect(screen.getByText("Account Binding Mock")).toBeTruthy()

    fireEvent.click(screen.getByText("数据管理"))
    expect(screen.getByText("复制数据胶囊")).toBeTruthy()
  })

  it("保存个人资料时提交最新昵称、签名和历史校准数据，并关闭弹窗", () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderSettings({ onSave, onClose })

    fireEvent.change(screen.getByDisplayValue("旧名字"), { target: { value: "新名字" } })
    fireEvent.change(screen.getByDisplayValue("旧签名"), { target: { value: "新签名" } })
    fireEvent.change(screen.getByLabelText("历史练习天数"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("平均每次分钟"), { target: { value: "60" } })
    fireEvent.click(screen.getByText("保存设置"))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "新名字",
        signature: "新签名",
        historical_days: 12,
        historical_avg_minutes: 60,
      })
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("未登录点击头像上传入口时提示绑定邮箱，并切到账户同步", () => {
    renderSettings({ user: null })

    fireEvent.click(screen.getByLabelText("上传头像"))

    expect(mocks.toast.info).toHaveBeenCalledWith(
      "绑定邮箱后可上传头像",
      expect.objectContaining({
        action: expect.objectContaining({ label: "去绑定" }),
      })
    )
    expect(screen.getByText("Account Binding Mock")).toBeTruthy()
  })

  it("数据管理按钮会调用对应回调", async () => {
    const onOpenExport = vi.fn()
    const onOpenImport = vi.fn()
    const onExportLog = vi.fn().mockResolvedValue(undefined)
    const onShowClearDataConfirm = vi.fn()

    renderSettings({
      onOpenExport,
      onOpenImport,
      onExportLog,
      onShowClearDataConfirm,
      onClearData: vi.fn(),
    })

    fireEvent.click(screen.getByText("数据管理"))
    fireEvent.click(screen.getByText("复制数据胶囊").closest("button")!)
    fireEvent.click(screen.getByText("导入数据胶囊").closest("button")!)
    fireEvent.click(screen.getByText("运行日志").closest("button")!)
    fireEvent.click(screen.getByText("清空数据胶囊").closest("button")!)

    expect(onOpenExport).toHaveBeenCalled()
    expect(onOpenImport).toHaveBeenCalled()
    await waitFor(() => expect(onExportLog).toHaveBeenCalled())
    expect(onShowClearDataConfirm).toHaveBeenCalled()
  })
})

describe("AccountSyncSection", () => {
  it("同步完成收到 profile 时调用 onUpdateProfile", () => {
    const onUpdateProfile = vi.fn()
    render(
      <AccountSyncSection
        profile={profile}
        onClose={vi.fn()}
        onUpdateProfile={onUpdateProfile}
        practiceHistory={[]}
        practiceOptionsData={[]}
      />
    )

    fireEvent.click(screen.getByText("mock sync profile"))

    expect(onUpdateProfile).toHaveBeenCalledWith(mocks.syncedProfile)
  })
})

describe("AccountSyncModal", () => {
  it("打开时显示账户同步内容，关闭按钮可关闭", () => {
    const onClose = vi.fn()
    render(
      <AccountSyncModal
        isOpen
        onClose={onClose}
        profile={profile}
        practiceHistory={[]}
        practiceOptionsData={[]}
        onOpenLoginModal={vi.fn()}
        onOpenRegisterModal={vi.fn()}
      />
    )

    expect(screen.getByText("账户同步")).toBeTruthy()
    expect(screen.getByText("Account Binding Mock")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("关闭账户同步"))
    expect(onClose).toHaveBeenCalled()
  })
})

describe("设置弹窗中文文案", () => {
  it("源码中包含正常 UTF-8 中文文案", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../components/settings/SettingsModal.tsx"), "utf8")

    for (const text of ["设置", "个人资料", "会员", "账户同步", "数据管理", "保存设置"]) {
      expect(source).toContain(text)
    }
  })
})
