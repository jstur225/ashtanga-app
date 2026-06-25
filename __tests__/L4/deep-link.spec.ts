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

  test('?tab=invalid 非法值 → 应回退到 practice（默认 tab）', async ({ page, consoleCapture }) => {
    await page.goto('/practice?tab=invalid', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 默认 tab (practice) 应该高亮
    await expect(
      page.locator('nav[aria-label="主要导航"] button:has-text("今日练习")')
    ).toHaveAttribute('aria-current', 'page')

    // 不应有 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(0)
  })

  test('?tab= 空值 → 应回退到 practice（默认 tab）', async ({ page, consoleCapture }) => {
    await page.goto('/practice?tab=', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 默认 tab (practice) 应该高亮
    await expect(
      page.locator('nav[aria-label="主要导航"] button:has-text("今日练习")')
    ).toHaveAttribute('aria-current', 'page')

    // 不应有 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(0)
  })

  test('深链接刷新 → 无 hydration 错误', async ({ page, consoleCapture }) => {
    await page.goto('/practice?tab=stats', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(500)

    // 刷新页面
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(500)

    // 刷新后不应有 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(0)

    // 默认 tab (practice) 应该高亮（URL 参数刷新后被清除）
    await expect(
      page.locator('nav[aria-label="主要导航"] button:has-text("今日练习")')
    ).toHaveAttribute('aria-current', 'page')
  })
})
