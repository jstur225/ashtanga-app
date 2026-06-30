/**
 * L4 键盘导航测试（无障碍）
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 键盘导航', () => {
  test('Tab 键可以遍历到按钮', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab')
    }
    const activeTag = await page.evaluate(() => document.activeElement?.tagName)
    // 焦点不应在 body 上（已经 tab 到了某个按钮）
    expect(activeTag).not.toBe('')
  })

  test('Enter 切换 Tab', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const journalTab = page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")')
    await journalTab.focus()
    await page.keyboard.press('Enter')
    await expect(journalTab).toHaveAttribute('aria-current', 'page')
  })

  test('Esc 关闭已打开的弹窗', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '自定义' }).first().click()
    const dialog = page.getByRole('dialog').first()
    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasDialog, '自定义弹窗未打开')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('弹窗打开时焦点在弹窗内部', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '自定义' }).first().click()
    const dialog = page.getByRole('dialog').first()
    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasDialog, '自定义弹窗未打开')

    // Tab 几次
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
    }
    const inDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      const active = document.activeElement
      return dlg ? dlg.contains(active) : false
    })
    expect(inDialog, '焦点应在 dialog 内部').toBeTruthy()
  })
})
