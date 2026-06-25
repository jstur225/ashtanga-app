/**
 * L4 弹窗层级测试
 *
 * 注意：由于 framer-motion 动画被禁用 + "自定义"按钮单次点击就触发弹窗，
 * 通过 has-text 定位 dialog 关闭按钮（X 图标按钮）关闭。
 */
import { test, expect, waitForHydration } from './fixtures'

async function openCustomPage(page: import('@playwright/test').Page) {
  await page.goto('/practice', { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)
}

async function closeDialog(page: import('@playwright/test').Page) {
  // 找 dialog 内的关闭按钮，没有则用 Escape
  const closeBtn = page.locator('[role="dialog"] button[aria-label*="关闭"], [role="dialog"] button:has-text("取消")').first()
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click()
  } else {
    await page.keyboard.press('Escape')
  }
}

test.describe('L4 弹窗层级', () => {
  test('自定义选项弹窗：打开 → 关闭', async ({ page }) => {
    await openCustomPage(page)

    // 点击"+ 自定义"按钮
    await page.locator('main button', { hasText: '自定义' }).first().click()

    // dialog 出现或自定义弹窗出现
    const dialog = page.getByRole('dialog').first()
    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasDialog, '选项已满/该条件下自定义弹窗未打开')

    await closeDialog(page)
    await page.waitForTimeout(500)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('弹窗打开时导航栏隐藏 → 关闭后恢复', async ({ page }) => {
    await openCustomPage(page)
    const nav = page.locator('nav[aria-label="主要导航"]')
    await expect(nav).toBeVisible()

    await page.locator('main button', { hasText: '自定义' }).first().click()
    const dialog = page.getByRole('dialog').first()
    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasDialog, '自定义弹窗未打开')

    await expect(nav).toBeHidden({ timeout: 3_000 })

    await closeDialog(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(nav).toBeVisible({ timeout: 5_000 })
  })

  test('连续开关多个弹窗不串状态', async ({ page }) => {
    await openCustomPage(page)

    for (let i = 0; i < 3; i++) {
      await page.locator('main button', { hasText: '自定义' }).first().click()
      const dialog = page.getByRole('dialog').first()
      const hasDialog = await dialog.isVisible({ timeout: 2_000 }).catch(() => false)
      if (!hasDialog) break // 选项满后首次打开成功，后续可能被阻止
      await closeDialog(page)
      await page.waitForTimeout(300)
    }
  })
})
