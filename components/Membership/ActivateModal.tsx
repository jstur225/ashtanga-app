'use client'

import { useState } from 'react'
import { X, Crown, Loader2, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react'
import { useActivateCode } from '@/hooks/useActivateCode'

const WECHAT_ID = 'xiao519216978'

interface ActivateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ActivateModal({ isOpen, onClose, onSuccess }: ActivateModalProps) {
  const {
    code, loading, error, success, isCodeComplete,
    handleInputChange, handleActivate, handleKeyDown, reset,
  } = useActivateCode(onSuccess)
  const [copied, setCopied] = useState(false)

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = WECHAT_ID
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = async () => {
    await reset()
    setCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 text-[#8B7355] hover:text-[#6B5A47] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 成功状态 */}
        {success ? (
          <div className="p-6 text-center">
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
            {/* 头部 */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3A2D] font-serif">开通 Pro 会员</h3>
                  <p className="text-sm text-[#8B7355] font-serif">输入激活码，或联系作者购买</p>
                </div>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="px-6 pb-6">
              <label className="block text-sm font-medium text-[#6B5A47] mb-2 font-serif">
                激活码
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  disabled={loading}
                  className="w-full px-4 py-3 text-center text-lg tracking-widest font-mono bg-[#F9F7F2] border border-[#E8E8E3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C1A268]/50 focus:border-[#C1A268] transition-all disabled:opacity-50"
                />
              </div>
              <p className="mt-2 text-xs text-[#8B7355] text-center font-serif">
                请输入 12 位激活码，格式如: X7B9-K2M4-P5Q8
              </p>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm font-medium font-serif">{error}</div>
                  </div>
                </div>
              )}

              {/* 激活按钮 */}
              <button
                onClick={handleActivate}
                disabled={loading || !isCodeComplete}
                className="w-full mt-4 py-3 px-4 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-opacity flex items-center justify-center gap-2 font-serif"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在激活...
                  </>
                ) : (
                  '立即激活'
                )}
              </button>

              {/* 购买提示 */}
              <div className="mt-5 pt-5 border-t border-[#E8E8E3]">
                <p className="text-sm text-[#6B5A47] font-serif font-medium mb-3">还没有激活码？</p>
                <div className="bg-[#F9F7F2] rounded-[16px] border border-[#E8E8E3] p-4">
                  <p className="text-xs text-[#8B7355] font-serif mb-2">联系作者购买</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-mono text-[#2D3A2D] font-semibold select-all">
                      {WECHAT_ID}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyWechat}
                      className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
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
                          复制
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
