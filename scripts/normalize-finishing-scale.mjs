import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const finalDir = path.join(root, 'output', 'primary-series-ip-v3', 'finishing', 'final')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'finishing')

const canvasSize = 1024
const edits = [
  { file: 'pindasana.png', targetHeight: 800 },
  { file: 'sirsasana-02.png', scale: 0.91 },
  { file: 'baddha-padmasana.png', targetHeight: 800 },
  { file: 'utpluthih.png', targetHeight: 800 },
]

async function alphaBounds(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha < 8) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < 0) throw new Error(`${input}: no visible pixels`)
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

async function normalizeOne(edit) {
  const source = path.join(finalDir, edit.file)
  const bounds = await alphaBounds(source)
  const sourceBuffer = await sharp(source)
    .extract(bounds)
    .png()
    .toBuffer()

  let scale = edit.scale ?? edit.targetHeight / bounds.height
  const width = Math.round(bounds.width * scale)
  const height = Math.round(bounds.height * scale)
  if (width > 976 || height > 976) {
    scale *= Math.min(976 / width, 976 / height)
  }

  const finalWidth = Math.round(bounds.width * scale)
  const finalHeight = Math.round(bounds.height * scale)
  const resized = await sharp(sourceBuffer)
    .resize(finalWidth, finalHeight, { fit: 'fill' })
    .png()
    .toBuffer()

  const left = Math.round((canvasSize - finalWidth) / 2)
  const top = Math.round((canvasSize - finalHeight) / 2)
  const canvas = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: resized, left, top }]).png().toBuffer()

  const baseName = edit.file.replace(/\.png$/i, '')
  await fs.writeFile(source, canvas)
  await sharp(canvas)
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}.webp`))
  await sharp(canvas)
    .resize(320, 320, { fit: 'fill' })
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(path.join(publicDir, `${baseName}-thumb.webp`))

  return {
    file: edit.file,
    before: { width: bounds.width, height: bounds.height },
    after: { width: finalWidth, height: finalHeight },
    left,
    top,
  }
}

await fs.mkdir(publicDir, { recursive: true })
const results = []
for (const edit of edits) results.push(await normalizeOne(edit))
await fs.writeFile(
  path.join(finalDir, 'scale-normalization-report.json'),
  `${JSON.stringify(results, null, 2)}\n`,
)
for (const result of results) {
  console.log(`${result.file}: ${result.before.width}x${result.before.height} -> ${result.after.width}x${result.after.height}`)
}
