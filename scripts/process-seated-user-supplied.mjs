import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outputDir = path.join(root, 'output', 'primary-series-ip-v3', 'seated', 'generated', 'user-supplied', 'normalized')

const inputs = [
  {
    order: '04',
    label: 'paschimottanasana-c',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-3050fe4d-c35f-4f5e-9705-e810b71175fd.png',
    output: '04-paschimottanasana-c-transparent-v1.png',
    targetWidth: 920,
    targetHeight: 560,
  },
  {
    order: '05',
    label: 'purvottanasana',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-c215b755-b106-4c2c-aaf8-ed7a0c12a5b4.png',
    output: '05-purvottanasana-transparent-v1.png',
    targetWidth: 900,
    targetHeight: 720,
  },
  {
    order: '06',
    label: 'ardha-baddha-padma-paschimottanasana',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-b42292d1-a4a3-4039-8edc-af001937b2e1.png',
    output: '06-ardha-baddha-padma-paschimottanasana-transparent-v1.png',
    targetWidth: 920,
    targetHeight: 620,
  },
  {
    order: '12',
    label: 'marichyasana-b',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-87e2e028-5b6d-443a-8e7b-7a16d7e23c74.png',
    output: '12-marichyasana-b-transparent-v1.png',
    targetWidth: 820,
    targetHeight: 820,
  },
  {
    order: '14',
    label: 'marichyasana-d',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-b3eab2df-92f2-4216-a231-95f590569f41.png',
    output: '14-marichyasana-d-transparent-v1.png',
    targetWidth: 720,
    targetHeight: 850,
  },
  {
    order: '16',
    label: 'bhujapidasana-02',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-e8cd5131-3023-4e21-99cd-a3630400bf5f.png',
    output: '16-bhujapidasana-02-transparent-v1.png',
    targetWidth: 850,
    targetHeight: 760,
    flipHorizontal: true,
  },
  {
    order: '19',
    label: 'garbha-pindasana',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-ad1da539-5bc1-436b-acbb-d36a9afa7a5e.png',
    output: '19-garbha-pindasana-transparent-v1.png',
    targetWidth: 760,
    targetHeight: 800,
  },
  {
    order: '21',
    label: 'baddha-konasana-a',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-8044d20c-3d6e-4ea9-9c00-3dd60795d9c3.png',
    output: '21-baddha-konasana-a-transparent-v1.png',
    targetWidth: 850,
    targetHeight: 720,
    flipHorizontal: true,
  },
  {
    order: '22',
    label: 'baddha-konasana-b',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-54bc0d39-557b-4187-9321-ea8d6c7de635.png',
    output: '22-baddha-konasana-b-transparent-v1.png',
    targetWidth: 850,
    targetHeight: 850,
    flipHorizontal: true,
  },
  {
    order: '25',
    label: 'supta-konasana-01',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-d5ee5894-cda7-427b-8c39-cbc0e953bd2d.png',
    output: '25-supta-konasana-01-transparent-v1.png',
    targetWidth: 920,
    targetHeight: 660,
  },
  {
    order: '31',
    label: 'setu-bandhasana',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-b6440922-55f3-4cb8-9717-586f7d0c0599.png',
    output: '31-setu-bandhasana-transparent-v1.png',
    targetWidth: 920,
    targetHeight: 600,
  },
  {
    order: '33',
    label: 'paschimottanasana',
    input: 'C:/Users/BIN/AppData/Local/Temp/codex-clipboard-3050fe4d-c35f-4f5e-9705-e810b71175fd.png',
    output: '33-paschimottanasana-transparent-v1.png',
    targetWidth: 920,
    targetHeight: 560,
  },
]

await fs.mkdir(outputDir, { recursive: true })

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
    const rgb = [data[offset], data[offset + 1], data[offset + 2]]
    const max = Math.max(...rgb)
    const min = Math.min(...rgb)
    return max >= 210 && max - min <= 34 && colorDistance(rgb, bg) <= 68
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
  if (bounds.right < 0) throw new Error(`${item.output}: no visible pixels after background removal`)

  let croppedPipeline = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(bounds)

  if (item.flipHorizontal) croppedPipeline = croppedPipeline.flop()

  const cropped = await croppedPipeline
    .png()
    .toBuffer()

  const output = path.join(outputDir, item.output)
  const resized = await sharp(cropped)
    .resize(item.targetWidth, item.targetHeight, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: '#00000000' },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(output)

  return { ...item, source: output, bounds }
}

const results = []
for (const item of inputs) results.push(await processOne(item))

await fs.writeFile(
  path.join(outputDir, 'user-supplied-report.json'),
  `${JSON.stringify(results.map(({ order, label, output, source, bounds }) => ({
    order, label, output, source: path.relative(root, source).replaceAll('\\', '/'), bounds,
  })), null, 2)}\n`,
)

for (const result of results) console.log(result.source)
