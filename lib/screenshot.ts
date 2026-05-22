// 截图功能：仅使用 modern-screenshot，懒加载

// 类型定义
export interface ScreenshotResult {
  success: boolean
  dataUrl?: string
  method: 'modern-screenshot' | 'failed'
  error?: string
  duration: number
}

export interface CaptureOptions {
  scale?: number
  backgroundColor?: string
  filename?: string
  onLog?: (log: ExportLogEntry) => void
}

export interface ExportLogEntry {
  timestamp: string
  success: boolean
  userAgent: string
  recordDate?: string
  duration: number
  attempts: {
    method: 'modern-screenshot'
    success: boolean
    error?: string
    duration: number
  }[]
  browserInfo: {
    name: string
    version?: string
    isWeChat: boolean
    isMobile: boolean
  }
}

// 浏览器检测
function detectBrowserCapabilities() {
  const userAgent = navigator.userAgent

  const isWeChat = /MicroMessenger/i.test(userAgent)
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)

  let name = 'Unknown'
  let version: string | undefined

  if (/Chrome/.test(userAgent) && !/Edge|OPR/.test(userAgent)) {
    name = 'Chrome'
    const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    name = 'Safari'
    const match = userAgent.match(/Version\/(\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/Firefox/.test(userAgent)) {
    name = 'Firefox'
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/MicroMessenger/.test(userAgent)) {
    name = 'WeChat'
    const match = userAgent.match(/MicroMessenger\/(\d+\.\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/QQBrowser/.test(userAgent)) {
    name = 'QQBrowser'
    const match = userAgent.match(/QQBrowser\/(\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/UCBrowser/.test(userAgent)) {
    name = 'UCBrowser'
    const match = userAgent.match(/UCBrowser\/(\d+\.\d+\.\d+)/)
    version = match ? match[1] : undefined
  } else if (/Quark/.test(userAgent)) {
    name = 'Quark'
  }

  return { name, version, isWeChat, isMobile, userAgent }
}

// 动态加载 modern-screenshot 并截图
async function captureWithModernScreenshot(
  element: HTMLElement,
  scale: number = 2
): Promise<{ success: boolean; dataUrl?: string; error?: string; duration: number }> {
  const startTime = Date.now()

  try {
    const { domToPng } = await import('modern-screenshot')
    const dataUrl = await domToPng(element, {
      scale,
      backgroundColor: '#ffffff',
      fetch: { bypassingCache: true }
    })

    return { success: true, dataUrl, duration: Date.now() - startTime }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage, duration: Date.now() - startTime }
  }
}

// 主函数：截图 + 下载
export async function captureWithFallback(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<ScreenshotResult> {
  const startTime = Date.now()
  const browserInfo = detectBrowserCapabilities()

  console.log('截图中: modern-screenshot')
  const result = await captureWithModernScreenshot(element, options?.scale || 2)

  const logEntry: ExportLogEntry = {
    timestamp: new Date().toISOString(),
    success: result.success,
    userAgent: browserInfo.userAgent,
    recordDate: options?.filename?.match(/ashtanga-(.+)\.png/)?.[1],
    duration: Date.now() - startTime,
    attempts: [{
      method: 'modern-screenshot',
      success: result.success,
      error: result.error,
      duration: result.duration
    }],
    browserInfo
  }

  options?.onLog?.(logEntry)

  if (result.success && result.dataUrl) {
    downloadImage(result.dataUrl, options?.filename || 'ashtanga-practice.png')
    return { success: true, dataUrl: result.dataUrl, method: 'modern-screenshot', duration: Date.now() - startTime }
  }

  return {
    success: false,
    method: 'failed',
    error: result.error || '未知错误',
    duration: Date.now() - startTime
  }
}

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

// 格式化错误信息给用户
export function formatErrorForUser(_result: ScreenshotResult): string {
  const browserInfo = detectBrowserCapabilities()

  if (browserInfo.isWeChat) {
    return '微信浏览器暂不支持直接导出图片\n建议使用系统截图功能分享'
  }

  if (browserInfo.name === 'Quark') {
    return '夸克浏览器暂不支持此功能\n建议使用系统截图或更换浏览器'
  }

  return '导出失败，请重试\n如持续失败，请使用系统截图功能'
}
