import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const dir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'aligned-full')
const files = (await fs.readdir(dir)).filter(file => file.endsWith('.png')).sort()
if (files.length !== 18) throw new Error(`Expected 18 PNG files, found ${files.length}`)
const placeholders = new Set(['ardha-baddha-padmottanasana.png'])

const hashes = new Set()
for (const file of files) {
  const encoded = await fs.readFile(path.join(dir, file))
  const hash = crypto.createHash('sha256').update(encoded).digest('hex')
  if (hashes.has(hash)) throw new Error(`Duplicate image: ${file}`)
  hashes.add(hash)
  const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.width !== 1024 || info.height !== 1024 || info.channels !== 4) throw new Error(`${file}: invalid dimensions/channels`)
  const alpha = (x, y) => data[(y * info.width + x) * 4 + 3]
  for (const [x, y] of [[0, 0], [1023, 0], [0, 1023], [1023, 1023]]) {
    if (alpha(x, y) !== 0) throw new Error(`${file}: opaque corner ${x},${y}`)
  }
  let bottom = -1
  let visible = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (alpha(x, y) < 8) continue
      bottom = Math.max(bottom, y)
      visible += 1
    }
  }
  if (bottom !== 959) throw new Error(`${file}: baseline ${bottom}, expected 959`)
  const minimumVisiblePixels = placeholders.has(file) ? 2_000 : 10_000
  if (visible < minimumVisiblePixels) throw new Error(`${file}: implausibly small subject`)
  console.log(`${file}: baseline=${bottom}, sha256=${hash.slice(0, 12)}`)
}
console.log('Validated 18 unique 1024x1024 RGBA standing images.')
