/**
 * L4 刷新恢复测试：练习中刷新 → 状态保持
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 刷新恢复', () => {
  test('练习中刷新：保持练习状态 + 无 hydration 错误', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("暂停")')).toBeVisible({ timeout: 15_000 })

    // 刷新
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('button:has-text("暂停"), button:has-text("结束")').first()).toBeVisible({ timeout: 30_000 })

    expect(consoleCapture.hydrationErrors, `errors: ${consoleCapture.errors.join('\n')}`).toBe(0)
  })

  test('暂停中刷新：暂停状态保持', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("暂停")')).toBeVisible({ timeout: 15_000 })
    await page.locator('button:has-text("暂停")').click()
    await expect(page.locator('button:has-text("继续")')).toBeVisible()

    // 刷新
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('button:has-text("继续")')).toBeVisible({ timeout: 30_000 })
  })

  test('多次刷新无 hydration 错误', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    for (let i = 0; i < 2; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForHydration(page)
    }
    await page.waitForTimeout(1500)
    expect(consoleCapture.hydrationErrors).toBe(0)
  })
})
