import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'finishing')
const outputDir = path.join(root, 'output', 'finishing-reference')
const outputPath = path.join(outputDir, 'finishing-scale-qa.png')
const csvPath = path.join(outputDir, 'finishing-geometry.csv')

const poses = [
  ['01', 'Sarvangasana', 'sarvangasana'],
  ['02', 'Halasana', 'halasana'],
  ['03', 'Karna Pidasana', 'karnapidasana'],
  ['04', 'Urdhva Padmasana', 'urdhva-padmasana'],
  ['05', 'Pindasana', 'pindasana'],
  ['06', 'Matsyasana', 'matsyasana'],
  ['07', 'Uttana Padasana', 'uttana-padasana'],
  ['08', 'Sirsasana 1', 'sirsasana-01'],
  ['09', 'Sirsasana 2', 'sirsasana-02'],
  ['10', 'Baddha Padmasana', 'baddha-padmasana'],
  ['11', 'Padmasana', 'padmasana'],
  ['12', 'Utplutih', 'utpluthih'],
  ['13', 'Savasana', 'savasana'],
]

const background = '#F9F7F2'

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
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
  let visible = 0

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha < 8) continue
      visible += 1
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    visible,
  }
}

async function makeTile([order, name, base], bounds) {
  const tile = 360
  const imageSize = 300
  const image = await sharp(path.join(publicDir, `${base}.webp`))
    .resize(imageSize, imageSize, { fit: 'contain', background })
    .flatten({ background })
    .png()
    .toBuffer()

  const scale = imageSize / 1024
  const rect = {
    x: Math.round(bounds.left * scale),
    y: Math.round(bounds.top * scale),
    width: Math.round(bounds.width * scale),
    height: Math.round(bounds.height * scale),
  }

  const overlay = Buffer.from(`
    <svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${30 + rect.x}" y="${8 + rect.y}" width="${rect.width}" height="${rect.height}" fill="none" stroke="#E85B45" stroke-width="2"/>
      <text x="180" y="326" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="16" font-weight="700" fill="#2A4B3C">${escapeXml(`${order} ${name}`)}</text>
      <text x="180" y="348" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="13" fill="#6E706A">bbox ${bounds.width}×${bounds.height} / bottom ${bounds.bottom}</text>
    </svg>
  `)

  return sharp({
    create: { width: tile, height: tile, channels: 3, background },
  }).composite([
    { input: image, left: 30, top: 8 },
    { input: overlay, left: 0, top: 0 },
  ]).png().toBuffer()
}

await fs.mkdir(outputDir, { recursive: true })

const rows = []
const tiles = []
for (const pose of poses) {
  const [order, name, base] = pose
  const bounds = await alphaBounds(path.join(publicDir, `${base}.webp`))
  rows.push({ order, name, file: `${base}.webp`, ...bounds })
  tiles.push(await makeTile(pose, bounds))
}

const csv = [
  'order,name,file,left,top,right,bottom,width,height,center_x,center_y,visible',
  ...rows.map(row => [
    row.order,
    row.name,
    row.file,
    row.left,
    row.top,
    row.right,
    row.bottom,
    row.width,
    row.height,
    row.centerX.toFixed(1),
    row.centerY.toFixed(1),
    row.visible,
  ].join(',')),
].join('\n')

await fs.writeFile(csvPath, `${csv}\n`)

const tile = 360
const columns = 4
const rowsCount = Math.ceil(tiles.length / columns)
await sharp({
  create: {
    width: tile * columns,
    height: tile * rowsCount,
    channels: 3,
    background,
  },
}).composite(tiles.map((input, index) => ({
  input,
  left: (index % columns) * tile,
  top: Math.floor(index / columns) * tile,
}))).png().toFile(outputPath)

console.log(path.relative(root, outputPath))
console.log(path.relative(root, csvPath))
