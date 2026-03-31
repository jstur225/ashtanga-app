'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Image from 'next/image'

interface PWAInstallTutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PWAInstallTutorialModal({ isOpen, onClose }: PWAInstallTutorialModalProps) {
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
              className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(45,90,39,0.3)] w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 - 固定在顶部 */}
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-serif text-foreground">📱 安装到主屏幕教程</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* 图片区域 - 可滚动 */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="rounded-xl overflow-hidden border border-border bg-secondary">
                  <Image
                    src="/pwa-install.png"
                    alt="PWA 安装教程"
                    width={600}
                    height={2400}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
