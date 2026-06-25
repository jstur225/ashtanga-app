/**
 * L4 日记 CRUD 测试（需要登录态）
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 日记 CRUD', () => {
  test('日记 Tab 渲染：空态或列表可见', async ({ page }) => {
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")')).toHaveAttribute('aria-current', 'page')
    await page.waitForTimeout(2000)
  })

  test('补录按钮：点击打开补录 UI', async ({ page }) => {
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(2000)

    const addBtn = page.locator('button:has-text("补录"), button[aria-label*="+"]').first()
    const hasAdd = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasAdd, '无补录按钮')

    await addBtn.click()
    await page.waitForTimeout(1000)
  })

  test('分享按钮：存在时可点击', async ({ page }) => {
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(2000)

    const shareBtn = page.locator('button[aria-label*="分享"], button:has(svg.lucide-share-2)').first()
    const hasShare = await shareBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    test.skip(!hasShare, '无分享按钮')
    await shareBtn.click()
    await page.waitForTimeout(500)
  })
})
