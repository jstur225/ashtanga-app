import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import ts from 'typescript'
import sharp from 'sharp'

const toolRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(toolRoot, '..')
const sourceRoot = path.join(toolRoot, 'src')
const distRoot = path.join(toolRoot, 'dist')
const publicRoot = path.join(projectRoot, 'public')
const poseModuleNames = [
  'pose-instructions',
  'seated-instructions',
  'finishing-instructions',
  'pose-data',
]

const sectionMap = {
  'surya-a': 'sun',
  'surya-b': 'sun',
  standing: 'standing',
  seated: 'seated',
  finishing: 'rest',
}

async function loadPoseData() {
  const cacheDirectory = path.join(toolRoot, '.cache', `pose-data-${Date.now()}`)
  await fs.mkdir(cacheDirectory, { recursive: true })

  try {
    for (const moduleName of poseModuleNames) {
      const sourcePath = path.join(projectRoot, 'lib', `${moduleName}.ts`)
      const source = await fs.readFile(sourcePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: sourcePath,
      }).outputText.replace(
        /(from\s+['"]\.\/[^'".]+)(['"])/g,
        '$1.mjs$2',
      )
      await fs.writeFile(path.join(cacheDirectory, `${moduleName}.mjs`), transpiled, 'utf8')
    }

    const entryPath = path.join(cacheDirectory, 'pose-data.mjs')
    const module = await import(`${pathToFileURL(entryPath).href}?t=${Date.now()}`)
    return module.POSES
  } finally {
    await fs.rm(cacheDirectory, { recursive: true, force: true })
  }
}

function publicAssetPath(publicUrl) {
  return path.join(publicRoot, publicUrl.replace(/^\//, '').replaceAll('/', path.sep))
}

function outputAssetPath(publicUrl) {
  const relative = publicUrl
    .replace(/^\/poses\/primary-series-ip-v1\//, '')
    .replace(/\.webp$/i, '.jpg')
  return path.join(distRoot, 'assets', 'poses', ...relative.split('/'))
}

function browserAssetPath(publicUrl) {
  return `assets/poses/${publicUrl
    .replace(/^\/poses\/primary-series-ip-v1\//, '')
    .replace(/\.webp$/i, '.jpg')}`
}

async function convertImage(sourceUrl, destination, quality) {
  const source = publicAssetPath(sourceUrl)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await sharp(source)
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#f9f8f6' })
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toFile(destination)
}

async function copySources() {
  for (const filename of ['index.html', 'fonts.css', 'styles.css', 'app.js']) {
    await fs.copyFile(path.join(sourceRoot, filename), path.join(distRoot, filename))
  }
  await fs.cp(path.join(sourceRoot, 'fonts'), path.join(distRoot, 'assets', 'fonts'), {
    recursive: true,
  })
}

async function build() {
  const poses = await loadPoseData()
  if (!Array.isArray(poses) || poses.length === 0) {
    throw new Error('没有从 lib/pose-data.ts 读取到体式数据')
  }

  await fs.rm(distRoot, { recursive: true, force: true })
  await fs.mkdir(path.join(distRoot, 'data'), { recursive: true })
  await fs.mkdir(path.join(distRoot, 'assets'), { recursive: true })
  await copySources()

  await sharp(path.join(publicRoot, 'icon.png'))
    .resize(96, 96, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(distRoot, 'assets', 'icon.png'))

  const exported = []
  for (const pose of poses) {
    const section = sectionMap[pose.section]
    if (!section) throw new Error(`无法映射体式栏目：${pose.section}`)

    const imageDestination = outputAssetPath(pose.image)
    await convertImage(pose.image, imageDestination, 75)
    const imagePath = browserAssetPath(pose.image)

    exported.push({
      id: pose.id,
      name: pose.name,
      sanskrit: pose.sanskrit,
      aliases: pose.aliases,
      sourceSection: pose.section,
      section,
      order: pose.order,
      image: imagePath,
      thumbnail: imagePath,
      cueName: pose.cueName ?? '',
      breath: pose.breath ?? '',
      drishti: pose.drishti ?? '',
      drishtiSanskrit: pose.drishtiSanskrit ?? '',
      action: pose.action ?? '',
      vinyasaCount: pose.vinyasaCount ?? null,
      vinyasaStep: pose.vinyasaStep ?? '',
      vinyasaSteps: pose.vinyasaSteps ?? [],
      holdBreaths: pose.holdBreaths ?? null,
      instructionStatus: pose.instructionStatus,
    })
  }

  const payload = {
    source: 'lib/pose-data.ts',
    total: exported.length,
    poses: exported,
  }
  const json = JSON.stringify(payload)
  await fs.writeFile(
    path.join(distRoot, 'data', 'poses.js'),
    `window.__ASHTANGA_POSE_DATA__=${json};\n`,
    'utf8',
  )

  const jpgFiles = await countFiles(path.join(distRoot, 'assets', 'poses'), '.jpg')
  const totalBytes = await directorySize(distRoot)
  console.log(`已导出 ${exported.length} 条体式、${jpgFiles} 张 JPG`)
  console.log(`构建目录：${distRoot}`)
  console.log(`构建体积：${(totalBytes / 1024 / 1024).toFixed(2)} MB`)
}

async function countFiles(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  let count = 0
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    count += entry.isDirectory()
      ? await countFiles(target, extension)
      : entry.name.toLowerCase().endsWith(extension)
        ? 1
        : 0
  }
  return count
}

async function directorySize(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  let size = 0
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    size += entry.isDirectory()
      ? await directorySize(target)
      : (await fs.stat(target)).size
  }
  return size
}

build().catch(error => {
  console.error(error)
  process.exitCode = 1
})
