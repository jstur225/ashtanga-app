/**
 * L4 音频降级测试：拦截音频请求 → 验证 UI 降级
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 音频降级', () => {
  test('口令模式：音频失败 → 重试/结束按钮可见', async ({ page }) => {
    await page.route(/\.(mp3|wav|ogg|m4a|webm)(\?|$)/i, (route) => route.abort('failed'))

    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })

    // 加载失败后应看到重试或结束按钮
    const anyBtn = page.locator('button:has-text("重试"), button:has-text("结束")').first()
    await expect(anyBtn).toBeVisible({ timeout: 20_000 })
  })

  test('音频失败后：结束 → 放弃回到首页', async ({ page }) => {
    await page.route(/\.(mp3|wav|ogg|m4a|webm)(\?|$)/i, (route) => route.abort('failed'))

    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("结束")')).toBeVisible({ timeout: 20_000 })

    await page.locator('button:has-text("结束")').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const discardBtn = dialog.locator('button:has-text("放弃"), button:has-text("不保存"), button:has-text("取消")').first()
    await discardBtn.click()

    await expect(page.locator('button[aria-label="开始练习"], button[aria-label="请先选择练习类型"]')).toBeVisible({ timeout: 10_000 })
  })
})
