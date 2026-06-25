/**
 * L4 URL 状态测试：浏览器返回/前进
 *
 * 覆盖矩阵缺口：URL 参数/返回/刷新/深链接
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 URL 返回/前进', () => {
  test('浏览器返回 → 无 hydration 错误', async ({ page, consoleCapture }) => {
    // 从 practice 页面开始
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(500)

    const initialHydrationErrors = consoleCapture.hydrationErrors

    // 点击"我的数据"tab → 触发 URL 变化（如果 app 用 router.push）
    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    await page.waitForTimeout(800)

    // 再点"觉察日记"
    await page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")').click()
    await page.waitForTimeout(800)

    // 浏览器返回
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // 浏览器再次返回
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // 不应新增 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(initialHydrationErrors)
  })

  test('浏览器前进 → 无 hydration 错误', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await page.waitForTimeout(500)

    const initialHydrationErrors = consoleCapture.hydrationErrors

    // 制造历史：stats → journal
    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    await page.waitForTimeout(800)
    await page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")').click()
    await page.waitForTimeout(800)

    // 返回 stats
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    // 前进（回到 journal）
    await page.goForward({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // 不应新增 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(initialHydrationErrors)
  })
})
