import { useEffect, useState } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(true) // 默认显示

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

    // 始终显示安装图标（即使已安装）
    // 已安装的用户可以推荐给朋友
    setIsInstallable(true)

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
