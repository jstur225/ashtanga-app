import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-b')
const outputDir = path.join(root, 'output', 'primary-series-ip-v2', 'contact-sheets')
const outputPath = path.join(outputDir, 'surya-b-v2.png')

const labels = [
  'Samasthitiḥ', 'Ekam', 'Dve', 'Trīṇi', 'Catvāri',
  'Pañca', 'Ṣaṭ', 'Sapta', 'Aṣṭau', 'Nava',
  'Daśa', 'Ekādaśa', 'Dvādaśa', 'Trayodaśa', 'Caturdaśa',
  'Pañcadaśa', 'Ṣoḍaśa', 'Saptadaśa', 'Samasthitiḥ',
]

const tileWidth = 300
const imageSize = 300
const captionHeight = 42
const columns = 5
const rows = Math.ceil(labels.length / columns)

await fs.mkdir(outputDir, { recursive: true })

const tiles = await Promise.all(labels.map(async (label, index) => {
  const step = String(index + 1).padStart(2, '0')
  const image = await sharp(path.join(sourceDir, `surya-b-${step}.png`))
    .resize(imageSize, imageSize)
    .png()
    .toBuffer()
  const caption = Buffer.from(`
    <svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F9F7F2"/>
      <text x="150" y="28" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="18" fill="#2A4B3C">${index + 1}. ${label}</text>
    </svg>
  `)

  return sharp({
    create: {
      width: tileWidth,
      height: imageSize + captionHeight,
      channels: 3,
      background: '#F9F7F2',
    },
  })
    .composite([
      { input: image, left: 0, top: 0 },
      { input: caption, left: 0, top: imageSize },
    ])
    .png()
    .toBuffer()
}))

await sharp({
  create: {
    width: tileWidth * columns,
    height: (imageSize + captionHeight) * rows,
    channels: 3,
    background: '#F9F7F2',
  },
})
  .composite(tiles.map((input, index) => ({
    input,
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * (imageSize + captionHeight),
  })))
  .png()
  .toFile(outputPath)

console.log(outputPath)
