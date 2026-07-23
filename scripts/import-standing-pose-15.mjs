import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(
  root,
  'assets',
  'pose-library',
  'standing',
  'ardha-baddha-padmottanasana-source.png',
)
const transparentDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'transparent')
const reviewDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'contact-sheets')
const output = path.join(transparentDir, '15-ardha-baddha-padmottanasana-final-v2.png')
const preview = path.join(reviewDir, 'standing-15-import-preview.png')

await Promise.all([
  fs.mkdir(transparentDir, { recursive: true }),
  fs.mkdir(reviewDir, { recursive: true }),
])

function median(values) {
  values.sort((left, right) => left - right)
  return values[Math.floor(values.length / 2)]
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

async function removePaperBackground(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const border = 20
  const samples = [[], [], []]

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x >= border && x < info.width - border && y >= border && y < info.height - border) continue
      const offset = (y * info.width + x) * 3
      samples[0].push(data[offset])
      samples[1].push(data[offset + 1])
      samples[2].push(data[offset + 2])
    }
  }

  const key = samples.map(median)
  const rgba = Buffer.alloc(info.width * info.height * 4)
  const transparentThreshold = 7
  const opaqueThreshold = 26

  for (let index = 0; index < info.width * info.height; index += 1) {
    const sourceOffset = index * 3
    const targetOffset = index * 4
    const red = data[sourceOffset]
    const green = data[sourceOffset + 1]
    const blue = data[sourceOffset + 2]
    const distance = Math.hypot(red - key[0], green - key[1], blue - key[2])
    const alpha = Math.round(
      smoothstep((distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)) * 255,
    )
    const normalizedAlpha = alpha / 255
    const unmatte = (channel, keyChannel) => normalizedAlpha > 0 && normalizedAlpha < 1
      ? Math.round((channel - (1 - normalizedAlpha) * keyChannel) / normalizedAlpha)
      : channel

    rgba[targetOffset] = Math.max(0, Math.min(255, unmatte(red, key[0])))
    rgba[targetOffset + 1] = Math.max(0, Math.min(255, unmatte(green, key[1])))
    rgba[targetOffset + 2] = Math.max(0, Math.min(255, unmatte(blue, key[2])))
    rgba[targetOffset + 3] = alpha
  }

  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}

const transparent = await removePaperBackground(source)
await sharp(transparent).png().toFile(output)

const tile = await sharp(transparent)
  .resize(900, 900, { fit: 'contain', background: '#F9F7F2' })
  .flatten({ background: '#F9F7F2' })
  .png()
  .toBuffer()
await sharp({ create: { width: 900, height: 900, channels: 3, background: '#F9F7F2' } })
  .composite([{ input: tile, left: 0, top: 0 }])
  .png()
  .toFile(preview)

console.log(output)
console.log(preview)
