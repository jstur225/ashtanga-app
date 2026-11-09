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

  it('通过 globals.css @font-face 自托管 Ashtanga Serif（Noto Serif SC 子集）', () => {
    expect(layoutContent).not.toContain('next/font/google')
    expect(cssContent).toContain("font-family: 'Ashtanga Serif'")
    expect(cssContent).toContain("url('/fonts/ashtanga-noto-serif-sc-ui-v2.woff')")
    expect(pageContent).not.toContain('next/font/google')
  })

  it('全局字体优先使用自托管宋体并保留系统回退', () => {
    expect(cssContent).toContain("--font-sans: 'Ashtanga Serif', 'Songti SC'")
    expect(cssContent).toContain("--font-serif: 'Ashtanga Serif', 'Songti SC'")
    expect(cssContent).toContain("--font-playfair: 'Ashtanga Serif', 'Songti SC'")
  })

  it('app/page.tsx 不导入 Playfair_Display', () => {
    expect(pageContent).not.toContain('Playfair_Display')
  })

  it('body className 不含 jetbrainsMono.variable', () => {
    expect(layoutContent).not.toContain('jetbrainsMono')
  })

  it('body className 统一走 font-serif（不再注入字体 variable）', () => {
    expect(layoutContent).toContain('font-serif antialiased')
    expect(layoutContent).not.toContain('inter.variable')
  })

  it('globals.css font-mono 也遵循全站宋体要求', () => {
    expect(cssContent).not.toContain('jetbrains-mono')
    expect(cssContent).not.toContain('JetBrains Mono')
    expect(cssContent).toContain("--font-mono: 'Ashtanga Serif', 'Songti SC'")
  })
})
