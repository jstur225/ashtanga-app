import { describe, expect, it } from "vitest"
import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

const LAZY_MODALS = [
  { name: "AuthModal", file: "components/AuthModal.tsx" },
  { name: "ImportModal", file: "components/ImportModal.tsx" },
  { name: "ExportModal", file: "components/ExportModal.tsx" },
  { name: "DataConflictModal", file: "components/DataConflictModal.tsx" },
  { name: "DebugLogModal", file: "components/DebugLogModal.tsx" },
  { name: "SettingsModal", file: "components/settings/SettingsModal.tsx" },
  { name: "XiaohongshuInviteModal", file: "components/XiaohongshuInviteModal.tsx" },
  { name: "PWAInstallTutorialModal", file: "components/PWAInstallTutorialModal.tsx" },
  { name: "FakeDoorModal", file: "components/FakeDoorModal.tsx" },
  { name: "ActivateModal", file: "components/Membership/ActivateModal.tsx" },
  { name: "MembershipPromptModal", file: "components/Membership/MembershipPromptModal.tsx" },
  { name: "PurchaseGuideModal", file: "components/Membership/PurchaseGuideModal.tsx" },
  { name: "AnnotationManagerModal", file: "components/CalendarAnnotation/AnnotationManagerModal.tsx" },
]

const EAGER_COMPONENTS = [
  "PracticeForm",
  "VoiceButton",
  "PhotoUploadButton",
  "PWAInstallBanner",
]

const LAZY_TABS = ["JournalTab", "StatsTab", "PosesTab"]
const HOSTED_MODALS = [
  "CustomPracticeModal",
  "EditOptionModal",
  "SettingsModal",
  "AnnotationManagerModal",
  "ActivateModal",
  "MembershipPromptModal",
  "PurchaseGuideModal",
  "AccountSyncModal",
  "ImportModal",
  "ExportModal",
  "DebugLogModal",
  "FakeDoorModal",
  "XiaohongshuInviteModal",
  "AuthModal",
  "DataConflictModal",
]

describe("弹窗懒加载", () => {
  const pageContent = fs.readFileSync(path.join(ROOT, "app/practice/page.tsx"), "utf-8")
  const modalHostContent = fs.readFileSync(path.join(ROOT, "components/practice/PracticeModalHost.tsx"), "utf-8")
  const statsTabPath = path.join(ROOT, "components/stats/StatsTab.tsx")
  const statsTabContent = fs.existsSync(statsTabPath) ? fs.readFileSync(statsTabPath, "utf-8") : ""
  const lazySourceContent = `${pageContent}\n${modalHostContent}\n${statsTabContent}`

  describe("弹窗组件文件", () => {
    LAZY_MODALS.forEach(({ name, file }) => {
      it(`${name} 文件存在`, () => {
        expect(fs.existsSync(path.join(ROOT, file)), `${file} 不存在`).toBe(true)
      })
    })
  })

  describe("dynamic() 使用", () => {
    LAZY_MODALS.forEach(({ name }) => {
      it(`${name} 使用 dynamic() 而非直接 import`, () => {
        const directImportPattern = new RegExp(`import\\s+.*\\{\\s*${name}\\s*\\}.*from`, "m")
        const dynamicPattern = new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`, "m")

        expect(directImportPattern.test(lazySourceContent), `${name} 不应该用直接 import`).toBe(false)
        expect(dynamicPattern.test(lazySourceContent), `${name} 应该用 dynamic()`).toBe(true)
      })
    })
  })

  describe("首屏组件保持直接 import", () => {
    EAGER_COMPONENTS.forEach((name) => {
      it(`${name} 不应被 dynamic() 懒加载`, () => {
        const dynamicPattern = new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`, "m")
        expect(dynamicPattern.test(pageContent), `${name} 不应该用 dynamic()`).toBe(false)
      })
    })
  })

  describe("低频 Tab 按需加载", () => {
    LAZY_TABS.forEach((name) => {
      it(`${name} 使用 dynamic()，不进入练习首屏依赖`, () => {
        const directImportPattern = new RegExp(`import\\s+.*\\{\\s*${name}\\s*\\}.*from`, "m")
        const dynamicPattern = new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`, "m")
        expect(directImportPattern.test(pageContent)).toBe(false)
        expect(dynamicPattern.test(pageContent)).toBe(true)
        expect(pageContent).toContain("loading: TabLoading")
      })
    })
  })

  describe("弹窗渲染统一由 PracticeModalHost 承接", () => {
    it("邀请版本常量不会静态拉入小红书弹窗模块", () => {
      expect(pageContent).not.toMatch(/import\s+.*from\s+["']@\/components\/XiaohongshuInviteModal["']/)
      expect(pageContent).toContain('from "@/lib/invite-version"')
    })

    HOSTED_MODALS.forEach((name) => {
      it(`${name} 不再由练习页面直接渲染`, () => {
        expect(pageContent).not.toContain(`<${name}`)
        expect(modalHostContent).toContain(`<${name}`)
      })
    })
  })
})
