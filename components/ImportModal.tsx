'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardPaste, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (json: string) => void
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [importText, setImportText] = useState('')

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setImportText(text)
      toast.success('已粘贴到输入框')
    } catch (err) {
      toast.error('无法访问剪贴板，请手动粘贴')
    }
  }

  const handleConfirmImport = () => {
    if (importText.trim()) {
      onImport(importText)
      setImportText('')
      onClose()
    } else {
      toast.error('请先粘贴数据胶囊')
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
                <h2 className="text-xl font-serif text-foreground mb-1">
                  导入数据胶囊
                </h2>
                <p className="text-xs text-muted-foreground font-serif mb-4">
                  从剪贴板恢复您的数据
                </p>

                {/* 提示信息 */}
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100 mb-4">
                  <p className="text-xs text-red-600 font-serif leading-relaxed">
                    请粘贴之前复制的数据胶囊内容。
                  </p>
                </div>

                {/* 输入框 */}
                <div className="mb-4">
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                    数据胶囊内容
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="在此粘贴数据胶囊..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-xs font-mono"
                  />
                </div>

                {/* 一键粘贴按钮 */}
                <button
                  onClick={handlePaste}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white font-serif transition-all hover:opacity-90 mb-3"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span className="text-sm">一键粘贴</span>
                </button>

                {/* 确认导入按钮 */}
                <button
                  onClick={handleConfirmImport}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white font-serif transition-all hover:opacity-90"
                >
                  <Check className="w-4 h-4" />
                  <span className="text-sm">确认导入</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
