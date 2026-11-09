import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  getMasterRelativePath,
  getPoseRecords,
  getPublishedRelativePath,
  repoRoot,
} from './pose-library-runtime.mjs'

const poses = getPoseRecords()
const publicRoot = path.join(repoRoot, 'public', 'poses', 'primary-series-ip-v1')
const expected = new Set()

for (const pose of poses) {
  const detail = getPublishedRelativePath(pose).replaceAll('\\', '/')
  expected.add(detail)
  expected.add(detail.replace(/\.webp$/, '-thumb.webp'))
}

const actual = []
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) collect(absolute)
    else actual.push(path.relative(publicRoot, absolute).replaceAll('\\', '/'))
  }
}
collect(publicRoot)

const missing = [...expected].filter(file => !actual.includes(file))
const extra = actual.filter(file => !expected.has(file))
if (missing.length || extra.length) {
  throw new Error(`Published asset mismatch. Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}`)
}

for (const relative of actual) {
  const metadata = await sharp(path.join(publicRoot, relative)).metadata()
  const isThumb = relative.endsWith('-thumb.webp')
  if (metadata.format !== 'webp') throw new Error(`Not WebP: ${relative}`)
  if (isThumb && (metadata.width > 320 || metadata.height > 320)) throw new Error(`Oversized thumbnail: ${relative}`)
  if (!isThumb && (metadata.width > 1024 || metadata.height > 1024)) throw new Error(`Oversized detail image: ${relative}`)
  if (!metadata.hasAlpha) throw new Error(`Missing alpha channel: ${relative}`)
}

const masterRootArg = process.argv.indexOf('--master-root')
const masterRoot = masterRootArg >= 0
  ? process.argv[masterRootArg + 1]
  : process.env.POSE_LIBRARY_MASTER_ROOT
if (masterRoot) {
  const uniqueMasters = new Set(poses.map(getMasterRelativePath))
  const absentMasters = [...uniqueMasters].filter(relative => !fs.existsSync(path.resolve(masterRoot, relative)))
  if (uniqueMasters.size !== 92 || absentMasters.length) {
    throw new Error(`Master mismatch. Unique: ${uniqueMasters.size}; missing: ${absentMasters.join(', ') || 'none'}`)
  }
  console.log(`Validated ${uniqueMasters.size} unique PNG masters.`)
}

console.log(`Validated ${poses.length} cards and ${actual.length} published WebP files.`)
