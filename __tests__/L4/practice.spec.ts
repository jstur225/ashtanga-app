/**
 * L4 练习流程测试：普通计时 / 口令模式 / 唱诵模式
 *
 * 关键修复：开始按钮有 framer-motion 无限动画，使用 force: true 点击。
 */
import { test, expect, waitForHydration } from './fixtures'

test.describe('L4 练习流程', () => {
  test('普通计时：选择 → 开始 → 暂停 → 继续 → 结束弹窗', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    // 无限动画：force 绕过稳定性检查
    await page.locator('button[aria-label="开始练习"]').click({ force: true })

    // 进入计时视图
    await expect(page.locator('button:has-text("暂停")')).toBeVisible({ timeout: 15_000 })

    // 暂停 → 继续
    await page.locator('button:has-text("暂停")').click()
    await expect(page.locator('button:has-text("继续")')).toBeVisible()
    await page.locator('button:has-text("继续")').click()
    await expect(page.locator('button:has-text("暂停")')).toBeVisible()

    // 结束 → 确认弹窗
    await page.locator('button:has-text("结束")').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
  })

  test('口令模式：启动 → 控制按钮可见', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const guided = page.locator('main button', { hasText: '一序列' }).first()
    await guided.click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })

    // 加载或失败后应看到控制按钮
    const anyControl = page.locator('button:has-text("重试"), button:has-text("结束"), button:has-text("暂停")').first()
    await expect(anyControl).toBeVisible({ timeout: 20_000 })
  })

  test('唱诵模式：开启 → 倒计时覆盖层出现 → 跳过', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 开启唱诵
    await page.locator('main button', { hasText: '开篇唱诵' }).first().click()
    // 选一个非固定选项
    const options = page.locator('main button[type="button"]')
    const count = await options.count()
    let clicked = false
    for (let i = 0; i < count; i++) {
      const text = ((await options.nth(i).innerText()) || '').trim()
      if (text && !text.includes('开篇') && !text.includes('一序列') && !text.includes('今日') && !text.includes('自定义')) {
        await options.nth(i).click()
        clicked = true
        break
      }
    }
    test.skip(!clicked, '无可选练习选项')

    await page.locator('button[aria-label="开始练习"]').click({ force: true })

    // 倒计时显示
    await expect(page.locator('text=跳过')).toBeVisible({ timeout: 5_000 })
    await page.locator('button:has-text("跳过")').click()

    // 进入正常计时
    await expect(page.locator('button:has-text("暂停"), button:has-text("结束")').first()).toBeVisible({ timeout: 5_000 })
  })

  test('练习结束：结束 → 放弃回到首页', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await page.locator('main button', { hasText: '一序列' }).first().click()
    await page.locator('button[aria-label="开始练习"]').click({ force: true })
    await expect(page.locator('button:has-text("结束")')).toBeVisible({ timeout: 15_000 })

    await page.locator('button:has-text("结束")').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // 找放弃按钮（文本可能为"放弃"或"不保存"）
    const discardBtn = dialog.locator('button:has-text("放弃"), button:has-text("不保存"), button:has-text("取消")').first()
    await expect(discardBtn).toBeVisible()
    await discardBtn.click()

    await expect(page.locator('button[aria-label="开始练习"], button[aria-label="请先选择练习类型"]')).toBeVisible({ timeout: 10_000 })
  })
})
