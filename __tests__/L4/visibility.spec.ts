/**
 * L4 后台/前台切换测试
 *
 * 覆盖矩阵缺口：媒体后台恢复进度
 *
 * 注：当前 app 未实现 visibilitychange 自动暂停（仅 React 状态保持）。
 * 这些测试验证：visibilitychange 事件不破坏 app 状态、不产生 hydration 错误、
 * 用户回到前台后能继续操作。如果未来加自动暂停，需要更新这些断言。
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 visibilitychange 后台/前台切换', () => {
  test('练习中切后台再切回 → 控件状态保持（不崩溃）', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 开始练习
    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("暂停")')).toBeVisible({ timeout: 15_000 })

    const hydrationBefore = consoleCapture.hydrationErrors

    // 模拟切后台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 模拟切回前台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 控件应仍然可见（无论是否自动暂停）
    const visibleButtons = page.locator('button:has-text("暂停"), button:has-text("继续"), button:has-text("结束")')
    await expect(visibleButtons.first()).toBeVisible()

    // 不应新增 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(hydrationBefore)
  })

  test('暂停后切后台再切回 → 仍处于暂停态', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("暂停")')).toBeVisible({ timeout: 15_000 })

    // 手动点击暂停
    await page.locator('button:has-text("暂停")').click()
    await expect(page.locator('button:has-text("继续")')).toBeVisible()

    // 切后台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 切回前台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 仍处于暂停态
    await expect(page.locator('button:has-text("继续")')).toBeVisible()
  })

  test('口令模式中切后台再切回 → 控件状态保持', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 进入口令模式
    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })

    // 等待控制按钮出现
    await expect(
      page.locator('button:has-text("暂停"), button:has-text("结束")').first()
    ).toBeVisible({ timeout: 20_000 })

    // 切后台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 切回前台
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // 控件状态应保持（至少有一个控制按钮可见）
    const afterButtons = page.locator('button:has-text("暂停"), button:has-text("继续"), button:has-text("结束"), button:has-text("重试")')
    await expect(afterButtons.first()).toBeVisible()
  })
})
