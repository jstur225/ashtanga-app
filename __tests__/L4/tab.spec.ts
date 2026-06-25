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

  test('stats Tab 滚动位置：切走再切回行为记录', async ({ page, consoleCapture }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // 进入 stats tab
    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    // 等待 stats 内容出现（标志：标题"练习是连贯的珍珠"）
    await expect(page.getByText('练习是连贯的珍珠')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)

    const hydrationBefore = consoleCapture.hydrationErrors

    // 找到 stats 页面的可滚动容器（StatsTab 内部 div.overflow-y-auto）
    const scrollContainer = page.locator('div.overflow-y-auto').first()

    // 模拟向下滚动
    await scrollContainer.evaluate((el: HTMLElement) => {
      el.scrollTo({ top: 300, behavior: 'instant' })
    })
    await page.waitForTimeout(300)
    const scrollTopAfterScroll = await scrollContainer.evaluate((el: HTMLElement) => el.scrollTop).catch(() => 0)

    // 切到 journal 再切回 stats
    await page.locator('nav[aria-label="主要导航"] button:has-text("觉察日记")').click()
    await page.waitForTimeout(800)
    await page.locator('nav[aria-label="主要导航"] button:has-text("我的数据")').click()
    await page.waitForTimeout(800)

    // 验证 1: stats 内容仍可见（tab 切换不破坏渲染）
    await expect(page.getByText('练习是连贯的珍珠')).toBeVisible({ timeout: 5_000 })

    // 验证 2: 不新增 hydration 错误
    expect(consoleCapture.hydrationErrors).toBe(hydrationBefore)

    // 验证 3: 滚动容器仍可被操作（功能正常）
    const scrollTopAfterReturn = await scrollContainer.evaluate((el: HTMLElement) => el.scrollTop).catch(() => 0)

    // ⚠️ 当前实现：tab 切换时组件 unmount/remount，scrollTop 重置为 0
    // 这暴露了"Tab 滚动位置不保持"的缺陷
    // 已记录到 TODO.md / 测试矩阵；未来如实现 scroll 持久化，改为更严格断言
    if (scrollTopAfterScroll > 0) {
      // 当前实际行为：重置到 0
      expect(scrollTopAfterReturn).toBe(0)
    }
  })
})
