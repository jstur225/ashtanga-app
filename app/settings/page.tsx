'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CrownIcon, Ticket, ChevronRight } from 'lucide-react'
import { ActivateModal } from '@/components/Membership/ActivateModal'
import { MembershipCard } from '@/components/Membership/MembershipCard'
import { useMembership } from '@/hooks/useMembership'

export default function SettingsPage() {
  const router = useRouter()
  const { membership, loading, refresh } = useMembership()
  const [showActivateModal, setShowActivateModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-[#F5F5F0]/95 backdrop-blur-sm border-b border-[#E8E8E3]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => router.push('/practice?tab=stats')}
            className="flex items-center text-[#2D3A2D] hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-serif">返回</span>
          </button>
          <h1 className="flex-1 text-center font-serif text-lg text-[#2D3A2D]">设置</h1>
          <div className="w-16" /> {/* 占位保持平衡 */}
        </div>
      </header>

      {/* 内容 */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 会员卡片 */}
        <MembershipCard showStatus membership={membership} loading={loading} />

        {/* 操作按钮 — 遵循设计规范 */}
        <section className="space-y-3">
          <button
            onClick={() => alert('购买功能即将上线')}
            className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-xl flex items-center justify-center">
                <CrownIcon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[#2D3A2D] font-serif">购买 PRO 会员</p>
                <p className="text-sm text-[#8B7355] font-serif">开通 PRO 解锁全部功能</p>
              </div>
            </div>
            <span className="text-[#C1A268] text-sm font-medium group-hover:translate-x-1 transition-transform">
              去购买 →
            </span>
          </button>

          <button
            onClick={() => setShowActivateModal(true)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F0E8] rounded-xl flex items-center justify-center">
                <Ticket className="w-5 h-5 text-[#C1A268]" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[#2D3A2D] font-serif">激活会员</p>
                <p className="text-sm text-[#8B7355] font-serif">使用激活码开通 PRO 或续费</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#C1A268]" />
          </button>
        </section>

        {/* 版本信息 */}
        <section className="text-center pt-8">
          <p className="text-xs text-gray-400">熬汤日记 v1.0</p>
        </section>
      </main>

      {/* 激活弹窗 */}
      <ActivateModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={refresh}
      />
    </div>
  )
}
