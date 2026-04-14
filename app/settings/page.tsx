'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, ChevronLeft, Loader2, CrownIcon, Sparkles, Ticket, ChevronRight } from 'lucide-react'
import { ActivateModal } from '@/components/Membership/ActivateModal'
import { supabase } from '@/lib/supabase'

interface MembershipStatus {
  is_active: boolean
  expires_at: string | null
  expires_at_formatted: string | null
  days_remaining: number
  type: 'quarter' | 'year' | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState<MembershipStatus | null>(null)
  const [showActivateModal, setShowActivateModal] = useState(false)

  // 查询会员状态
  const fetchMembershipStatus = async () => {
    try {
      // 从 Supabase 获取当前 session
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/membership/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMembership(result.data)
        }
      }
    } catch (err) {
      console.error('查询会员状态失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembershipStatus()
  }, [])

  const handleActivateSuccess = () => {
    fetchMembershipStatus()
  }

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
        {/* 会员卡片 — 遵循设计规范 */}
        <section className="bg-gradient-to-br from-[#F9F7F2] to-[#F5F0E8] rounded-[20px] p-5 border border-[#C1A268]/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-serif text-lg text-[#8B7355]">Pro 会员</h2>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-[#8B7355]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-serif">加载中...</span>
                </div>
              ) : membership?.is_active ? (
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
                  免费用户 · 解锁更多专属功能
                </p>
              )}
            </div>

            {!membership?.is_active && !loading && (
              <Sparkles className="w-6 h-6 text-[#C1A268]" />
            )}
          </div>

          {/* Pro 功能预览 */}
          <div className="mt-4 pt-4 border-t border-[#C1A268]/20">
            <p className="text-xs text-[#8B7355] mb-3 font-serif">Pro 会员权益</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-[#6B5A47]">9 张</div>
                <div className="text-xs text-[#8B7355] font-serif">照片上传</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#6B5A47]">10 个</div>
                <div className="text-xs text-[#8B7355] font-serif">自定义选项</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#6B5A47]">9 种</div>
                <div className="text-xs text-[#8B7355] font-serif">日历标注</div>
              </div>
            </div>
          </div>
        </section>

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
                <p className="font-medium text-[#2D3A2D] font-serif">购买会员</p>
                <p className="text-sm text-[#8B7355] font-serif">开通 Pro 解锁全部功能</p>
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
                <p className="text-sm text-[#8B7355] font-serif">使用激活码开通或续费</p>
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
        onSuccess={handleActivateSuccess}
      />
    </div>
  )
}
