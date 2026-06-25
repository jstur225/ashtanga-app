/**
 * L4 深链接测试
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 深链接', () => {
  test('/practice?tab=journal 激活日记 Tab', async ({ page }) => {
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")')).toHaveAttribute('aria-current', 'page')
  })

  test('/practice?tab=stats 激活统计 Tab', async ({ page }) => {
    await page.goto('/practice?tab=stats', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")')).toHaveAttribute('aria-current', 'page')
  })

  test('/practice?tab=poses 激活体式 Tab', async ({ page }) => {
    await page.goto('/practice?tab=poses', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("体式库")')).toHaveAttribute('aria-current', 'page')
  })

  test('深链接后 URL 参数被清除', async ({ page }) => {
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(500)
    expect(page.url()).not.toContain('tab=')
  })
})
