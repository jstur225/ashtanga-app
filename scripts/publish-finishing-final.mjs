import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'finishing')
const finalDir = path.join(root, 'output', 'primary-series-ip-v3', 'finishing', 'final')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'finishing')

const poses = [
  ['sarvangasana.png', 'sarvangasana.png'],
  ['halasana.png', 'halasana.png'],
  ['karnapidasana.png', 'karnapidasana.png'],
  ['urdhva-padmasana.png', 'urdhva-padmasana.png'],
  ['pindasana.png', 'pindasana.png'],
  ['matsyasana.png', 'matsyasana.png'],
  ['uttana-padasana.png', 'uttana-padasana.png'],
  ['sirsasana-01.png', 'sirsasana.png'],
  ['sirsasana-02.png', 'sirsasana.png'],
  ['baddha-padmasana.png', 'baddha-padmasana.png'],
  ['padmasana.png', 'padmasana.png'],
  ['utpluthih.png', 'utpluthih.png'],
  ['savasana.png', 'savasana.png'],
]

if (poses.length !== 13) throw new Error(`Expected 13 finishing poses, got ${poses.length}`)

function colorDistance(a, b) {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function removeConnectedLightBackground(data, width, height) {
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

async function transparentPngBuffer(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  removeConnectedLightBackground(data, info.width, info.height)

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

await fs.mkdir(finalDir, { recursive: true })
await fs.mkdir(publicDir, { recursive: true })

for (const [file, inputFile] of poses) {
  const source = path.join(sourceDir, inputFile)
  await fs.access(source)

  const pngBuffer = await transparentPngBuffer(source)
  const finalPath = path.join(finalDir, file)
  const baseName = file.replace(/\.png$/i, '')

  await fs.writeFile(finalPath, pngBuffer)
  await sharp(pngBuffer)
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}.webp`))
  await sharp(pngBuffer)
    .resize(320, 320, { fit: 'fill' })
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}-thumb.webp`))
}

await fs.writeFile(
  path.join(finalDir, 'manifest.json'),
  `${JSON.stringify(poses.map(([file, inputFile], index) => ({
    order: index + 1,
    file,
    source: path.join('output/primary-series-ip-v1/masters/finishing', inputFile).replaceAll('\\', '/'),
  })), null, 2)}\n`,
)

console.log(`Published ${poses.length} finishing poses`)
