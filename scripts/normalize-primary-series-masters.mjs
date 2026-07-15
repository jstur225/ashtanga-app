import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceRoot = path.resolve(process.cwd(), 'output/primary-series-ip-v1/masters')

async function findPngFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findPngFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.png') ? [entryPath] : []
  }))
  return nested.flat()
}

const files = await findPngFiles(sourceRoot)
if (files.length !== 98) throw new Error(`Expected 98 PNG masters, found ${files.length}`)

let normalized = 0
for (const file of files) {
  const metadata = await sharp(file).metadata()
  if (metadata.width === 1024 && metadata.height === 1024 && metadata.format === 'png') continue

  const temporary = `${file}.normalized.png`
  await sharp(file)
    .resize({ width: 1024, height: 1024, fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(temporary)
  await fs.rename(temporary, file)
  normalized++
}

console.log(`Validated ${files.length} PNG masters; normalized ${normalized} to 1024×1024.`)
