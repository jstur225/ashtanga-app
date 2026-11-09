import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(toolRoot, 'dist')

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(target))
    else files.push(target)
  }
  return files
}

async function loadData() {
  const source = await fs.readFile(path.join(distRoot, 'data', 'poses.js'), 'utf8')
  const context = { window: {} }
  vm.runInNewContext(source, context)
  return context.window.__ASHTANGA_POSE_DATA__
}

test('导出正式库 94 条体式并映射为四个栏目', async () => {
  const data = await loadData()
  assert.equal(data.total, 94)
  assert.equal(data.poses.length, 94)
  const counts = data.poses.reduce((result, pose) => {
    result[pose.section] ||= []
    result[pose.section].push(pose)
    return result
  }, {})
  assert.equal(counts.sun.length, 30)
  assert.equal(counts.standing.length, 18)
  assert.equal(counts.seated.length, 33)
  assert.equal(counts.rest.length, 13)
})

test('完整导出正式库的名称、凝视点和 Vinyasa 分解', async () => {
  const data = await loadData()
  assert.ok(data.poses.every(pose => pose.instructionStatus === 'approved'))
  assert.ok(data.poses.every(pose => pose.cueName))
  assert.ok(data.poses.every(pose => pose.drishti))
  assert.ok(data.poses.every(pose => (
    pose.vinyasaCount === null || Number.isInteger(pose.vinyasaCount)
  )))

  const sunPoses = data.poses.filter(pose => pose.section === 'sun')
  assert.ok(sunPoses.every(pose => pose.action))

  const asanaPoses = data.poses.filter(pose => pose.section !== 'sun')
  assert.ok(asanaPoses.every(pose => pose.vinyasaSteps.length > 0))
  assert.equal(
    asanaPoses
      .filter(pose => !pose.vinyasaSteps.some(step => step.isAsana))
      .map(pose => pose.id)
      .join(','),
    'finishing-savasana',
  )
})

test('每条体式只使用一张移动端图片并同时供列表和详情展示', async () => {
  const data = await loadData()
  for (const pose of data.poses) {
    assert.equal(pose.thumbnail, pose.image)
    await fs.access(path.join(distRoot, ...pose.image.split('/')))
  }
  assert.equal(new Set(data.poses.map(pose => pose.image)).size, 94)
})

test('透明人物素材转为 JPG 后使用页面米白底而不是黑底', async () => {
  const sample = path.join(
    distRoot,
    'assets',
    'poses',
    'standing',
    'padangusthasana.jpg',
  )
  const metadata = await sharp(sample).metadata()
  assert.equal(metadata.width, 768)
  assert.equal(metadata.height, 768)
  const pixel = await sharp(sample)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer()
  assert.ok(
    pixel[0] > 235 && pixel[1] > 235 && pixel[2] > 230,
    `缩略图透明背景被错误转换：rgb(${pixel.join(',')})`,
  )
})

test('上传目录不超过 200 个文件且只包含允许的静态文件', async () => {
  const allowed = new Set(['.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.json', '.woff', '.woff2'])
  const files = await listFiles(distRoot)
  assert.ok(files.length > 100)
  assert.ok(files.length <= 200, `上传目录共有 ${files.length} 个文件，超过 200 个上限`)
  for (const file of files) {
    const extension = path.extname(file).toLowerCase()
    assert.ok(allowed.has(extension), `不允许的文件类型：${file}`)
    assert.notEqual(extension, '.webp')
  }
})

test('运行时代码不发起网络数据请求', async () => {
  const app = await fs.readFile(path.join(distRoot, 'app.js'), 'utf8')
  assert.doesNotMatch(app, /\bfetch\s*\(/)
  assert.doesNotMatch(app, /XMLHttpRequest|WebSocket|EventSource/)
})

test('页面包含吸顶搜索和固定底部导航', async () => {
  const css = await fs.readFile(path.join(distRoot, 'styles.css'), 'utf8')
  assert.match(css, /\.search-sticky\s*\{[^}]*position:\s*sticky/s)
  assert.match(css, /\.bottom-navigation\s*\{[^}]*position:\s*fixed/s)
})

test('符合小红书小工具 ZIP 入口、CSP、路径与端能力规范', async () => {
  const files = await listFiles(distRoot)
  const htmlFiles = files.filter(file => path.extname(file).toLowerCase() === '.html')
  assert.equal(htmlFiles.length, 1)
  assert.equal(path.relative(distRoot, htmlFiles[0]), 'index.html')

  const html = await fs.readFile(path.join(distRoot, 'index.html'), 'utf8')
  const css = await fs.readFile(path.join(distRoot, 'styles.css'), 'utf8')
  const app = await fs.readFile(path.join(distRoot, 'app.js'), 'utf8')
  assert.match(html, /^<!doctype html>/i)
  assert.match(html, /<html\s+lang="zh-CN">/i)
  assert.match(html, /<meta\s+charset="UTF-8"\s*\/?>/i)
  assert.match(html, /width=device-width/)
  assert.match(html, /initial-scale=1\.0/)
  assert.match(html, /viewport-fit=cover/)
  assert.doesNotMatch(html, /<base\b|<iframe\b|<object\b/i)
  assert.doesNotMatch(html, /\son\w+\s*=|javascript:/i)
  assert.doesNotMatch(html, /<script(?![^>]+\bsrc=)[^>]*>/i)

  const references = Array.from(html.matchAll(/\b(?:src|href)="([^"]+)"/g), match => match[1])
  for (const reference of references) {
    assert.match(reference, /^\.\//, `资源必须使用 ./ 相对路径：${reference}`)
    assert.doesNotMatch(reference, /^https?:|^\/\//i)
    await fs.access(path.join(distRoot, ...reference.replace(/^\.\//, '').split('/')))
  }

  const forbidden = [
    /\bfetch\s*\(/,
    /XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection/,
    /navigator\.(?:geolocation|clipboard|bluetooth|usb|hid|serial|serviceWorker)/,
    /\b(?:Shared)?Worker\s*\(/,
    /\beval\s*\(|new\s+Function\s*\(|WebAssembly/,
    /window\.(?:open|prompt)\s*\(/,
    /requestFullscreen|webkitRequestFullscreen/,
    /location\.(?:href\s*=|assign\s*\()/,
  ]
  for (const pattern of forbidden) {
    assert.doesNotMatch(`${html}\n${css}\n${app}`, pattern)
  }

  assert.match(css, /touch-action:\s*manipulation/)
  assert.match(css, /-webkit-touch-callout:\s*none/)
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/)
  const safeAreaLines = css.split('\n').filter(line => line.includes('env(safe-area-inset-'))
  assert.ok(safeAreaLines.length > 0)
  assert.ok(safeAreaLines.every(line => line.includes('var(--safe-area-inset-')))

  const resolvedSizes = await Promise.all(files.map(async file => (await fs.stat(file)).size))
  assert.ok(
    resolvedSizes.reduce((sum, size) => sum + size, 0) < 10 * 1024 * 1024,
    '未压缩目录超过 10MB',
  )
})

test('UI 与网页版保持一致且不展示正式网址', async () => {
  const html = await fs.readFile(path.join(distRoot, 'index.html'), 'utf8')
  const css = await fs.readFile(path.join(distRoot, 'styles.css'), 'utf8')
  assert.doesNotMatch(html, /ash\.ashtangalife\.online/)
  assert.doesNotMatch(html, /<a\b/)
  assert.match(html, /欢迎前往作者主页，体验完整版熬汤日记 APP/)
  assert.match(css, /--paper:\s*#f9f8f6/i)
  assert.match(css, /\.brand-logo\s*\{[^}]*border-radius:\s*50%/s)
  assert.match(css, /\.pose-thumbnail\s*\{[^}]*display:\s*block[^}]*aspect-ratio:\s*1/s)
  assert.match(css, /font-family:\s*AshtangaSerif/)
  assert.match(css, /\.tool-intro\s*\{[^}]*text-align:\s*center/s)
  assert.doesNotMatch(css.match(/\.brand-header\s*\{[^}]*\}/s)?.[0] || '', /border-bottom/)

  const fontCss = await fs.readFile(path.join(distRoot, 'fonts.css'), 'utf8')
  assert.match(fontCss, /@font-face\{font-family:AshtangaSerif/)
  const fontFiles = (await listFiles(path.join(distRoot, 'assets', 'fonts')))
    .filter(file => file.endsWith('.woff2'))
  assert.equal(fontFiles.length, 20)
})
