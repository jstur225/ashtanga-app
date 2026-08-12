import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'public', 'poses', 'primary-series-ip-v1')
const packageRoot = path.join(root, 'weapp', 'pose-package')
const imageRoot = path.join(packageRoot, 'images')
const dataTarget = path.join(packageRoot, 'services', 'pose-data.js')
const moduleCache = new Map()

function resolveLocalModule(fromFile, request) {
  const unresolved = path.resolve(path.dirname(fromFile), request)
  const candidates = [unresolved, `${unresolved}.ts`, `${unresolved}.tsx`, path.join(unresolved, 'index.ts')]
  const resolved = candidates.find(candidate => fs.existsSync(candidate))
  if (!resolved) throw new Error(`Cannot resolve ${request} from ${fromFile}`)
  return resolved
}

function loadTypeScriptModule(filename) {
  const absolute = path.resolve(filename)
  if (moduleCache.has(absolute)) return moduleCache.get(absolute).exports

  const source = fs.readFileSync(absolute, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absolute,
  }).outputText

  const module = { exports: {} }
  moduleCache.set(absolute, module)
  const localRequire = request => request.startsWith('.')
    ? loadTypeScriptModule(resolveLocalModule(absolute, request))
    : require(request)
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)
  execute(localRequire, module, module.exports, absolute, path.dirname(absolute))
  return module.exports
}

function portable(relativePath) {
  return relativePath.split(path.sep).join('/')
}

const { POSE_SECTIONS, POSES } = loadTypeScriptModule(path.join(root, 'lib', 'pose-data.ts'))
const outputPoses = POSES.map(pose => {
  const assetRelative = pose.image
    .replace(/^\/poses\/primary-series-ip-v1\//, '')
    .replace(/\.webp$/, '.png')
  const listName = ['standing', 'seated', 'finishing'].includes(pose.section)
    ? pose.cueName
    : pose.name

  return {
    id: pose.id,
    name: pose.name,
    sanskrit: pose.sanskrit,
    section: pose.section,
    order: pose.order,
    image: `../../images/${portable(assetRelative)}`,
    listName,
    cueName: pose.cueName,
    breath: pose.breath,
    drishti: pose.drishti,
    drishtiSanskrit: pose.drishtiSanskrit,
    action: pose.action,
    vinyasaCount: pose.vinyasaCount,
    vinyasaStep: pose.vinyasaStep,
    vinyasaSteps: pose.vinyasaSteps,
    holdBreaths: pose.holdBreaths,
  }
})

fs.mkdirSync(path.dirname(dataTarget), { recursive: true })
const banner = '// 由 scripts/sync-weapp-pose-library.mjs 从网页版真源生成，请勿手工改动。\n'
const payload = `${banner}const POSE_SECTIONS = ${JSON.stringify(POSE_SECTIONS, null, 2)};\n\nconst POSES = ${JSON.stringify(outputPoses, null, 2)};\n\nmodule.exports = { POSE_SECTIONS, POSES };\n`
fs.writeFileSync(dataTarget, payload, 'utf8')

const uniqueAssets = [...new Set(outputPoses.map(pose => pose.image.replace('../../images/', '')))]
for (const relativeTarget of uniqueAssets) {
  const source = path.join(sourceRoot, relativeTarget.replace(/\.png$/, '.webp'))
  const target = path.join(imageRoot, relativeTarget)
  if (!fs.existsSync(source)) throw new Error(`Missing pose source asset: ${source}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await sharp(source)
    .resize({ width: 720, height: 720, fit: 'contain', withoutEnlargement: true })
    // 网页版使用透明 WebP，让页面的米白→白渐变自然透出。小程序改用
    // 兼容性更稳的透明调色板 PNG，不能铺固定底色，否则列表下方会出现方框。
    .png({ palette: true, colors: 128, compressionLevel: 9, effort: 10, dither: 0 })
    .toFile(target)
}

if (!imageRoot.startsWith(`${packageRoot}${path.sep}`)) {
  throw new Error(`Refusing to clean assets outside pose package: ${imageRoot}`)
}
const expectedAssets = new Set(uniqueAssets.map(relativePath => path.resolve(imageRoot, relativePath)))
function removeStaleGeneratedAssets(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) removeStaleGeneratedAssets(absolute)
    else if (/\.(?:webp|png|jpe?g)$/i.test(entry.name) && !expectedAssets.has(path.resolve(absolute))) fs.unlinkSync(absolute)
  }
}
removeStaleGeneratedAssets(imageRoot)

const imageBytes = uniqueAssets.reduce((sum, relativePath) => {
  return sum + fs.statSync(path.join(imageRoot, relativePath)).size
}, 0)

console.log(`Synced ${outputPoses.length} poses in ${POSE_SECTIONS.length} sections.`)
console.log(`Generated ${uniqueAssets.length} WeChat-compatible transparent PNG images (${(imageBytes / 1024 / 1024).toFixed(3)} MiB).`)
