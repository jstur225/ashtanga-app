'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Image from 'next/image'

interface PWAInstallTutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PWAInstallTutorialModal({ isOpen, onClose }: PWAInstallTutorialModalProps) {
  // 通用安装教程图片
  const getImagePath = () => {
    return '/pwa-install.png'
  }

  const getTitle = () => {
    return '📱 安装到主屏幕教程'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(45,90,39,0.3)] w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-serif text-foreground">{getTitle()}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* 内容区 */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  按照下图步骤，将「熬汤日记」安装到主屏幕，体验像原生 App 一样的使用感受！
                </p>

                {/* 安装教程图片 */}
                <div className="rounded-xl overflow-hidden border border-border bg-secondary">
                  <Image
                    src={getImagePath()}
                    alt="PWA 安装教程"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                    priority
                  />
                </div>

                {/* 提示信息 */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs text-blue-700 font-serif leading-relaxed">
                    💡 <strong>提示</strong>：安装后可以从主屏幕直接打开，无需打开浏览器，体验更流畅！
                  </p>
                </div>

                {/* 关闭按钮 */}
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
