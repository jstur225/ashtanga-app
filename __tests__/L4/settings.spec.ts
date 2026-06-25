/**
 * L4 设置弹窗 + 数据管理测试（登录态 project，可用本地 seed 保持稳定）
 */
import type { Page } from '@playwright/test'
import { test, expect, seedL4PracticeData, waitForHydration } from './fixtures'

async function openSettings(page: Page) {
  await page.goto('/practice', { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)
  await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()

  const settingsBtn = page.locator('button[aria-label*="设置"], button:has-text("设置")').first()
  await expect(settingsBtn).toBeVisible({ timeout: 10_000 })
  await settingsBtn.click()

  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}

test.describe('L4 设置弹窗（登录态）', () => {
  test('设置弹窗打开：至少有一个分区可见', async ({ page }) => {
    await seedL4PracticeData(page)
    const dialog = await openSettings(page)

    await expect(dialog).toContainText(/个人资料|会员|账户同步|数据管理/)
  })

  test('导出按钮：点击触发导出弹窗', async ({ page }) => {
    await seedL4PracticeData(page)
    const dialog = await openSettings(page)

    await dialog.getByRole('button', { name: '数据管理' }).click()
    const exportBtn = dialog.getByTestId('settings-export-data')
    await expect(exportBtn).toBeVisible({ timeout: 10_000 })
    await exportBtn.click()

    await expect(page.getByText(/导出|复制|下载/, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  })
})
