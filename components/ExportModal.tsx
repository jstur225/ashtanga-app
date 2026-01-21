'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  data: string
}

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      // 方法1: 尝试使用现代clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data)
        setCopied(true)
        toast.success('✅ 数据胶囊已复制到剪贴板', {
          duration: 3000,
          position: 'top-center'
        })
        return
      }
    } catch (err) {
      console.warn('clipboard API 失败，尝试降级方案:', err)
    }

    // 方法2: 降级方案 - 使用传统的execCommand
    try {
      const textArea = document.createElement('textarea')
      textArea.value = data
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (successful) {
        setCopied(true)
        toast.success('✅ 数据胶囊已复制到剪贴板', {
          duration: 3000,
          position: 'top-center'
        })
      } else {
        throw new Error('execCommand returned false')
      }
    } catch (err) {
      console.error('所有复制方法都失败:', err)
      toast.error('❌ 复制失败，请长按文本手动复制', {
        duration: 4000,
        position: 'top-center'
      })
    }
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md max-h-[85vh] bg-card rounded-[24px] z-[101] shadow-2xl border border-white/10 overflow-hidden"
          >
            {/* 滚动内容区域 */}
            <div className="overflow-y-auto max-h-[85vh] p-6">
              {/* 右上角X按钮 */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col">
                {/* 标题 */}
                <h2 className="text-xl font-serif text-foreground mb-4">
                  导出数据胶囊
                </h2>

                {/* 提示信息 */}
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                  <p className="text-xs text-blue-600 font-serif leading-relaxed">
                    长按复制所有文本，请保存好。这是你的完整数据，请妥善保管。建议定期备份。
                  </p>
                </div>

                {/* 输入框 */}
                <div className="mb-4">
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                    数据胶囊内容
                  </label>
                  <textarea
                    readOnly
                    value={data}
                    rows={10}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-xs font-mono"
                    onClick={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.select()
                    }}
                  />
                </div>

                {/* 一键复制按钮 */}
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white font-serif transition-all hover:opacity-90"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="text-sm">{copied ? '已复制！' : '一键复制'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
