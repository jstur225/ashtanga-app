import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'surya-b')
const suryaADir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-a')
const cutoutDir = path.join(root, 'output', 'primary-series-ip-v2', 'cutouts', 'surya-b')
const uniqueDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-b-unique')
const alignedDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-b')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'surya-b')

const groundLine = 960
const transparentThreshold = 8
const opaqueThreshold = 32
const padding = 24
const targetSkin = [229, 155, 106]

const uniqueSources = [
  { key: 'utkatasana', file: 'surya-b-02.png', flip: true },
  { key: 'virabhadrasana-first', file: 'surya-b-08.png', flip: true },
  { key: 'virabhadrasana-second', file: 'surya-b-12.png', flip: true },
]

const steps = [
  ['a', 'samasthitih'],
  ['b', 'utkatasana'],
  ['a', 'dve'],
  ['a', 'trini'],
  ['a', 'catvari'],
  ['a', 'panca'],
  ['a', 'sat'],
  ['b', 'virabhadrasana-second'],
  ['a', 'catvari'],
  ['a', 'panca'],
  ['a', 'sat'],
  ['b', 'virabhadrasana-first'],
  ['a', 'catvari'],
  ['a', 'panca'],
  ['a', 'sat'],
  ['a', 'trini'],
  ['a', 'dve'],
  ['b', 'utkatasana'],
  ['a', 'samasthitih'],
]

await Promise.all([
  fs.mkdir(cutoutDir, { recursive: true }),
  fs.mkdir(uniqueDir, { recursive: true }),
  fs.mkdir(alignedDir, { recursive: true }),
  fs.mkdir(publicDir, { recursive: true }),
])

function median(values) {
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function rgbToHsv(red, green, blue) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0

  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue /= 6
    if (hue < 0) hue += 1
  }

  return [hue, max === 0 ? 0 : delta / max, max]
}

async function removePaperBackground(sourcePath) {
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const border = 16
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
    const removePaper = (channel, keyChannel) => normalizedAlpha > 0 && normalizedAlpha < 1
      ? Math.round((channel - (1 - normalizedAlpha) * keyChannel) / normalizedAlpha)
      : channel
    rgba[targetOffset] = Math.max(0, Math.min(255, removePaper(red, key[0])))
    rgba[targetOffset + 1] = Math.max(0, Math.min(255, removePaper(green, key[1])))
    rgba[targetOffset + 2] = Math.max(0, Math.min(255, removePaper(blue, key[2])))
    rgba[targetOffset + 3] = alpha
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()
}

async function normalizeSkin(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const channelValues = [[], [], []]
  const skinMask = new Uint8Array(info.width * info.height)

  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * 4
    if (data[offset + 3] < 192) continue
    const [hue, saturation, value] = rgbToHsv(data[offset], data[offset + 1], data[offset + 2])
    if (hue < 0.035 || hue > 0.125 || saturation < 0.28 || saturation > 0.72 || value < 0.55) continue
    skinMask[index] = 1
    channelValues[0].push(data[offset])
    channelValues[1].push(data[offset + 1])
    channelValues[2].push(data[offset + 2])
  }

  if (channelValues[0].length === 0) throw new Error('No skin pixels detected')
  const sourceSkin = channelValues.map(median)
  const offsets = targetSkin.map((value, index) => value - sourceSkin[index])

  for (let index = 0; index < skinMask.length; index += 1) {
    if (!skinMask[index]) continue
    const offset = index * 4
    for (let channel = 0; channel < 3; channel += 1) {
      data[offset + channel] = Math.max(0, Math.min(255, data[offset + channel] + offsets[channel]))
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()
}

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
      if (data[(y * info.width + x) * 4 + 3] <= 48) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) throw new Error('No visible subject found')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function contractAlpha(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const contracted = Buffer.from(data)

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      let minimumAlpha = 255
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = x + offsetX
          const sampleY = y + offsetY
          if (sampleX < 0 || sampleX >= info.width || sampleY < 0 || sampleY >= info.height) {
            minimumAlpha = 0
            continue
          }
          minimumAlpha = Math.min(
            minimumAlpha,
            data[(sampleY * info.width + sampleX) * 4 + 3],
          )
        }
      }
      contracted[(y * info.width + x) * 4 + 3] = minimumAlpha
    }
  }

  return sharp(contracted, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()
}

const standingReference = await sharp(path.join(suryaADir, 'surya-a-samasthitih.png'))
  .ensureAlpha()
  .png()
  .toBuffer()
const { height: targetSubjectHeight } = await alphaBounds(standingReference)

for (const source of uniqueSources) {
  const transparent = await normalizeSkin(
    await removePaperBackground(path.join(sourceDir, source.file)),
  )
  const bounds = await alphaBounds(transparent)
  const extracted = await sharp(transparent).extract(bounds).png().toBuffer()
  const oriented = source.flip
    ? await sharp(extracted).flop().png().toBuffer()
    : extracted
  const subject = await contractAlpha(
    await sharp(oriented)
      .resize({
        width: Math.round(bounds.width * targetSubjectHeight / bounds.height),
        height: targetSubjectHeight,
        fit: 'fill',
      })
      .png()
      .toBuffer(),
  )
  const metadata = await sharp(subject).metadata()
  const left = Math.round((1024 - metadata.width) / 2)
  const top = groundLine - metadata.height
  if (left < 0 || top < 0) throw new Error(`${source.key} does not fit the aligned canvas`)

  await Promise.all([
    sharp(subject)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(cutoutDir, `${source.key}.png`)),
    sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: subject, left, top }])
      .png()
      .toFile(path.join(uniqueDir, `${source.key}.png`)),
  ])
}

await Promise.all(steps.map(async ([sourceSection, sourceName], index) => {
  const step = String(index + 1).padStart(2, '0')
  const sourcePath = sourceSection === 'a'
    ? path.join(suryaADir, `surya-a-${sourceName}.png`)
    : path.join(uniqueDir, `${sourceName}.png`)
  const alignedPath = path.join(alignedDir, `surya-b-${step}.png`)
  const publicBase = path.join(publicDir, `surya-b-${step}`)

  const aligned = await sharp(sourcePath).ensureAlpha().png().toBuffer()
  await Promise.all([
    sharp(aligned).png().toFile(alignedPath),
    sharp(aligned).webp({ quality: 82, effort: 6 }).toFile(`${publicBase}.webp`),
    sharp(aligned)
      .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(`${publicBase}-thumb.webp`),
  ])
}))

console.log('Built 19 Surya B transparent app assets from 6 Surya A poses and 3 extracted Surya B sources.')
