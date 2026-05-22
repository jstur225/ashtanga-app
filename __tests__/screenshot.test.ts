import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 截图功能测试
 * 验证 modern-screenshot 懒加载、成功/失败路径、错误提示
 */

// Mock modern-screenshot 动态导入
vi.mock('modern-screenshot', () => ({
  domToPng: vi.fn(),
}))

describe('截图功能', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('captureWithFallback 成功时返回 modern-screenshot 方法', async () => {
    const { domToPng } = await import('modern-screenshot')
    const mockDomToPng = vi.mocked(domToPng)
    mockDomToPng.mockResolvedValue('data:image/png;base64,test')

    // Mock createElement for download
    const mockClick = vi.fn()
    const mockAnchor = { click: mockClick, download: '', href: '' }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

    const { captureWithFallback } = await import('@/lib/screenshot')
    const result = await captureWithFallback(document.createElement('div'))

    expect(result.success).toBe(true)
    expect(result.method).toBe('modern-screenshot')
    expect(result.dataUrl).toBe('data:image/png;base64,test')
  })

  it('captureWithFallback 失败时返回 failed', async () => {
    const { domToPng } = await import('modern-screenshot')
    const mockDomToPng = vi.mocked(domToPng)
    mockDomToPng.mockRejectedValue(new Error('截图失败'))

    const { captureWithFallback } = await import('@/lib/screenshot')
    const result = await captureWithFallback(document.createElement('div'))

    expect(result.success).toBe(false)
    expect(result.method).toBe('failed')
    expect(result.error).toContain('截图失败')
  })

  it('screenshot.ts 源码不包含 html2canvas', async () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../lib/screenshot.ts'), 'utf-8')
    expect(source).not.toContain('html2canvas')
    expect(source).not.toContain('captureWithHtml2Canvas')
  })

  it('formatErrorForUser 对微信浏览器返回微信专用提示', async () => {
    const { formatErrorForUser } = await import('@/lib/screenshot')

    // Mock WeChat UA
    const originalUA = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 MicroMessenger/8.0.0',
      configurable: true,
    })

    const msg = formatErrorForUser({ success: false, method: 'failed', duration: 0 })
    expect(msg).toContain('微信')
    expect(msg).toContain('系统截图')

    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
  })

  it('formatErrorForUser 对夸克浏览器返回专用提示', async () => {
    const { formatErrorForUser } = await import('@/lib/screenshot')

    const originalUA = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Quark/6.0.0',
      configurable: true,
    })

    const msg = formatErrorForUser({ success: false, method: 'failed', duration: 0 })
    expect(msg).toContain('夸克')

    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
  })

  it('formatErrorForUser 对普通浏览器返回通用提示', async () => {
    const { formatErrorForUser } = await import('@/lib/screenshot')

    const msg = formatErrorForUser({ success: false, method: 'failed', duration: 0 })
    expect(msg).toContain('导出失败')
  })

  it('onLog 回调被调用', async () => {
    const { domToPng } = await import('modern-screenshot')
    vi.mocked(domToPng).mockResolvedValue('data:image/png;base64,test')

    const mockClick = vi.fn()
    const mockAnchor = { click: mockClick, download: '', href: '' }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

    const { captureWithFallback } = await import('@/lib/screenshot')
    const onLog = vi.fn()
    await captureWithFallback(document.createElement('div'), { onLog })

    expect(onLog).toHaveBeenCalledTimes(1)
    expect(onLog.mock.calls[0][0].success).toBe(true)
    expect(onLog.mock.calls[0][0].attempts[0].method).toBe('modern-screenshot')
  })
})
