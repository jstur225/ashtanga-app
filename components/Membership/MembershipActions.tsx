'use client'

import { Crown, ChevronRight } from 'lucide-react'

interface MembershipActionsProps {
  onActivate: () => void
  isActive?: boolean
}

export function MembershipActions({ onActivate, isActive }: MembershipActionsProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onActivate}
        className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-[#2D3A2D] font-serif">
              {isActive ? '续费 Pro 会员' : '开通 Pro 会员'}
            </p>
            <p className="text-sm text-[#8B7355] font-serif">激活码开通，或联系作者购买</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#C1A268]" />
      </button>
    </div>
  )
}
