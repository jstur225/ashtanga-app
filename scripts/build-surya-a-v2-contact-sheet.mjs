import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-a')
const outputDir = path.join(root, 'output', 'primary-series-ip-v2', 'contact-sheets')
const outputPath = path.join(outputDir, 'surya-a-v2.png')

const poses = [
  ['samasthitih', 'Samasthiti'],
  ['ekam', 'Ekam'],
  ['dve', 'Dve'],
  ['trini', 'Trini'],
  ['catvari', 'Catvari'],
  ['panca', 'Panca'],
  ['sat', 'Sat'],
  ['sapta', 'Sapta'],
  ['astau', 'Astau'],
]

fs.mkdirSync(outputDir, { recursive: true })

const tiles = await Promise.all(
  poses.map(async ([fileName, label], index) => {
    const image = await sharp(path.join(sourceDir, `surya-a-${fileName}.png`))
      .resize(500, 500)
      .png()
      .toBuffer()

    const caption = Buffer.from(`
      <svg width="500" height="42" xmlns="http://www.w3.org/2000/svg">
        <rect width="500" height="42" fill="#F9F7F2"/>
        <text x="250" y="29" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="22" fill="#2A4B3C">${index + 1}. ${label}</text>
      </svg>
    `)

    return sharp({
      create: { width: 500, height: 542, channels: 3, background: '#F9F7F2' },
    })
      .composite([
        { input: image, left: 0, top: 0 },
        { input: caption, left: 0, top: 500 },
      ])
      .png()
      .toBuffer()
  }),
)

await sharp({
  create: { width: 1500, height: 1626, channels: 3, background: '#F9F7F2' },
})
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % 3) * 500,
      top: Math.floor(index / 3) * 542,
    })),
  )
  .png()
  .toFile(outputPath)

console.log(outputPath)
