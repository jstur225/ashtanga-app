import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const moduleCache = new Map()

function resolveLocalModule(fromFile, request) {
  const unresolved = path.resolve(path.dirname(fromFile), request)
  const candidates = [unresolved, `${unresolved}.ts`, `${unresolved}.tsx`, path.join(unresolved, 'index.ts')]
  const resolved = candidates.find(candidate => fs.existsSync(candidate))
  if (!resolved) throw new Error(`Cannot resolve ${request} from ${fromFile}`)
  return resolved
}

export function loadTypeScriptModule(filename) {
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

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const suryaAMasters = [
  'surya-a-samasthitih.png',
  'surya-a-ekam.png',
  'surya-a-dve.png',
  'surya-a-trini.png',
  'surya-a-catvari.png',
  'surya-a-panca.png',
  'surya-a-sat.png',
  'surya-a-sapta.png',
  'surya-a-astau.png',
  'surya-a-ekam.png',
  'surya-a-samasthitih.png',
]

export function getPoseRecords() {
  const { POSES } = loadTypeScriptModule(path.join(repoRoot, 'lib', 'pose-data.ts'))
  if (!Array.isArray(POSES) || POSES.length !== 94) {
    throw new Error(`Expected 94 pose records, received ${POSES?.length ?? 'invalid data'}`)
  }
  return POSES
}

export function getPublishedRelativePath(pose) {
  const prefix = '/poses/primary-series-ip-v1/'
  if (!pose.image.startsWith(prefix) || !pose.image.endsWith('.webp')) {
    throw new Error(`Unexpected published pose path: ${pose.image}`)
  }
  return pose.image.slice(prefix.length)
}

export function getMasterRelativePath(pose) {
  const published = getPublishedRelativePath(pose)
  if (pose.section === 'surya-a') {
    const filename = suryaAMasters[pose.order - 1]
    if (!filename) throw new Error(`No Surya A master mapping for order ${pose.order}`)
    return path.join('surya-a', filename)
  }
  return published.replace(/\.webp$/, '.png')
}

export function getMasterRoot(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--master-root')
  const argument = index >= 0 ? argv[index + 1] : undefined
  const value = argument || process.env.POSE_LIBRARY_MASTER_ROOT
  if (!value) {
    throw new Error('Set POSE_LIBRARY_MASTER_ROOT or pass --master-root <正式母版目录>.')
  }
  return path.resolve(value)
}
