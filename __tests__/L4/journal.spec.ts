/**
 * L4 日记 CRUD 测试（登录态 project，可用本地 seed 保持稳定）
 */
import { test, expect, seedL4PracticeData, waitForHydration } from './fixtures'

test.describe('L4 日记 CRUD', () => {
  test('日记 Tab 渲染：固定 seed 记录可见', async ({ page }) => {
    await seedL4PracticeData(page)
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    await expect(page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('L4 seeded practice note')).toBeVisible({ timeout: 10_000 })
  })

  test('补录按钮：点击打开补录 UI', async ({ page }) => {
    await seedL4PracticeData(page)
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const addBtn = page.getByTestId('journal-add-record')
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    await expect(page.getByText('添加练习')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: '保存练习' })).toBeVisible({ timeout: 10_000 })
  })

  test('分享卡：点击记录正文打开分享 UI', async ({ page }) => {
    await seedL4PracticeData(page)
    await page.goto('/practice?tab=journal', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const recordTrigger = page.getByTestId('journal-record-share-trigger').first()
    await expect(recordTrigger).toBeVisible({ timeout: 10_000 })
    await recordTrigger.click()

    await expect(page.locator('#share-card-content').getByText('L4 seeded breakthrough')).toBeVisible({ timeout: 10_000 })
  })
})
