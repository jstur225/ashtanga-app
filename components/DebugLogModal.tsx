'use client'

import React from 'react'
import { X, Bug, Download } from 'lucide-react'

interface DebugLogModalProps {
  isOpen: boolean
  onClose: () => void
  logContent: string
}

export function DebugLogModal({ isOpen, onClose, logContent }: DebugLogModalProps) {
  const handleDownload = () => {
    try {
      const blob = new Blob([logContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ashtanga-debug-log-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[DebugLogModal] 下载失败:', err)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* 弹窗内容 - 居中显示 */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-lg pointer-events-auto max-h-[85vh] flex flex-col">
          {/* 固定头部 - 只包含标题和X按钮 */}
          <div className="flex-shrink-0 p-6 pb-2">
            {/* 右上角X按钮 */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 标题 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif text-foreground">运行日志</h2>
                <p className="text-xs text-muted-foreground font-serif mt-0.5">
                  如遇问题，请导出日志发给开发者
                </p>
              </div>
            </div>
          </div>

          {/* 可滚动内容区域 - 包含提示框、输入框 */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {/* 提示信息 */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-4">
              <p className="text-xs text-amber-700 font-serif leading-relaxed">
                💡 点击下方按钮导出 JSON 文件发给开发者
              </p>
            </div>

            {/* 输入框 */}
            <div>
              <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                日志内容
              </label>
              <textarea
                readOnly
                value={logContent}
                rows={15}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
              />
            </div>
          </div>

          {/* 固定底部按钮 */}
          <div className="flex-shrink-0 p-6 pt-0">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-serif transition-all bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">导出文件</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
