import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

describe('字体优化', () => {
  const layoutContent = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf-8')
  const pageContent = fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf-8')
  const cssContent = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf-8')

  it('layout.tsx 不导入 JetBrains_Mono', () => {
    expect(layoutContent).not.toContain('JetBrains_Mono')
  })

  it('layout.tsx 不导入 Playfair_Display', () => {
    expect(layoutContent).not.toContain('Playfair_Display')
  })

  it('使用 next/font/google 自托管 Noto Serif SC', () => {
    expect(layoutContent).toContain('next/font/google')
    expect(layoutContent).toContain('Noto_Serif_SC')
    expect(layoutContent).toContain("variable: '--font-noto-serif-sc'")
    expect(pageContent).not.toContain('next/font/google')
  })

  it('全局字体优先使用自托管宋体并保留系统回退', () => {
    expect(cssContent).toContain("--font-sans: var(--font-noto-serif-sc), 'Songti SC'")
    expect(cssContent).toContain("--font-serif: var(--font-noto-serif-sc), 'Songti SC'")
    expect(cssContent).toContain("--font-playfair: var(--font-noto-serif-sc), 'Songti SC'")
  })

  it('app/page.tsx 不导入 Playfair_Display', () => {
    expect(pageContent).not.toContain('Playfair_Display')
  })

  it('body className 不含 jetbrainsMono.variable', () => {
    expect(layoutContent).not.toContain('jetbrainsMono')
  })

  it('body className 注入 Noto Serif SC 字体变量', () => {
    expect(layoutContent).toContain('notoSerifSC.variable')
    expect(layoutContent).not.toContain('inter.variable')
  })

  it('globals.css font-mono 也遵循全站宋体要求', () => {
    expect(cssContent).not.toContain('jetbrains-mono')
    expect(cssContent).not.toContain('JetBrains Mono')
    expect(cssContent).toContain("--font-mono: var(--font-noto-serif-sc), 'Songti SC'")
  })
})
