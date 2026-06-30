'use client'

import type { ReactNode } from 'react'
import { Crown, Loader2, Sparkles } from 'lucide-react'
import { PRO_BENEFITS, type MembershipStatus } from '@/hooks/useMembership'

type MembershipCardData = Pick<MembershipStatus, 'is_active' | 'expires_at_formatted' | 'days_remaining' | 'type'>

export interface MembershipCardProps {
  subtitle?: string
  showStatus?: boolean
  membership?: MembershipCardData | null
  loading?: boolean
  headerAction?: ReactNode
  showPrices?: boolean
}

export function MembershipPriceCards() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-[#C1A268]/15 bg-white/60 px-3 py-4 text-center shadow-sm">
        <div className="text-3xl font-bold text-[#6B5A47] leading-none">
          <span className="text-base align-super mr-0.5">¥</span>19.8
        </div>
        <div className="mt-3 text-sm font-serif text-[#6B5A47]">季卡</div>
        <div className="mt-0.5 text-xs font-serif text-[#8B7355]">90 天</div>
      </div>

      <div className="relative rounded-2xl border border-[#C1A268]/35 bg-white/80 px-3 py-4 text-center shadow-[0_6px_18px_rgba(193,162,104,0.14)]">
        <div className="absolute right-2 top-2 rounded-full bg-[#C1A268]/15 px-2 py-0.5 text-[10px] font-serif text-[#9A7438]">
          推荐
        </div>
        <div className="text-3xl font-bold text-[#9A7438] leading-none">
          <span className="text-base align-super mr-0.5">¥</span>69.8
        </div>
        <div className="mt-3 text-sm font-serif text-[#6B5A47]">年卡</div>
        <div className="mt-0.5 text-xs font-serif text-[#8B7355]">365 天</div>
      </div>
    </div>
  )
}

export function MembershipCard({ subtitle, showStatus = false, membership, loading = false, headerAction, showPrices = true }: MembershipCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#F9F7F2] to-[#F5F0E8] rounded-[20px] p-5 border border-[#C1A268]/20">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-serif text-lg text-[#8B7355]">PRO 会员</h2>
          </div>

          {showStatus && loading ? (
            <div className="flex items-center gap-2 text-[#8B7355]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-serif">加载中...</span>
            </div>
          ) : showStatus && membership?.is_active ? (
            <div>
              <p className="text-[#6B5A47] font-serif font-medium">
                有效期至 {membership.expires_at_formatted}
              </p>
              <p className="text-[#8B7355] text-sm mt-1 font-serif">
                还剩 {membership.days_remaining} 天
                {membership.type === 'quarter' ? ' · 季卡' : membership.type === 'year' ? ' · 年卡' : ''}
              </p>
            </div>
          ) : (
            <p className="text-[#8B7355] text-sm font-serif">
              {subtitle || '解锁更多记录与日历能力'}
            </p>
          )}
        </div>

        {headerAction || (!membership?.is_active && !loading && (
          <Sparkles className="w-6 h-6 text-[#C1A268]" />
        ))}
      </div>

      {/* Pro 功能对比 */}
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

      {showPrices && <MembershipPriceCards />}
    </div>
  )
}
