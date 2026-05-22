import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 依赖清理验证测试
 * 确保 recharts 和 html2canvas 已完全移除，无残留引用
 */

const ROOT = path.resolve(__dirname, '..')

// 需要扫描的目录（不含 node_modules）
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib'].map(d => path.join(ROOT, d))

function grepInDir(dir: string, pattern: RegExp): string[] {
  const matches: string[] = []
  if (!fs.existsSync(dir)) return matches

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      matches.push(...grepInDir(full, pattern))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          matches.push(`${path.relative(ROOT, full)}:${i + 1}: ${line.trim()}`)
        }
      })
    }
  }
  return matches
}

describe('依赖清理', () => {
  it('代码中无 recharts import', () => {
    const matches = SCAN_DIRS.flatMap(d => grepInDir(d, /from\s+['"]recharts/))
    expect(matches, `发现 recharts 引用:\n${matches.join('\n')}`).toHaveLength(0)
  })

  it('代码中无 html2canvas import', () => {
    const matches = SCAN_DIRS.flatMap(d => grepInDir(d, /from\s+['"]html2canvas/))
    expect(matches, `发现 html2canvas 引用:\n${matches.join('\n')}`).toHaveLength(0)
  })

  it('components/ui/chart.tsx 不存在', () => {
    const chartFile = path.join(ROOT, 'components', 'ui', 'chart.tsx')
    expect(fs.existsSync(chartFile)).toBe(false)
  })

  it('package.json 不含 recharts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps).not.toHaveProperty('recharts')
  })

  it('package.json 不含 html2canvas', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps).not.toHaveProperty('html2canvas')
  })
})
