import assert from 'node:assert/strict'
import { createReadStream, promises as fs } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(toolRoot, 'dist')
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
}

let server
let browser
let baseUrl

test.before(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
    const target = path.resolve(distRoot, relative)
    if (!target.startsWith(distRoot)) {
      response.writeHead(403).end()
      return
    }
    try {
      const stat = await fs.stat(target)
      if (!stat.isFile()) throw new Error('not a file')
      response.writeHead(200, {
        'content-type': mimeTypes[path.extname(target)] || 'application/octet-stream',
        'content-length': stat.size,
      })
      createReadStream(target).pipe(response)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
  browser = await chromium.launch({ headless: true })
})

test.after(async () => {
  await browser?.close()
  await new Promise(resolve => server?.close(resolve))
})

test('375/390/430px 下页面没有横向溢出', async () => {
  for (const width of [375, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } })
    await page.goto(baseUrl)
    await page.locator('.pose-card').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      cards: document.querySelectorAll('.pose-card').length,
      thumbnail: document.querySelector('.pose-thumbnail').getBoundingClientRect(),
      navWidth: document.querySelector('.navigation-inner').getBoundingClientRect().width,
      fontLoaded: document.fonts.check('16px AshtangaSerif'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      titleCenter: document.querySelector('.tool-intro').getBoundingClientRect().left
        + document.querySelector('.tool-intro').getBoundingClientRect().width / 2,
      iconAlignment: Array.from(document.querySelectorAll('.navigation-inner button')).map(button => {
        const buttonBox = button.getBoundingClientRect()
        const iconBox = button.querySelector('svg').getBoundingClientRect()
        return {
          delta: Math.abs(
            buttonBox.left + buttonBox.width / 2 - (iconBox.left + iconBox.width / 2),
          ),
          size: iconBox.width,
        }
      }),
    }))
    assert.equal(metrics.documentWidth, metrics.viewport, `${width}px 出现横向溢出`)
    assert.equal(metrics.cards, 30)
    assert.ok(Math.abs(metrics.thumbnail.width - metrics.thumbnail.height) < 1, `${width}px 卡片不是正方形`)
    assert.ok(metrics.navWidth < width - 20, `${width}px 底部导航过宽`)
    assert.equal(metrics.fontLoaded, true, `${width}px 字体没有加载`)
    assert.match(metrics.bodyFont, /^AshtangaSerif/)
    assert.ok(Math.abs(metrics.titleCenter - width / 2) < 1, `${width}px 标题未居中`)
    assert.ok(metrics.iconAlignment.every(icon => icon.delta < 1), `${width}px 导航图标未居中`)
    assert.ok(metrics.iconAlignment.every(icon => icon.size === 22), `${width}px 导航图标尺寸不一致`)
    await page.close()
  }
})

test('搜索吸顶、四栏目、全局搜索和详情返回位置正常', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 812 } })
  const remoteRequests = []
  page.on('request', request => {
    if (!request.url().startsWith(baseUrl)) remoteRequests.push(request.url())
  })

  await page.goto(baseUrl)
  await page.locator('.pose-card').first().waitFor()
  await page.evaluate(() => {
    const search = document.querySelector('.search-sticky')
    window.scrollTo(0, search.offsetTop + 180)
  })
  await page.waitForFunction(
    () => Math.abs(document.querySelector('.search-sticky').getBoundingClientRect().top) < 1,
  )
  const stickyBox = await page.locator('.search-sticky').boundingBox()
  assert.ok(stickyBox && Math.abs(stickyBox.y) < 1, `搜索框未吸顶：y=${stickyBox?.y}`)

  await page.locator('[data-section="seated"]').click()
  await page.waitForFunction(() => document.querySelectorAll('.pose-card').length === 33)
  assert.equal(await page.locator('[data-section="seated"]').getAttribute('aria-current'), 'page')

  await page.locator('#pose-search').fill('Savasana')
  await page.waitForFunction(() => document.querySelectorAll('.pose-card').length === 1)
  assert.equal(await page.locator('[data-section][aria-current="page"]').count(), 0)
  assert.match(await page.locator('.result-summary').textContent(), /找到 1 个体式/)

  await page.locator('.clear-search').click()
  await page.locator('[data-section="rest"]').click()
  await page.waitForFunction(() => document.querySelectorAll('.pose-card').length === 13)
  await page.locator('.pose-card').nth(10).scrollIntoViewIfNeeded()
  const beforeOpen = await page.evaluate(() => window.scrollY)
  await page.locator('.pose-card').nth(10).click()
  await page.locator('.pose-detail:not([hidden])').waitFor()
  assert.match(await page.locator('.detail-count').textContent(), /11 \/ 13/)
  assert.ok(await page.locator('.detail-cue-name').textContent())
  assert.ok(await page.locator('.detail-drishti').textContent())
  assert.ok(await page.locator('.vinyasa-step').count() > 0)
  assert.ok(await page.locator('.vinyasa-step.is-asana').count() > 0)
  await page.locator('.detail-next').click()
  assert.match(await page.locator('.detail-count').textContent(), /12 \/ 13/)
  await page.locator('.detail-close').click()
  const afterClose = await page.evaluate(() => window.scrollY)
  assert.ok(Math.abs(afterClose - beforeOpen) <= 2, `滚动位置未恢复：${beforeOpen} → ${afterClose}`)
  assert.deepEqual(remoteRequests, [])
  await page.close()
})

test('兼容 PC 模拟器注入的顶部和底部安全区变量', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(baseUrl)
  await page.locator('.pose-card').first().waitFor()
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '20px')
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px')
  })

  const listSafeArea = await page.evaluate(() => ({
    pageTop: getComputedStyle(document.querySelector('.page-shell')).paddingTop,
    navBottom: getComputedStyle(document.querySelector('.bottom-navigation')).paddingBottom,
  }))
  assert.equal(listSafeArea.pageTop, '20px')
  assert.equal(listSafeArea.navBottom, '54px')

  await page.locator('.pose-card').first().click()
  await page.locator('.pose-detail:not([hidden])').waitFor()
  const detailSafeArea = await page.evaluate(() => ({
    closeTop: getComputedStyle(document.querySelector('.detail-close')).top,
    controlsBottom: getComputedStyle(document.querySelector('.detail-navigation')).bottom,
  }))
  assert.equal(detailSafeArea.closeTop, '32px')
  assert.equal(detailSafeArea.controlsBottom, '50px')
  await page.close()
})
