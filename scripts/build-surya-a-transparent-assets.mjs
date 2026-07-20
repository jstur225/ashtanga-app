import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v2', 'masters', 'surya-a')
const cutoutDir = path.join(root, 'output', 'primary-series-ip-v2', 'cutouts', 'surya-a')
const alignedDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-a')
const downDogSource = path.join(cutoutDir, 'down-dog-source.png')
const foldSource = path.join(cutoutDir, 'fold-source.png')
const halfLiftSource = path.join(cutoutDir, 'half-lift-source.png')

const poses = [
  'samasthitih',
  'ekam',
  'dve',
  'trini',
  'catvari',
  'panca',
  'sat',
  'sapta',
  'astau',
]

const mirroredPoses = new Set(['samasthitih'])
const horizontalOffsets = new Map([['ekam', -40]])
const subjectScales = new Map([
  ['trini', 0.75],
  ['sapta', 0.75],
])
const groundLine = 960
const transparentThreshold = 10
const opaqueThreshold = 24
const padding = 24

await Promise.all([
  fs.mkdir(cutoutDir, { recursive: true }),
  fs.mkdir(alignedDir, { recursive: true }),
])

function median(values) {
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
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

    rgba[targetOffset] = red
    rgba[targetOffset + 1] = green
    rgba[targetOffset + 2] = blue
    rgba[targetOffset + 3] = alpha
  }

  return sharp(rgba, {
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

for (const pose of poses) {
  let transparent

  if (pose === 'dve' || pose === 'astau') {
    transparent = await sharp(foldSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  } else if (pose === 'trini' || pose === 'sapta') {
    transparent = await sharp(halfLiftSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  } else if (pose === 'sat') {
    transparent = await sharp(downDogSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  } else {
    transparent = await removePaperBackground(path.join(sourceDir, `surya-a-${pose}.png`))
  }

  if (mirroredPoses.has(pose)) {
    transparent = await sharp(transparent).flop().png().toBuffer()
  }

  const bounds = await alphaBounds(transparent)
  const extractedSubject = await sharp(transparent).extract(bounds).png().toBuffer()
  const scale = subjectScales.get(pose) ?? 1
  const subject = scale === 1
    ? extractedSubject
    : await sharp(extractedSubject)
      .resize({
        width: Math.round(bounds.width * scale),
        height: Math.round(bounds.height * scale),
        fit: 'fill',
      })
      .png()
      .toBuffer()
  const subjectMetadata = await sharp(subject).metadata()
  const subjectWidth = subjectMetadata.width
  const subjectHeight = subjectMetadata.height

  await sharp(subject)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(cutoutDir, `surya-a-${pose}.png`))

  const left = Math.round((1024 - subjectWidth) / 2) + (horizontalOffsets.get(pose) ?? 0)
  const top = groundLine - subjectHeight
  if (left < 0 || top < 0) throw new Error(`${pose} does not fit the aligned canvas`)

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: subject, left, top }])
    .png()
    .toFile(path.join(alignedDir, `surya-a-${pose}.png`))
}

console.log(`Built ${poses.length} transparent cutouts and aligned masters at ground line ${groundLine}.`)
