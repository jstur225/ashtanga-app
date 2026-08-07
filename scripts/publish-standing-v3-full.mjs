import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'aligned-full')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'standing')

await fs.mkdir(publicDir, { recursive: true })

const files = (await fs.readdir(sourceDir))
  .filter(file => file.endsWith('.png'))
  .sort((left, right) => left.localeCompare(right))

for (const file of files) {
  const input = path.join(sourceDir, file)
  const basename = path.basename(file, '.png')
  await Promise.all([
    sharp(input)
      .webp({ quality: 82, effort: 6, alphaQuality: 100 })
      .toFile(path.join(publicDir, `${basename}.webp`)),
    sharp(input)
      .resize(320, 320, { fit: 'fill' })
      .webp({ quality: 72, effort: 6, alphaQuality: 100 })
      .toFile(path.join(publicDir, `${basename}-thumb.webp`)),
  ])
  console.log(`Published ${basename}`)
}

console.log(`Published ${files.length} standing poses.`)
