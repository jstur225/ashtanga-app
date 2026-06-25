/**
 * L4 Tab 切换 + 滚动保持测试
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 Tab 切换', () => {
  test('四个 Tab 双向切换 + aria-current 同步', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const nav = page.locator('nav[aria-label="主要导航"]')
    const mappings: [string, string][] = [
      ['今日练习', 'practice'],
      ['觉察日记', 'journal'],
      ['体式库', 'poses'],
      ['我的数据', 'stats'],
    ]

    for (const [label, _key] of mappings) {
      await nav.locator(`button:has-text("${label}")`).click()
      await expect(nav.locator(`button:has-text("${label}")`)).toHaveAttribute('aria-current', 'page')
    }

    // 切回 practice
    await nav.locator('button:has-text("今日练习")').click()
    await expect(nav.locator('button:has-text("今日练习")')).toHaveAttribute('aria-current', 'page')
  })

  test('切 Tab 后切回来：practice 内容保持可见', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.getByText('熬汤日记', { exact: false })).toBeVisible()

    await page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")').click()
    await page.waitForTimeout(1500)

    await page.locator('nav[aria-label="主要导航"] button:has-text("今日练习")').click()
    await expect(page.getByText('熬汤日记', { exact: false })).toBeVisible({ timeout: 5_000 })
  })

  test('快速切换不报 console.error', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const labels = ['觉察日记', '体式库', '我的数据', '今日练习', '觉察日记', '今日练习']
    for (const label of labels) {
      await page.locator(`nav[aria-label="主要导航"] button:has-text("${label}")`).click()
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(1500)

    const criticalErrors = consoleCapture.errors.filter((e) =>
      !/Failed to load resource/i.test(e) &&
      !/404/i.test(e)
    )
    expect(criticalErrors).toEqual([])
  })
})
