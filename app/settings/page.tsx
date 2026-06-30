'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ActivateModal } from '@/components/Membership/ActivateModal'
import { MembershipCard } from '@/components/Membership/MembershipCard'
import { MembershipActions } from '@/components/Membership/MembershipActions'
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

        {/* 操作按钮 */}
        <MembershipActions
          onActivate={() => setShowActivateModal(true)}
          isActive={membership?.is_active}
        />

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
