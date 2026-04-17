'use client'

import { useState, useCallback } from 'react'
import { X, Crown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MembershipPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 触发来源，用于展示不同提示 */
  reason?: 'options_full' | 'locked_option' | 'locked_practice'
}

interface ActivateResponse {
  success: boolean
  data?: {
    expires_at: string
    expires_at_formatted: string
    days: number
    type: 'quarter' | 'year'
    is_new: boolean
  }
  error?: string
}

const benefits = [
  { text: '9 张', subtext: '照片上传' },
  { text: '11 个', subtext: '自定义选项' },
  { text: '9 种', subtext: '日历标注' },
]

export function MembershipPromptModal({ isOpen, onClose, onSuccess, reason }: MembershipPromptModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<ActivateResponse['data'] | null>(null)

  const formatCode = useCallback((input: string) => {
    const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)
    const parts = []
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4))
    }
    return parts.join('-')
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(formatCode(e.target.value))
    setError(null)
  }

  const isCodeComplete = code.replace(/-/g, '').length === 12

  const handleActivate = async () => {
    if (!isCodeComplete) {
      setError('请输入完整的激活码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('请先登录')
        setLoading(false)
        return
      }

      const response = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      })

      const result: ActivateResponse = await response.json()

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          INVALID_CODE: '激活码无效',
          INVALID_CODE_FORMAT: '激活码格式错误',
          CODE_USED: '该激活码已被使用',
          CODE_EXPIRED: '该激活码已过期',
          NOT_AUTHENTICATED: '请先登录',
          DATABASE_ERROR: '系统繁忙，请稍后再试',
          INTERNAL_ERROR: '服务器错误',
        }
        setError(errorMessages[result.error || ''] || '激活失败，请重试')
      } else {
        setSuccess(result.data || null)
        await onSuccess?.()
      }
    } catch {
      setError('网络错误，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleActivate()
    }
  }

  const handleClose = async () => {
    const wasSuccess = success !== null
    setCode('')
    setError(null)
    setSuccess(null)
    if (wasSuccess) {
      await onSuccess?.()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 p-1 text-[#8B7355]/60 hover:text-[#6B5A47] transition-colors z-10"
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
            {/* 头部 - 金色渐变背景 */}
            <div className="bg-gradient-to-br from-[#C1A268] to-[#D4AF37] px-6 pt-8 pb-5 text-center">
              <div className="w-12 h-12 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white font-serif">升级 Pro 会员</h3>
              <p className="text-sm text-white/80 font-serif mt-1">
                {reason === 'options_full'
                  ? '免费用户最多 4 个选项'
                  : reason === 'locked_practice'
                    ? '激活会员恢复选项开始练习'
                    : '激活会员可以恢复选项使用'}
              </p>
            </div>

            {/* 权益列表 - 与设置页一致 */}
            <div className="px-5 pt-4 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {benefits.map((b, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg font-bold text-[#6B5A47]">{b.text}</div>
                    <div className="text-xs text-[#8B7355] font-serif">{b.subtext}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 分割线 */}
            <div className="mx-5 border-t border-[#E8E8E3]" />

            {/* 激活码输入 */}
            <div className="px-5 pt-3 pb-5">
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

              {/* 购买提示 */}
              <div className="mt-3 text-center">
                <p className="text-xs text-[#8B7355] font-serif">
                  还没有激活码？
                  <button
                    onClick={() => alert('购买功能即将上线')}
                    className="ml-1 text-[#C1A268] hover:text-[#D4AF37] font-medium"
                  >
                    去购买
                  </button>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
