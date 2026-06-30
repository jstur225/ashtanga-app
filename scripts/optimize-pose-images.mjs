import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const posesDirectory = path.resolve(process.cwd(), 'public/poses')
const sourceFiles = (await fs.readdir(posesDirectory))
  .filter(file => file.endsWith('.png'))

await Promise.all(sourceFiles.map(async file => {
  const sourcePath = path.join(posesDirectory, file)
  const basename = path.basename(file, '.png')

  await sharp(sourcePath)
    .resize({ width: 160, height: 200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(path.join(posesDirectory, `${basename}-thumb.webp`))

  await sharp(sourcePath)
    .resize({ width: 900, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(posesDirectory, `${basename}.webp`))
}))

console.log(`Optimized ${sourceFiles.length} pose images.`)

