import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 字体优化验证测试
 * 确保字体配置符合优化要求
 */

const ROOT = path.resolve(__dirname, '..')

describe('字体优化', () => {
  const layoutContent = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf-8')
  const pageContent = fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf-8')

  it('layout.tsx 不导入 JetBrains_Mono', () => {
    expect(layoutContent).not.toContain('JetBrains_Mono')
  })

  it('layout.tsx 不导入 Playfair_Display', () => {
    expect(layoutContent).not.toContain('Playfair_Display')
  })

  it('Noto_Serif_SC 只有 2 个字重（400, 700）', () => {
    const weightMatch = layoutContent.match(/weight:\s*\[([^\]]+)\]/)
    expect(weightMatch).not.toBeNull()
    const weights = weightMatch![1].replace(/['"]/g, '').split(',').map(w => w.trim())
    expect(weights).toEqual(['400', '700'])
  })

  it('Noto_Serif_SC 有 display: swap', () => {
    expect(layoutContent).toMatch(/display:\s*['"]swap['"]/)
  })

  it('app/page.tsx 导入了 Playfair_Display（落地页本地字体）', () => {
    expect(pageContent).toContain('Playfair_Display')
  })

  it('body className 不含 jetbrainsMono.variable', () => {
    expect(layoutContent).not.toContain('jetbrainsMono')
  })

  it('body className 不含 playfair.variable', () => {
    // layout 的 body 不应该有 playfair（已移到 page.tsx）
    const bodyMatch = layoutContent.match(/<body[^>]*className=\{`([^`]*)`/)
    if (bodyMatch) {
      expect(bodyMatch[1]).not.toContain('playfair')
    }
  })

  it('globals.css font-mono 使用系统等宽字体', () => {
    const cssContent = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf-8')
    expect(cssContent).not.toContain('jetbrains-mono')
    expect(cssContent).not.toContain('JetBrains Mono')
  })
})
