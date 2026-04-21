'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { MembershipCard } from '@/components/Membership/MembershipCard'

const XIANYU_URL = 'https://m.tb.cn/h.isrHxFb?tk=BaPn5iNjAKw'

interface MembershipPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onActivate?: () => void
  /** 触发来源，用于展示不同提示 */
  reason?: 'options_full' | 'locked_option' | 'locked_practice'
}

const REASON_SUBTITLES: Record<string, string> = {
  options_full: '免费用户最多 4 个选项',
  locked_option: '激活会员可以恢复选项使用',
  locked_practice: '激活会员恢复选项开始练习',
}

export function MembershipPromptModal({ isOpen, onClose, onActivate, reason }: MembershipPromptModalProps) {
  const [showPurchase, setShowPurchase] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(XIANYU_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for non-HTTPS
      const ta = document.createElement('textarea')
      ta.value = XIANYU_URL
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setShowPurchase(false)
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 关闭按钮 + 标题 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif text-foreground font-semibold">
            {showPurchase ? '购买 Pro 会员' : 'Pro 会员'}
          </h2>
          <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showPurchase ? (
          /* 购买引导 */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              前往闲鱼下单，下单后我会给你发送激活码
            </p>
            <div className="bg-white rounded-[16px] border border-[#E8E8E3] p-4">
              <p className="text-xs text-muted-foreground mb-2">闲鱼链接</p>
              <p className="text-sm text-[#2D3A2D] break-all select-all font-mono">
                {XIANYU_URL}
              </p>
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
                  一键复制链接
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* 会员卡片 */}
            <MembershipCard subtitle={reason ? REASON_SUBTITLES[reason] : undefined} />

            {/* 操作按钮 */}
            <div className="space-y-3 mt-4">
              <button
                onClick={() => setShowPurchase(true)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors group shadow-sm"
              >
                <span className="font-medium text-[#2D3A2D] font-serif">购买 PRO 会员</span>
                <span className="text-[#C1A268] text-sm font-medium group-hover:translate-x-1 transition-transform">
                  去购买 →
                </span>
              </button>

              <button
                onClick={() => {
                  onClose()
                  onActivate?.()
                }}
                className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors shadow-sm"
              >
                <span className="font-medium text-[#2D3A2D] font-serif">激活会员</span>
                <span className="text-[#C1A268] text-sm">使用激活码 →</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
