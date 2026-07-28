import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const cropDir = path.join(root, 'output', 'finishing-reference', 'crops')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'finishing')
const outputDir = path.join(root, 'output', 'finishing-reference')
const outputPath = path.join(outputDir, 'finishing-regen-contact-sheet.png')

// Current app / handbook order only.
// Finishing-EN.pdf includes extra visual nodes, but Legs lift/lower, Balasana,
// and Yoga Mudra are not part of the current handbook 54-66 app sequence.
const entries = [
  ['01', 'Salamba Sarvangasana', 'sarvangasana.webp', '01-salamba-sarvangasana.png', '用户已确认'],
  ['02', 'Halasana', 'halasana.webp', '02-halasana.png', '用户已确认'],
  ['03', 'Karna Pidasana', 'karnapidasana.webp', '03-karna-pidasana.png', '用户已确认'],
  ['04', 'Urdhva Padmasana', 'urdhva-padmasana.webp', '04-urdhva-padmasana.png', '用户已确认'],
  ['05', 'Pindasana', 'pindasana.webp', '05-pindasana.png', '用户已确认'],
  ['06', 'Matsyasana', 'matsyasana.webp', '06-matsyasana.png', '用户已确认'],
  ['07', 'Uttana Padasana', 'uttana-padasana.webp', '07-uttana-padasana.png', '用户已确认'],
  ['08', 'Sirsasana', 'sirsasana-01.webp', '08-sirsasana.png', '用户已确认'],
  ['09', 'Urdhva Dandasana', 'sirsasana-02.webp', '09-urdhva-dandasana.png', '用户已确认'],
  ['10', 'Baddha Padmasana', 'baddha-padmasana.webp', '12-baddha-padmasana.png', '用户已确认'],
  ['11', 'Padmasana', 'padmasana.webp', '14-padmasana.png', '用户已确认'],
  ['12', 'Utplutih', 'utpluthih.webp', '15-utplutih.png', '用户已确认'],
  ['13', 'Savasana', 'savasana.webp', '16-savasana.png', '用户已确认'],
]

const background = '#F9F7F2'
const statusColor = status => {
  if (status.includes('用户已确认')) return '#2A6B50'
  if (status.includes('待重生')) return '#A24E32'
  return '#6E706A'
}

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

async function renderReference(file) {
  return sharp(path.join(cropDir, file))
    .resize(260, 220, { fit: 'contain', background })
    .flatten({ background })
    .greyscale()
    .png()
    .toBuffer()
}

async function renderCurrent(file) {
  return sharp(path.join(publicDir, file))
    .resize(260, 220, { fit: 'contain', background })
    .flatten({ background })
    .png()
    .toBuffer()
}

async function makeTile([order, name, currentFile, referenceFile, status]) {
  const [reference, current] = await Promise.all([
    renderReference(referenceFile),
    renderCurrent(currentFile),
  ])
  const caption = Buffer.from(`
    <svg width="520" height="92" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <text x="260" y="25" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="16" font-weight="700" fill="#2A4B3C">${escapeXml(`${order} ${name}`)}</text>
      <text x="130" y="56" text-anchor="middle" font-family="Microsoft YaHei, Arial, sans-serif" font-size="12" fill="#77736A">动作参考</text>
      <text x="390" y="56" text-anchor="middle" font-family="Microsoft YaHei, Arial, sans-serif" font-size="12" font-weight="700" fill="${statusColor(status)}">${escapeXml(status)}</text>
      <text x="390" y="76" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="10" fill="#8A8A82">${escapeXml(currentFile)}</text>
    </svg>
  `)

  return sharp({
    create: { width: 520, height: 312, channels: 3, background },
  }).composite([
    { input: reference, left: 0, top: 0 },
    { input: current, left: 260, top: 0 },
    { input: caption, left: 0, top: 220 },
  ]).png().toBuffer()
}

await fs.mkdir(outputDir, { recursive: true })
const tiles = await Promise.all(entries.map(makeTile))
const columns = 4
const rows = Math.ceil(tiles.length / columns)

await sharp({
  create: {
    width: 520 * columns,
    height: 312 * rows,
    channels: 3,
    background,
  },
}).composite(tiles.map((input, index) => ({
  input,
  left: (index % columns) * 520,
  top: Math.floor(index / columns) * 312,
}))).png().toFile(outputPath)

console.log(outputPath)
