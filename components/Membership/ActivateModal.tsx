'use client'

import { useState, useCallback } from 'react'
import { X, Crown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ActivateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
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

export function ActivateModal({ isOpen, onClose, onSuccess }: ActivateModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<ActivateResponse['data'] | null>(null)

  // 格式化输入的激活码
  const formatCode = useCallback((input: string) => {
    // 移除所有非字母数字字符
    const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)
    // 每4个字符加连字符
    const parts = []
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4))
    }
    return parts.join('-')
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value)
    setCode(formatted)
    setError(null)
  }

  // 检查激活码是否完整（12个字母数字）
  const isCodeComplete = code.replace(/-/g, '').length === 12

  const handleActivate = async () => {
    if (!isCodeComplete) {
      setError('请输入完整的激活码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 从 Supabase 获取当前 session
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
          INTERNAL_ERROR: '服务器错误，请稍后再试',
        }
        console.error('激活失败:', result)
        setError(errorMessages[result.error || ''] || result.error || '激活失败，请重试')
      } else {
        setSuccess(result.data || null)
        onSuccess?.()
      }
    } catch (err) {
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

  const handleClose = () => {
    setCode('')
    setError(null)
    setSuccess(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 成功状态 */}
        {success ? (
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {success.is_new ? '激活成功！' : '续费成功！'}
            </h3>
            <p className="text-gray-600 mb-4">
              {success.is_new ? '您已成功开通 Pro 会员' : '您的会员时长已延长'}
            </p>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
                <Crown className="w-5 h-5" />
                <span className="font-medium">Pro 会员</span>
              </div>
              <div className="text-2xl font-bold text-amber-800">
                有效期至 {success.expires_at_formatted}
              </div>
              <div className="text-sm text-amber-600 mt-1">
                {success.type === 'quarter' ? '季卡 (90天)' : '年卡 (365天)'}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
            >
              开始使用
            </button>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">激活 Pro 会员</h3>
                  <p className="text-sm text-gray-500">解锁更多专属功能</p>
                </div>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="px-6 pb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 text-center text-lg tracking-widest font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                请输入 12 位激活码，格式如: X7B9-K2M4-P5Q8
              </p>

              {/* 错误提示 */}
              {error && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 激活按钮 */}
              <button
                onClick={handleActivate}
                disabled={loading || !isCodeComplete}
                className="w-full mt-4 py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
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
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  还没有激活码？
                  <button
                    onClick={() => {
                      // TODO: 跳转到购买页面
                      alert('购买功能即将上线')
                    }}
                    className="ml-1 text-amber-600 hover:text-amber-700 font-medium"
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
