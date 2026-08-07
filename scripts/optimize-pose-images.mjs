import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceRoot = path.resolve(process.cwd(), 'output/primary-series-ip-v1/masters')
const targetRoot = path.resolve(process.cwd(), 'public/poses/primary-series-ip-v1')

async function findPngFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findPngFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.png') ? [entryPath] : []
  }))
  return nested.flat()
}

const sourceFiles = await findPngFiles(sourceRoot)
if (sourceFiles.length !== 98) {
  throw new Error(`Expected 98 PNG masters, found ${sourceFiles.length}`)
}

let fullBytes = 0
let thumbnailBytes = 0

await Promise.all(sourceFiles.map(async sourcePath => {
  const relativePath = path.relative(sourceRoot, sourcePath)
  const relativeDirectory = path.dirname(relativePath)
  const basename = path.basename(relativePath, '.png')
  const destinationDirectory = path.join(targetRoot, relativeDirectory)
  const fullPath = path.join(destinationDirectory, `${basename}.webp`)
  const thumbnailPath = path.join(destinationDirectory, `${basename}-thumb.webp`)

  await fs.mkdir(destinationDirectory, { recursive: true })

  await sharp(sourcePath)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(fullPath)

  await sharp(sourcePath)
    .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(thumbnailPath)

  const [fullStat, thumbnailStat] = await Promise.all([
    fs.stat(fullPath),
    fs.stat(thumbnailPath),
  ])
  fullBytes += fullStat.size
  thumbnailBytes += thumbnailStat.size
}))

console.log(`Optimized ${sourceFiles.length} primary-series pose images.`)
console.log(`Detail WebP total: ${(fullBytes / 1024 / 1024).toFixed(2)} MB`)
console.log(`Thumbnail WebP total: ${(thumbnailBytes / 1024 / 1024).toFixed(2)} MB`)
