'use client'

import { Crown, Loader2, Sparkles } from 'lucide-react'
import { PRO_BENEFITS, type MembershipStatus } from '@/hooks/useMembership'

type MembershipCardData = Pick<MembershipStatus, 'is_active' | 'expires_at_formatted' | 'days_remaining' | 'type'>

export interface MembershipCardProps {
  subtitle?: string
  showStatus?: boolean
  membership?: MembershipCardData | null
  loading?: boolean
}

export function MembershipCard({ subtitle, showStatus = false, membership, loading = false }: MembershipCardProps) {
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
              {subtitle || '免费用户 · 解锁更多专属功能'}
            </p>
          )}
        </div>

        {!membership?.is_active && !loading && (
          <Sparkles className="w-6 h-6 text-[#C1A268]" />
        )}
      </div>

      {/* Pro 功能预览 */}
      <div className="mt-4 pt-4 border-t border-[#C1A268]/20">
        <p className="text-xs text-[#8B7355] mb-3 font-serif">PRO 会员权益</p>
        <div className="grid grid-cols-3 gap-2">
          {PRO_BENEFITS.map((b, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-bold text-[#6B5A47]">{b.text}</div>
              <div className="text-xs text-[#8B7355] font-serif">{b.subtext}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
