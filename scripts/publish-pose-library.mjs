import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  getMasterRelativePath,
  getMasterRoot,
  getPoseRecords,
  getPublishedRelativePath,
  repoRoot,
} from './pose-library-runtime.mjs'

const poses = getPoseRecords()
const masterRoot = getMasterRoot()
const publicParent = path.join(repoRoot, 'public', 'poses')
const targetRoot = path.join(publicParent, 'primary-series-ip-v1')
const stagingRoot = path.join(publicParent, `.primary-series-ip-v1-staging-${process.pid}`)
const uniqueMasters = new Set()

if (!targetRoot.startsWith(`${publicParent}${path.sep}`) || !stagingRoot.startsWith(`${publicParent}${path.sep}`)) {
  throw new Error('Refusing to publish outside public/poses.')
}
if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true })

try {
  for (const pose of poses) {
    const masterRelative = getMasterRelativePath(pose)
    const publishedRelative = getPublishedRelativePath(pose)
    const source = path.join(masterRoot, masterRelative)
    const detail = path.join(stagingRoot, publishedRelative)
    const thumb = detail.replace(/\.webp$/, '-thumb.webp')
    uniqueMasters.add(masterRelative.replaceAll('\\', '/'))

    if (!fs.existsSync(source)) throw new Error(`Missing master: ${source}`)
    fs.mkdirSync(path.dirname(detail), { recursive: true })
    await sharp(source).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(detail)
    await sharp(source)
      .resize({ width: 320, height: 320, fit: 'contain', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toFile(thumb)
  }

  if (uniqueMasters.size !== 92) throw new Error(`Expected 92 unique masters, received ${uniqueMasters.size}`)
  if (fs.existsSync(targetRoot)) fs.rmSync(targetRoot, { recursive: true, force: true })
  fs.renameSync(stagingRoot, targetRoot)
  console.log(`Published ${poses.length} cards from ${uniqueMasters.size} unique masters.`)
  console.log(`Output: ${targetRoot}`)
} catch (error) {
  if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true })
  throw error
}
