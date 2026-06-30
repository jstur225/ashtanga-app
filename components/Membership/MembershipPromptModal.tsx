'use client'

import { Crown, X } from 'lucide-react'
import { PRO_BENEFITS } from '@/hooks/useMembership'
import { MembershipPriceCards } from '@/components/Membership/MembershipCard'

interface MembershipPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onActivate?: () => void
  /** 触发来源，用于展示不同提示 */
  reason?: 'options_full' | 'locked_option' | 'locked_practice' | 'locked_annotation' | 'color_level'
}

const REASON_SUBTITLES: Record<string, string> = {
  options_full: '免费用户最多 3 个练习选项',
  locked_option: '开通 Pro 可继续使用更多选项',
  locked_practice: '开通 Pro 可使用该练习选项',
  locked_annotation: '免费用户 1 种标注，Pro 最多 9 种',
  color_level: 'Pro 可解锁全部日历颜色',
}

export function MembershipPromptModal({ isOpen, onClose, onActivate, reason }: MembershipPromptModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/50" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[130] p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-[#F9F7F2] to-[#F5F0E8] rounded-[24px] p-5 border border-[#C1A268]/20 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-serif text-lg text-[#8B7355]">PRO 会员</h2>
              </div>
              <p className="text-[#8B7355] text-sm font-serif">
                {reason ? REASON_SUBTITLES[reason] : '解锁更多记录与日历能力'}
              </p>
            </div>

            <button type="button" aria-label="关闭会员提示" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-[#C1A268]/20">
            <div className="rounded-2xl overflow-hidden border border-[#C1A268]/15 bg-white/70 shadow-sm">
              <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr] bg-[#F5F0E8] text-[11px] font-serif text-[#8B7355]">
                <div className="px-3 py-2">权益</div>
                <div className="px-2 py-2 text-center">普通</div>
                <div className="px-2 py-2 text-center text-[#9A7438]">Pro</div>
              </div>
              {PRO_BENEFITS.map((benefit) => (
                <div
                  key={benefit.feature}
                  className="grid grid-cols-[1.25fr_0.8fr_0.8fr] items-center border-t border-[#C1A268]/10 text-sm"
                >
                  <div className="px-3 py-2.5 text-[#6B5A47] font-serif">{benefit.feature}</div>
                  <div className="px-2 py-2.5 text-center text-[#8B7355]">{benefit.free}</div>
                  <div className="px-2 py-2.5 text-center font-semibold text-[#9A7438]">{benefit.pro}</div>
                </div>
              ))}
            </div>
          </div>

          <MembershipPriceCards />

          <button
            type="button"
            onClick={() => {
              onClose()
              onActivate?.()
            }}
            className="mt-4 w-full rounded-full bg-gradient-to-br from-[#C1A268] to-[#D4AF37] px-5 py-3.5 text-white shadow-[0_6px_18px_rgba(193,162,104,0.28)] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="font-serif font-medium">开通 Pro 会员</span>
            </div>
            <p className="mt-1 text-xs text-white/85 font-serif">激活码开通，或联系作者购买</p>
          </button>
        </div>
      </div>
    </div>
  )
}
