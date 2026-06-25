'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

const WECHAT_ID = 'xiao519216978'

interface PurchaseGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PurchaseGuideModal({ isOpen, onClose }: PurchaseGuideModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = WECHAT_ID
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif text-foreground font-semibold">购买 Pro 会员</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-4 mb-6">
          <p className="text-sm text-muted-foreground">请联系开发者购买</p>
          <div className="bg-white rounded-[16px] border border-[#E8E8E3] p-4">
            <p className="text-lg font-mono text-[#2D3A2D] font-semibold select-all">
              {WECHAT_ID}
            </p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`w-full py-3.5 rounded-[16px] font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-[#C1A268] text-white active:scale-[0.98]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              复制微信号
            </>
          )}
        </button>
      </div>
    </div>
  )
}
