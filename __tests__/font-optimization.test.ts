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

  it('不再依赖 next/font/google', () => {
    expect(layoutContent).not.toContain('next/font/google')
    expect(pageContent).not.toContain('next/font/google')
  })

  it('全局字体使用本地/系统字体栈', () => {
    expect(cssContent).toContain('--font-sans: system-ui')
    expect(cssContent).toContain("--font-serif: 'Songti SC'")
    expect(cssContent).toContain('--font-playfair: Georgia')
  })

  it('app/page.tsx 不导入 Playfair_Display', () => {
    expect(pageContent).not.toContain('Playfair_Display')
  })

  it('body className 不含 jetbrainsMono.variable', () => {
    expect(layoutContent).not.toContain('jetbrainsMono')
  })

  it('body className 不含字体变量 class', () => {
    expect(layoutContent).toContain('className="font-serif antialiased"')
    expect(layoutContent).not.toContain('inter.variable')
    expect(layoutContent).not.toContain('notoSerifSC.variable')
  })

  it('globals.css font-mono 使用系统等宽字体', () => {
    expect(cssContent).not.toContain('jetbrains-mono')
    expect(cssContent).not.toContain('JetBrains Mono')
  })
})
