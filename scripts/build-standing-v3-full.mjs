import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const newDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'transparent')
const retainedDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'standing')
const alignedDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'aligned-full')
const sheetDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'contact-sheets')
const canvasSize = 1024
const baseline = 959

const poses = [
  { file: 'padangusthasana.png', source: 'retained', label: '01 · Padangusthasana', targetHeight: 700 },
  { file: 'padahastasana.png', source: '02-padahastasana.png', label: '02 · Padahastasana', targetHeight: 700 },
  { file: 'trikonasana-01.png', source: '03-trikonasana-01.png', label: '03 · Trikonasana A', maxWidth: 820, maxHeight: 850 },
  { file: 'trikonasana-02.png', source: '04-trikonasana-02.png', label: '04 · Trikonasana B', maxWidth: 820, maxHeight: 850 },
  { file: 'parsvakonasana-01.png', source: '05-parsvakonasana-01.png', label: '05 · Parsvakonasana A', targetWidth: 860 },
  { file: 'parsvakonasana-02.png', source: '06-parsvakonasana-02.png', label: '06 · Parsvakonasana B', targetWidth: 860 },
  { file: 'prasarita-padottanasana-a.png', source: '07-prasarita-padottanasana-a.png', label: '07 · Prasarita A', targetWidth: 820 },
  { file: 'prasarita-padottanasana-b.png', source: '08-prasarita-padottanasana-b.png', label: '08 · Prasarita B', targetWidth: 820 },
  { file: 'prasarita-padottanasana-c.png', source: 'retained', label: '09 · Prasarita C', targetHeight: 780 },
  { file: 'prasarita-padottanasana-d.png', source: 'retained', label: '10 · Prasarita D', targetHeight: 760 },
  { file: 'parsvottanasana.png', source: 'retained', label: '11 · Parsvottanasana', maxWidth: 780, maxHeight: 720 },
  { file: 'utthita-hasta-padangusthasana-01.png', source: '12-utthita-hasta-padangusthasana-01.png', label: '12 · Utthita Hasta 1', targetHeight: 860 },
  { file: 'utthita-hasta-padangusthasana-02.png', source: '13-utthita-hasta-padangusthasana-02.png', label: '13 · Utthita Hasta 2', targetHeight: 860 },
  { file: 'utthita-hasta-padangusthasana-03.png', source: 'retained', label: '14 · Utthita Hasta 3', targetHeight: 860 },
  { file: 'ardha-baddha-padmottanasana.png', source: 'placeholder', label: '15 · Ardha Baddha' },
  { file: 'utkatasana.png', source: 'retained', label: '16 · Utkatasana', targetHeight: 880 },
  { file: 'virabhadrasana-1.png', source: 'retained', label: '17 · Virabhadrasana 1', maxWidth: 900, maxHeight: 900 },
  { file: 'virabhadrasana-2.png', source: 'retained', label: '18 · Virabhadrasana 2', targetWidth: 900 },
]

const corrections = {
  'padahastasana.png': { flip: true },
  'trikonasana-01.png': { flip: true },
  'trikonasana-02.png': { flip: true },
  'parsvakonasana-01.png': { flip: true },
  'parsvakonasana-02.png': { source: '06-parsvakonasana-02-v2.png', flip: true },
  'prasarita-padottanasana-b.png': { source: '08-prasarita-padottanasana-b-final-v1.png' },
  'utthita-hasta-padangusthasana-01.png': { flip: true },
  'utthita-hasta-padangusthasana-02.png': { flip: true },
}

for (const pose of poses) Object.assign(pose, corrections[pose.file])

await Promise.all([fs.mkdir(alignedDir, { recursive: true }), fs.mkdir(sheetDir, { recursive: true })])

async function alphaBounds(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] < 8) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) throw new Error(`No visible subject in ${input}`)
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

for (const pose of poses) {
  if (pose.source === 'placeholder') {
    const placeholder = Buffer.from(`
      <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="352" y="439" width="320" height="518" rx="34" fill="none"
          stroke="#2A4B3C" stroke-opacity="0.22" stroke-width="6" stroke-dasharray="16 14"/>
        <path d="M464 699 H560 M512 651 V747" stroke="#2A4B3C" stroke-opacity="0.34"
          stroke-width="10" stroke-linecap="round"/>
        <text x="512" y="805" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="34" fill="#2A4B3C" fill-opacity="0.46">待补充</text>
      </svg>
    `)
    await sharp(placeholder).png().toFile(path.join(alignedDir, pose.file))
    console.log(`${pose.label}: placeholder, baseline=${baseline}`)
    continue
  }
  const input = pose.source === 'retained'
    ? path.join(retainedDir, pose.file)
    : path.join(newDir, pose.source)
  const bounds = await alphaBounds(input)
  let scale
  if (pose.targetHeight) scale = pose.targetHeight / bounds.height
  else if (pose.targetWidth) scale = pose.targetWidth / bounds.width
  else scale = Math.min(pose.maxWidth / bounds.width, pose.maxHeight / bounds.height)

  scale = Math.min(scale, 976 / bounds.width, 935 / bounds.height)
  const width = Math.round(bounds.width * scale)
  const height = Math.round(bounds.height * scale)
  const subjectPipeline = sharp(input)
    .extract(bounds)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  if (pose.flip) subjectPipeline.flop()
  const subject = await subjectPipeline
    .png()
    .toBuffer()
  const left = Math.round((canvasSize - width) / 2)
  const top = baseline - height + 1
  if (left < 24 || top < 24 || left + width > 1000) throw new Error(`${pose.file} violates safety margin`)

  await sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subject, left, top }])
    .png()
    .toFile(path.join(alignedDir, pose.file))
  console.log(`${pose.label}: ${width}x${height}, x=${left}, baseline=${baseline}`)
}

const tileSize = 360
const captionHeight = 44
const columns = 3
const rows = Math.ceil(poses.length / columns)

async function makeTile(pose, showBaseline) {
  const image = await sharp(path.join(alignedDir, pose.file)).resize(tileSize, tileSize).png().toBuffer()
  const overlays = [{ input: image, left: 0, top: 0 }]
  if (showBaseline) {
    const y = Math.round((baseline / canvasSize) * tileSize)
    overlays.push({ input: Buffer.from(`<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="${y}" x2="${tileSize}" y2="${y}" stroke="#D94B48" stroke-width="2"/></svg>`), left: 0, top: 0 })
  }
  overlays.push({ input: Buffer.from(`<svg width="${tileSize}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F9F7F2"/><text x="${tileSize / 2}" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#2A4B3C">${pose.label}</text></svg>`), left: 0, top: tileSize })
  return sharp({ create: { width: tileSize, height: tileSize + captionHeight, channels: 3, background: '#F9F7F2' } }).composite(overlays).png().toBuffer()
}

for (const showBaseline of [false, true]) {
  const tiles = await Promise.all(poses.map(pose => makeTile(pose, showBaseline)))
  const output = path.join(sheetDir, showBaseline ? 'standing-v3-full-baseline.png' : 'standing-v3-full.png')
  await sharp({ create: { width: tileSize * columns, height: (tileSize + captionHeight) * rows, channels: 3, background: '#F9F7F2' } })
    .composite(tiles.map((input, index) => ({ input, left: (index % columns) * tileSize, top: Math.floor(index / columns) * (tileSize + captionHeight) })))
    .png()
    .toFile(output)
  console.log(output)
}
