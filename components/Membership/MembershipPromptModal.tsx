'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MembershipCard } from '@/components/Membership/MembershipCard'
import { MembershipActions } from '@/components/Membership/MembershipActions'
import { PurchaseGuideModal } from '@/components/Membership/PurchaseGuideModal'

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

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
        <div
          className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* 关闭按钮 + 标题 */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-serif text-foreground font-semibold">Pro 会员</h2>
            <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 会员卡片 */}
          <MembershipCard subtitle={reason ? REASON_SUBTITLES[reason] : undefined} />

          {/* 操作按钮 */}
          <div className="mt-4">
            <MembershipActions
              onPurchase={() => setShowPurchase(true)}
              onActivate={() => {
                onClose()
                onActivate?.()
              }}
            />
          </div>
        </div>
      </div>

      {/* 购买引导弹窗 — 叠加在当前弹窗之上 */}
      <PurchaseGuideModal
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
      />
    </>
  )
}
