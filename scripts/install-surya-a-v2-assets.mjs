import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v2', 'aligned', 'surya-a')
const targetDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'surya-a')

const stepToMaster = [
  'samasthitih',
  'ekam',
  'dve',
  'trini',
  'catvari',
  'panca',
  'sat',
  'sapta',
  'astau',
  'ekam',
  'samasthitih',
]

await fs.mkdir(targetDir, { recursive: true })

await Promise.all(
  stepToMaster.map(async (masterName, index) => {
    const step = String(index + 1).padStart(2, '0')
    const sourcePath = path.join(sourceDir, `surya-a-${masterName}.png`)
    const publicBase = path.join(targetDir, `surya-a-${step}`)

    await Promise.all([
      sharp(sourcePath)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(`${publicBase}.webp`),
      sharp(sourcePath)
        .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72, effort: 6 })
        .toFile(`${publicBase}-thumb.webp`),
    ])
  }),
)

console.log(`Installed ${stepToMaster.length} Surya A v2 app steps from 9 unique masters.`)
