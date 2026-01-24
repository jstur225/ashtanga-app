'use client'

import { useState, useEffect } from 'react'
import { X, Chrome } from 'lucide-react'

export function PWAInstallBanner() {
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

    // 检测用户系统
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    // 只在移动设备显示
    if (isIOS || isAndroid) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    // 记住用户关闭了，7天内不再显示
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
  }

  if (!isVisible || isDismissed) {
    return null
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="mx-4 mt-2 mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-green-600 hover:text-green-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Chrome className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-900 mb-1">
            {isIOS ? '添加到主屏幕' : '安装应用'}
          </h3>
          <p className="text-xs text-green-700 mb-2">
            {isIOS
              ? '点击底部分享按钮⎋↑ → 选择"添加到主屏幕"'
              : '点击右上角⋮菜单 → 选择"添加到主屏幕"或"安装应用"'}
          </p>
          <p className="text-[10px] text-green-600">
            💡 安装后可以像App一样使用，支持离线记录
          </p>
        </div>
      </div>
    </div>
  )
}
