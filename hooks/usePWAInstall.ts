import { useEffect, useState } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      // 阻止默认的安装提示
      e.preventDefault()
      // 保存事件供后续使用
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // 监听beforeinstallprompt事件
    window.addEventListener('beforeinstallprompt', handler)

    // 检查是否已经安装（仅在某些浏览器中有效）
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) {
      // 如果没有deferredPrompt，可能是iOS，给出提示
      return false
    }

    // 显示安装提示
    deferredPrompt.prompt()

    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice

    // 清理deferredPrompt
    setDeferredPrompt(null)
    setIsInstallable(false)

    return outcome === 'accepted'
  }

  return {
    isInstallable,
    promptInstall
  }
}
