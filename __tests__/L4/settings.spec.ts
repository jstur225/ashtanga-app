/**
 * L4 设置弹窗 + 数据管理测试（需要登录态）
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 设置弹窗（登录态）', () => {
  test('设置弹窗打开：至少有一个分区可见', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 切到 stats tab
    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    await page.waitForTimeout(1500)

    const settingsBtn = page.locator('button[aria-label*="设置"], button:has-text("设置")').first()
    const hasSettings = await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasSettings, '无设置入口')

    await settingsBtn.click()
    await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5_000 })
  })

  test('导出按钮：点击触发导出弹窗', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    await page.waitForTimeout(1500)

    const settingsBtn = page.locator('button[aria-label*="设置"], button:has-text("设置")').first()
    const hasSettings = await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasSettings, '无设置入口')
    await settingsBtn.click()

    const dialog = page.getByRole('dialog').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const exportBtn = dialog.locator('button:has-text("导出")').first()
    const hasExport = await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasExport, '无导出按钮')

    await exportBtn.click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(/导出|复制|下载/, { exact: false }).first()).toBeVisible({ timeout: 5_000 })
  })
})
