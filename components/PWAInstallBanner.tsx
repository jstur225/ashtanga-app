'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface PWAInstallBannerProps {
  onShowTutorial?: () => void
}

export function PWAInstallBanner({ onShowTutorial }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 检查是否已安装
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) {
      return // 已安装，不显示
    }

    // 检查是否被用户关闭过
    const dismissed = localStorage.getItem('pwa_banner_dismissed')
    if (dismissed) {
      return
    }

    // 检测浏览器和系统
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)

    // 只在支持的浏览器显示：Chrome、Safari、Edge、Samsung Internet
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor)
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor)
    const isEdge = /Edg/.test(userAgent)
    const isSamsung = /SamsungBrowser/.test(userAgent)

    const isSupportedBrowser = isChrome || isSafari || isEdge || isSamsung

    // 只在移动设备 + 支持的浏览器显示
    if ((isIOS || isAndroid) && isSupportedBrowser) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    // 记住用户关闭了，7天内不再显示
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
  }

  const handleClick = () => {
    // 触发父组件显示图片弹窗
    onShowTutorial?.()
    handleDismiss()
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div
      onClick={handleClick}
      className="mx-4 mt-2 mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98] relative"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        className="absolute top-2 right-2 p-1 text-green-600 hover:text-green-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">📱</span>
        <h3 className="text-sm font-semibold text-green-900">
          查看安装教程 📸
        </h3>
        <span className="text-green-600 animate-pulse">→</span>
      </div>
    </div>
  )
}
