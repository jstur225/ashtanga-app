/**
 * L4 冒烟测试：验证基础设施跑通
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 冒烟测试', () => {
  test('/practice 200 加载成功，标题与导航可见', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.getByText('熬汤日记', { exact: false })).toBeVisible()

    for (const label of ['今日练习', '觉察日记', '体式库', '我的数据']) {
      await expect(page.locator(`nav[aria-label="主要导航"] button:has-text("${label}")`)).toBeVisible()
    }

    await expect(page.locator('button[aria-label="请先选择练习类型"], button[aria-label="开始练习"]')).toHaveCount(1)
  })

  test('页面加载无 console.error / hydration mismatch', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(1500)

    expect(consoleCapture.hydrationErrors, `hydration errors: ${consoleCapture.errors.join('\n')}`).toBe(0)
    const criticalErrors = consoleCapture.errors.filter((e) =>
      !/Failed to load resource.*\.(png|jpg|ico|svg)/i.test(e) &&
      !/404.*icon/i.test(e) &&
      !/the server responded with a status of 404/i.test(e)
    )
    expect(criticalErrors, `unexpected console errors:\n${criticalErrors.join('\n')}`).toEqual([])
  })

  test('标题不为空', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('practice Tab 默认激活', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("今日练习")')).toHaveAttribute('aria-current', 'page')
  })
})
