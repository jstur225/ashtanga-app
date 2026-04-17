'use client'

import { X, Crown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { MembershipCard } from '@/components/Membership/MembershipCard'
import { useActivateCode } from '@/hooks/useActivateCode'

interface MembershipPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 触发来源，用于展示不同提示 */
  reason?: 'options_full' | 'locked_option' | 'locked_practice'
}

const REASON_SUBTITLES: Record<string, string> = {
  options_full: '免费用户最多 4 个选项',
  locked_option: '激活会员可以恢复选项使用',
  locked_practice: '激活会员恢复选项开始练习',
}

export function MembershipPromptModal({ isOpen, onClose, onSuccess, reason }: MembershipPromptModalProps) {
  const {
    code, loading, error, success, isCodeComplete,
    handleInputChange, handleActivate, handleKeyDown, reset,
  } = useActivateCode(onSuccess)

  const handleClose = async () => {
    await reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 关闭按钮 + 标题 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif text-foreground font-semibold">Pro 会员</h2>
          <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 成功状态 */}
        {success ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#C1A268]/20 to-[#D4AF37]/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#C1A268]" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#2D3A2D] mb-2 font-serif">
              {success.is_new ? '激活成功！' : '续费成功！'}
            </h3>
            <p className="text-[#8B7355] mb-4 font-serif">
              {success.is_new ? '您已成功开通 Pro 会员' : '您的会员时长已延长'}
            </p>
            <div className="bg-gradient-to-br from-[#F9F7F2] to-[#F5F0E8] rounded-[20px] p-4 mb-6 border border-[#C1A268]/20">
              <div className="flex items-center justify-center gap-2 text-[#C1A268] mb-1">
                <Crown className="w-5 h-5" />
                <span className="font-medium font-serif">Pro 会员</span>
              </div>
              <div className="text-2xl font-bold text-[#6B5A47] font-serif">
                有效期至 {success.expires_at_formatted}
              </div>
              <div className="text-sm text-[#8B7355] mt-1 font-serif">
                {success.type === 'quarter' ? '季卡 (90天)' : '年卡 (365天)'}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] hover:opacity-90 text-white font-medium rounded-xl transition-opacity font-serif"
            >
              开始使用
            </button>
          </div>
        ) : (
          <>
            {/* 会员卡片 */}
            <MembershipCard subtitle={reason ? REASON_SUBTITLES[reason] : undefined} />

            {/* 购买按钮 */}
            <button
              onClick={() => alert('购买功能即将上线')}
              className="w-full mt-4 py-3 px-4 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] hover:opacity-90 text-white font-medium rounded-xl transition-opacity font-serif"
            >
              购买 PRO 会员
            </button>

            {/* 分割线 */}
            <div className="mt-4 border-t border-[#E8E8E3]" />

            {/* 激活码输入 */}
            <div className="pt-4">
              <label className="block text-sm font-medium text-[#6B5A47] mb-2 font-serif">
                输入激活码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  disabled={loading}
                  className="flex-1 px-3 py-2.5 text-center text-sm tracking-widest font-mono bg-[#F9F7F2] border border-[#E8E8E3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C1A268]/50 focus:border-[#C1A268] transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleActivate}
                  disabled={loading || !isCodeComplete}
                  className="px-4 py-2.5 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] hover:opacity-90 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white text-sm font-medium rounded-xl transition-opacity flex items-center gap-1.5 font-serif whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      激活中
                    </>
                  ) : '激活'}
                </button>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-serif">{error}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
