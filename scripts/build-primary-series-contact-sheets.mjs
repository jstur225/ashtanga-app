import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const masterRoot = path.join(root, 'output/primary-series-ip-v1/masters')
const indexPath = path.join(root, 'output/primary-series-assets/materials-index.csv')
const outputRoot = path.join(root, 'output/primary-series-ip-v1/contact-sheets')
const sections = ['surya-a', 'surya-b', 'standing', 'seated', 'finishing']
const expectedCounts = { 'surya-a': 11, 'surya-b': 19, standing: 18, seated: 35, finishing: 15 }

const escapeXml = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const csv = await fs.readFile(indexPath, 'utf8')
const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
  const [filename, displayName, section, order, marker = ''] = line.split(',')
  return { filename, displayName, section, order: Number(order), marker }
})

await fs.mkdir(outputRoot, { recursive: true })

const cellWidth = 220
const imageSize = 200
const labelHeight = 42
const cellHeight = imageSize + labelHeight
const columns = 5

for (const section of sections) {
  const sectionRows = rows.filter(row => row.section === section).sort((a, b) => a.order - b.order)
  if (sectionRows.length !== expectedCounts[section]) {
    throw new Error(`${section}: expected ${expectedCounts[section]} rows, found ${sectionRows.length}`)
  }

  const sheetRows = Math.ceil(sectionRows.length / columns)
  const sheet = sharp({
    create: {
      width: cellWidth * columns,
      height: cellHeight * sheetRows,
      channels: 3,
      background: '#F2EFE8',
    },
  })

  const composites = []
  for (let index = 0; index < sectionRows.length; index++) {
    const row = sectionRows[index]
    const sourcePath = path.join(masterRoot, row.filename)
    const metadata = await sharp(sourcePath).metadata()
    if (metadata.width !== 1024 || metadata.height !== 1024 || metadata.format !== 'png') {
      throw new Error(`${row.filename}: expected 1024×1024 PNG, got ${metadata.width}×${metadata.height} ${metadata.format}`)
    }

    const image = await sharp(sourcePath)
      .resize({ width: imageSize, height: imageSize, fit: 'contain', background: '#F9F7F2' })
      .png()
      .toBuffer()

    const basename = path.basename(row.filename, '.png')
    const label = Buffer.from(`
      <svg width="${imageSize}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#FFFFFF"/>
        <text x="100" y="17" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#2A4B3C">${escapeXml(basename)}</text>
        <text x="100" y="33" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#7A7A72">${index + 1} / ${sectionRows.length}</text>
      </svg>
    `)

    const left = (index % columns) * cellWidth + 10
    const top = Math.floor(index / columns) * cellHeight
    composites.push({ input: image, left, top })
    composites.push({ input: label, left, top: top + imageSize })
  }

  await sheet.composite(composites).png().toFile(path.join(outputRoot, `${section}.png`))
}

console.log(`Generated ${sections.length} contact sheets in ${outputRoot}`)
