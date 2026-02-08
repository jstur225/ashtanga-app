"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, AlertCircle, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register'
  onAuthSuccess: () => void
}

export function AuthModal({ isOpen, onClose, mode, onAuthSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ==================== 密码强度验证 ====================
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    // 检查长度
    if (password.length < 8) {
      return { valid: false, error: '密码至少需要8位字符' }
    }

    // 检查是否包含字母
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, error: '密码必须包含字母' }
    }

    // 检查是否包含数字
    if (!/\d/.test(password)) {
      return { valid: false, error: '密码必须包含数字' }
    }

    // 防止常见弱密码
    const weakPasswords = ['12345678', 'password', 'qwerty123', 'abc12345', '11111111']
    if (weakPasswords.includes(password.toLowerCase())) {
      return { valid: false, error: '密码过于简单，请使用更强的密码' }
    }

    return { valid: true }
  }

  // ==================== 提交处理 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 密码强度验证（仅注册时）
      if (mode === 'register') {
        const validation = validatePassword(password)
        if (!validation.valid) {
          setError(validation.error || '密码格式不正确')
          setLoading(false)
          return
        }
      }

      if (mode === 'register') {
        const { data, error } = await signUp(email, password)
        if (error) throw error

        // 注册成功，显示友好的提示
        toast.success(
          '📧 验证邮件已发送',
          {
            description: '请查收邮件并点击验证链接。验证后请返回，点击「登录」按钮',
            duration: 6000,
          }
        )

        onClose()
        return
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
      }

      onAuthSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal - 从下往上滑进来 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            {/* 标题栏 - 带关闭按钮 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">
                {mode === 'register' ? '📧 绑定邮箱账号' : '🔐 登录'}
              </h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                    required
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少8位字符"
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                    required
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* 按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? '处理中...' : mode === 'register' ? '绑定账号' : '登录'}
                </button>
              </div>
            </form>

            {mode === 'register' && (
              <>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  绑定后可开启云同步，数据永不丢失
                </p>
                <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
                  🔒 注册即表示您同意我们仅为提供数据同步服务而存储您的加密数据。
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
