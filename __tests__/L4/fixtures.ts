/**
 * L4 测试 fixtures：扩展 test 对象，提供通用工具
 *
 * 默认行为：
 *   - 禁用 CSS 动画（framer-motion 无限动画会让 Playwright 点击超时）
 *   - 捕获 console.error 和 hydration 错误
 */
import { test as base, expect, type Page } from '@playwright/test'

export interface ConsoleCapture {
  errors: string[]
  hydrationErrors: number
}

/**
 * 在每个 page 创建时注入：禁用动画 + hydration 检测。
 * 通过 test.use 注入到所有测试。
 */
async function setupPage(page: Page) {
  await page.addInitScript(() => {
    // 1. 禁用所有 CSS transition / animation，让 framer-motion 元素稳定
    const injectStyle = () => {
      if (document.getElementById('__l4_disable_animations__')) return
      const parent = document.head || document.documentElement || document.body
      if (!parent) return
      const style = document.createElement('style')
      style.id = '__l4_disable_animations__'
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-delay: 0ms !important;
          transition-duration: 0.001ms !important;
          transition-delay: 0ms !important;
        }
      `
      parent.appendChild(style)
    }
    injectStyle()
    if (!document.head) {
      document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    }

    // 2. hydration 错误检测
    ;(window as any).__NEXT_HYDRATION_ERRORS__ = 0
    const origError = console.error
    console.error = function (...args: unknown[]) {
      const text = args.map(String).join(' ')
      if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('did not match')) {
        ;(window as any).__NEXT_HYDRATION_ERRORS__++
      }
      origError.apply(this, args as never)
    }
  })
}

export const test = base.extend<{ consoleCapture: ConsoleCapture }>({
  consoleCapture: async ({ page }, use) => {
    const capture: ConsoleCapture = { errors: [], hydrationErrors: 0 }

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        capture.errors.push(text)
        if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('did not match')) {
          capture.hydrationErrors++
        }
      }
    })

    page.on('pageerror', (err) => {
      capture.errors.push(`pageerror: ${err.message}`)
    })

    await use(capture)
  },
})

// 所有测试自动注入动画禁用 + hydration 检测
test.beforeEach(async ({ page }) => {
  await setupPage(page)
})

/** 等待主导航可见（即 hydration 完成） */
export async function waitForHydration(page: Page) {
  await expect(page.locator('nav[aria-label="主要导航"]')).toBeVisible({ timeout: 30_000 })
}

/**
 * Seed deterministic local data before the app boots.
 *
 * L4 auth tests should exercise UI behavior, not depend on the test cloud
 * account already having journal records. Mark auto-sync as already handled so
 * a real auth session does not immediately overwrite the seeded local state.
 */
export async function seedL4PracticeData(page: Page) {
  await page.addInitScript(() => {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const timestamp = now.toISOString()
    const record = {
      id: 'l4-seeded-record',
      created_at: timestamp,
      updated_at: timestamp,
      date,
      type: 'L4 Test Practice',
      duration: 3600,
      notes: 'L4 seeded practice note',
      photos: [],
      breakthrough: 'L4 seeded breakthrough',
      start_time: timestamp,
      color_level: 3,
    }
    const option = {
      id: 'l4-seeded-option',
      created_at: timestamp,
      updated_at: timestamp,
      label: 'L4 Test Practice',
      notes: 'Seeded by L4 fixture',
      is_custom: true,
      isCustom: true,
      visible: true,
      can_edit: true,
      color_level: 3,
    }
    const profile = {
      id: 'l4-seeded-profile',
      created_at: timestamp,
      updated_at: timestamp,
      name: 'L4 Tester',
      signature: 'L4 seeded profile',
      avatar: null,
      historical_days: 0,
      historical_avg_minutes: 0,
    }

    window.localStorage.setItem('ashtanga_records', JSON.stringify([record]))
    window.localStorage.setItem('ashtanga_options', JSON.stringify([option]))
    window.localStorage.setItem('ashtanga_profile', JSON.stringify(profile))
    ;(window as any).__hasAutoSynced__ = true
  })
}

export { expect }
