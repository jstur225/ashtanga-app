import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const normalizedDir = path.join(root, 'output', 'primary-series-ip-v3', 'finishing', 'user-supplied', 'normalized')
const finalDir = path.join(root, 'output', 'primary-series-ip-v3', 'finishing', 'final')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'finishing')

const inputs = [
  {
    order: '02',
    file: 'halasana.png',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-5de24d98-965d-4b19-a2ee-982bb818da05.png',
    targetWidth: 940,
    targetHeight: 760,
  },
  {
    order: '03',
    file: 'karnapidasana.png',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-1dc79c77-b852-48cd-8a62-37b9ab6c5612.png',
    targetWidth: 940,
    targetHeight: 760,
    flipX: true,
  },
  {
    order: '05',
    file: 'pindasana.png',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-2722169c-9107-47a9-bab3-a5d936ecdf2d.png',
    targetWidth: 860,
    targetHeight: 860,
    flipX: true,
  },
  {
    order: '07',
    file: 'uttana-padasana.png',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-7dad10d5-c18f-41c6-803a-ed16f9a33b2f.png',
    targetWidth: 940,
    targetHeight: 760,
  },
  {
    order: '09',
    file: 'sirsasana-02.png',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-3e344a23-75ba-40bd-a4af-af50db178af6.png',
    targetWidth: 900,
    targetHeight: 900,
    flipX: true,
  },
]

function colorDistance(a, b) {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function floodBackground(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = []
  const cornerSamples = [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1,
  ]
  const bg = [0, 1, 2].map(channel => Math.round(
    cornerSamples.reduce((sum, index) => sum + data[index * 4 + channel], 0) / cornerSamples.length,
  ))

  const canErase = index => {
    if (visited[index]) return false
    const offset = index * 4
    if (data[offset + 3] <= 10) return true
    const rgb = [data[offset], data[offset + 1], data[offset + 2]]
    const max = Math.max(...rgb)
    const min = Math.min(...rgb)
    return max >= 205 && max - min <= 38 && colorDistance(rgb, bg) <= 76
  }

  const push = index => {
    if (canErase(index)) {
      visited[index] = 1
      queue.push(index)
    }
  }

  for (let x = 0; x < width; x += 1) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width)
    push(y * width + width - 1)
  }

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head]
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) push(index - 1)
    if (x < width - 1) push(index + 1)
    if (y > 0) push(index - width)
    if (y < height - 1) push(index + width)
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0
  }
}

function boundsOfAlpha(data, width, height) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 }
}

async function processOne(item) {
  const { data, info } = await sharp(item.input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  floodBackground(data, info.width, info.height)
  const bounds = boundsOfAlpha(data, info.width, info.height)
  if (bounds.right < 0) throw new Error(`${item.file}: no visible pixels after background removal`)

  const cropped = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(bounds)
    .resize(item.targetWidth, item.targetHeight, { fit: 'inside', withoutEnlargement: true })
    .flop(item.flipX === true)
    .png()
    .toBuffer()

  const canvas = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: '#00000000' },
  })
    .composite([{ input: cropped, gravity: 'center' }])
    .png()
    .toBuffer()

  await fs.mkdir(normalizedDir, { recursive: true })
  await fs.mkdir(finalDir, { recursive: true })
  await fs.mkdir(publicDir, { recursive: true })

  const normalizedPath = path.join(normalizedDir, `${item.order}-${item.file}`)
  const finalPath = path.join(finalDir, item.file)
  const baseName = item.file.replace(/\.png$/i, '')

  await fs.writeFile(normalizedPath, canvas)
  await fs.writeFile(finalPath, canvas)
  await sharp(canvas)
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}.webp`))
  await sharp(canvas)
    .resize(320, 320, { fit: 'fill' })
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}-thumb.webp`))

  return {
    order: item.order,
    file: item.file,
    normalized: path.relative(root, normalizedPath).replaceAll('\\', '/'),
    final: path.relative(root, finalPath).replaceAll('\\', '/'),
    bounds,
  }
}

const results = []
for (const item of inputs) results.push(await processOne(item))

await fs.writeFile(
  path.join(normalizedDir, 'import-report.json'),
  `${JSON.stringify(results, null, 2)}\n`,
)

for (const result of results) console.log(`${result.order} ${result.file}`)
