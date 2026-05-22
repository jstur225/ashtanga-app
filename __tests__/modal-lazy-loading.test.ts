import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 弹窗懒加载验证测试
 * 确保 12 个弹窗使用 dynamic()，而非懒加载的组件仍是直接 import
 */

const ROOT = path.resolve(__dirname, '..')

// 应该用 dynamic() 懒加载的弹窗组件
const LAZY_MODALS = [
  { name: 'AuthModal', file: 'components/AuthModal.tsx' },
  { name: 'ImportModal', file: 'components/ImportModal.tsx' },
  { name: 'ExportModal', file: 'components/ExportModal.tsx' },
  { name: 'DataConflictModal', file: 'components/DataConflictModal.tsx' },
  { name: 'DebugLogModal', file: 'components/DebugLogModal.tsx' },
  { name: 'XiaohongshuInviteModal', file: 'components/XiaohongshuInviteModal.tsx' },
  { name: 'PWAInstallTutorialModal', file: 'components/PWAInstallTutorialModal.tsx' },
  { name: 'FakeDoorModal', file: 'components/FakeDoorModal.tsx' },
  { name: 'ActivateModal', file: 'components/Membership/ActivateModal.tsx' },
  { name: 'MembershipPromptModal', file: 'components/Membership/MembershipPromptModal.tsx' },
  { name: 'PurchaseGuideModal', file: 'components/Membership/PurchaseGuideModal.tsx' },
  { name: 'AnnotationManagerModal', file: 'components/CalendarAnnotation/AnnotationManagerModal.tsx' },
]

// 不应该懒加载的组件（主界面直接渲染）
const EAGER_COMPONENTS = [
  'PracticeForm',
  'VoiceButton',
  'PhotoUploadButton',
  'PWAInstallBanner',
  'MembershipCard',
]

describe('弹窗懒加载', () => {
  const pageContent = fs.readFileSync(path.join(ROOT, 'app/practice/page.tsx'), 'utf-8')

  describe('每个弹窗组件', () => {
    LAZY_MODALS.forEach(({ name, file }) => {
      it(`${name} 文件存在且可解析`, () => {
        const filePath = path.join(ROOT, file)
        expect(fs.existsSync(filePath), `${file} 不存在`).toBe(true)
      })
    })
  })

  describe('dynamic() 使用', () => {
    LAZY_MODALS.forEach(({ name }) => {
      it(`${name} 使用 dynamic() 而非直接 import`, () => {
        // 直接 import 模式: import { X } from '...'
        const directImportPattern = new RegExp(`import\\s+.*\\{\\s*${name}\\s*\\}.*from`, 'm')
        // dynamic import 模式: const X = dynamic(...)
        const dynamicPattern = new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`, 'm')

        expect(directImportPattern.test(pageContent), `${name} 不应该用直接 import`).toBe(false)
        expect(dynamicPattern.test(pageContent), `${name} 应该用 dynamic()`).toBe(true)
      })
    })
  })

  describe('非懒加载组件保持直接 import', () => {
    EAGER_COMPONENTS.forEach(name => {
      it(`${name} 仍是直接 import（不该懒加载）`, () => {
        const dynamicPattern = new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`, 'm')
        expect(dynamicPattern.test(pageContent), `${name} 不应该用 dynamic()`).toBe(false)
      })
    })
  })
})
