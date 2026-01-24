import { domToPng } from 'modern-screenshot'
import html2canvas from 'html2canvas'

// 类型定义
export interface ScreenshotResult {
  success: boolean
  dataUrl?: string
  method: 'modern-screenshot' | 'html2canvas' | 'failed'
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
    method: 'modern-screenshot' | 'html2canvas'
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

  // 检测微信浏览器
  const isWeChat = /MicroMessenger/i.test(userAgent)

  // 检测移动设备
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)

  // 检测浏览器名称和版本
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

  return {
    name,
    version,
    isWeChat,
    isMobile,
    userAgent
  }
}

// 使用 modern-screenshot 截图
async function captureWithModernScreenshot(
  element: HTMLElement
): Promise<{ success: boolean; dataUrl?: string; error?: string; duration: number }> {
  const startTime = Date.now()

  try {
    const dataUrl = await domToPng(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      fetch: {
        bypassingCache: true
      }
    })

    return {
      success: true,
      dataUrl,
      duration: Date.now() - startTime
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime
    }
  }
}

// 使用 html2canvas 截图
async function captureWithHtml2Canvas(
  element: HTMLElement
): Promise<{ success: boolean; dataUrl?: string; error?: string; duration: number }> {
  const startTime = Date.now()

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true
    })

    const dataUrl = canvas.toDataURL('image/png')

    return {
      success: true,
      dataUrl,
      duration: Date.now() - startTime
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime
    }
  }
}

// 主函数：带降级的截图功能
export async function captureWithFallback(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<ScreenshotResult> {
  const startTime = Date.now()
  const browserInfo = detectBrowserCapabilities()
  const attempts: ExportLogEntry['attempts'] = []

  // 第一层：尝试 modern-screenshot
  console.log('尝试方法1: modern-screenshot')
  const result1 = await captureWithModernScreenshot(element)

  attempts.push({
    method: 'modern-screenshot',
    success: result1.success,
    error: result1.error,
    duration: result1.duration
  })

  if (result1.success && result1.dataUrl) {
    // 下载图片
    downloadImage(result1.dataUrl, options?.filename || 'ashtanga-practice.png')

    // 记录日志
    const logEntry: ExportLogEntry = {
      timestamp: new Date().toISOString(),
      success: true,
      userAgent: browserInfo.userAgent,
      recordDate: options?.filename?.match(/ashtanga-(.+)\.png/)?.[1],
      duration: Date.now() - startTime,
      attempts,
      browserInfo
    }

    options?.onLog?.(logEntry)

    return {
      success: true,
      dataUrl: result1.dataUrl,
      method: 'modern-screenshot',
      duration: Date.now() - startTime
    }
  }

  // 第二层：尝试 html2canvas
  console.log('modern-screenshot 失败，尝试方法2: html2canvas')
  const result2 = await captureWithHtml2Canvas(element)

  attempts.push({
    method: 'html2canvas',
    success: result2.success,
    error: result2.error,
    duration: result2.duration
  })

  if (result2.success && result2.dataUrl) {
    // 下载图片
    downloadImage(result2.dataUrl, options?.filename || 'ashtanga-practice.png')

    // 记录日志
    const logEntry: ExportLogEntry = {
      timestamp: new Date().toISOString(),
      success: true,
      userAgent: browserInfo.userAgent,
      recordDate: options?.filename?.match(/ashtanga-(.+)\.png/)?.[1],
      duration: Date.now() - startTime,
      attempts,
      browserInfo
    }

    options?.onLog?.(logEntry)

    return {
      success: true,
      dataUrl: result2.dataUrl,
      method: 'html2canvas',
      duration: Date.now() - startTime
    }
  }

  // 第三层：两种方法都失败，记录详细日志
  const logEntry: ExportLogEntry = {
    timestamp: new Date().toISOString(),
    success: false,
    userAgent: browserInfo.userAgent,
    recordDate: options?.filename?.match(/ashtanga-(.+)\.png/)?.[1],
    duration: Date.now() - startTime,
    attempts,
    browserInfo
  }

  options?.onLog?.(logEntry)

  return {
    success: false,
    method: 'failed',
    error: result1.error || result2.error || '未知错误',
    duration: Date.now() - startTime
  }
}

// 下载图片辅助函数
function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

// 格式化错误信息给用户
export function formatErrorForUser(result: ScreenshotResult, userAgent: string): string {
  const browserInfo = detectBrowserCapabilities()

  if (browserInfo.isWeChat) {
    return '微信浏览器暂不支持直接导出图片\n建议使用系统截图功能分享'
  }

  if (browserInfo.name === 'Quark') {
    return '夸克浏览器暂不支持此功能\n建议使用系统截图或更换浏览器'
  }

  // 通用提示
  return '导出失败，请重试\n如持续失败，请使用系统截图功能'
}
