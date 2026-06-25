/**
 * L4 移动端视口测试
 */
import { test, expect, waitForHydration } from './fixtures'

async function checkNoHScroll(page: import('@playwright/test').Page) {
  const has = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
  // 允许 2px 误差（浏览器像素舍入）
  expect(has, '页面不应有水平滚动条').toBe(false)
}

test.describe('L4 移动端视口', () => {
  test('iPhone SE (375x667)：布局不溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await checkNoHScroll(page)
  })

  test('400px 视口：布局正常', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await checkNoHScroll(page)
  })

  test('768px (iPad) 视口：布局正常', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await checkNoHScroll(page)
  })

  test('移动端：开始练习按钮在视口内', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 选一个选项让按钮变成"开始练习"
    await page.locator('main button', { hasText: '一序列' }).first().click()
    const startBtn = page.locator('button[aria-label="开始练习"]')
    await expect(startBtn).toBeVisible()
    const box = await startBtn.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(376)
  })

  test('移动端：底部导航四个 Tab 渲染正确', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const nav = page.locator('nav[aria-label="主要导航"]')
    await expect(nav).toBeVisible()

    const navBox = await nav.boundingBox()
    expect(navBox).toBeTruthy()
    expect(navBox!.x).toBeGreaterThanOrEqual(0)
    expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(376)

    for (const label of ['今日练习', '觉察日记', '体式库', '我的数据']) {
      await expect(nav.locator(`button:has-text("${label}")`)).toBeVisible()
    }
  })
})
