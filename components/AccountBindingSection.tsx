"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle, LogOut, RefreshCw, Smartphone, X, LogOut as LogOutIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { DataStorageNotice } from './DataStorageNotice'
import { AuthModal } from './AuthModal'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface AccountBindingSectionProps {
  profile: any
  localData: {
    records: any[]
    options: any[]
  }
  onSyncComplete: (data: any) => void
  onClose: () => void // ⭐ 新增：onClose 回调
}

export function AccountBindingSection({
  profile,
  localData,
  onSyncComplete,
  onClose,
}: AccountBindingSectionProps) {
  const { user, signOut } = useAuth()
  const { syncStatus, lastSyncTime, uploadLocalData, autoSync } = useSync(user, localData, onSyncComplete)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // ==================== 立即同步 ====================
  const handleSync = async () => {
    if (!user) return

    // 手动触发自动同步
    await autoSync()
  }

  // ==================== 退出登录 ====================
  const handleSignOut = () => {
    setShowSignOutConfirm(true)
  }

  return (
    <div>
      {/* 数据存储风险提示 */}
      <DataStorageNotice isCloudSynced={!!user} />

      {/* 未登录状态 */}
      {!user ? (
        <div className="space-y-3">
          <button
            onClick={() => {
              setAuthMode('register')
              setAuthModalOpen(true)
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)]"
          >
            <Mail className="w-5 h-5" />
            去绑定邮箱
          </button>
          <button
            onClick={() => {
              toast.success('✅ 已选择继续使用本地存储')
              onClose()
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium border border-border"
          >
            <Smartphone className="w-5 h-5" />
            继续使用本地存储
          </button>
          <p className="text-xs text-center text-muted-foreground">
            已有账号？<button
              onClick={() => {
                setAuthMode('login')
                setAuthModalOpen(true)
              }}
              className="text-primary hover:underline"
            >
              点击登录
            </button>
          </p>
        </div>
      ) : (
        /* 已登录状态 */
        <div className="space-y-4">
          {/* 用户信息和同步状态 - 并排显示 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 用户信息卡片 - 金色米白色渐变 */}
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-3 border border-amber-200/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-foreground">已绑定邮箱</span>
              </div>
              <p className="text-sm text-muted-foreground truncate leading-tight">
                {user.email}
              </p>
            </div>

            {/* 同步状态卡片 - 金色米白色渐变 */}
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-3 border border-amber-200/50">
              <div className="flex items-center gap-2 mb-2">
                {/* 精致小灯 */}
                <div className={`rounded-full w-2 h-2 flex-shrink-0 ${
                  syncStatus === 'syncing' ? 'bg-blue-400' :
                  syncStatus === 'success' ? 'bg-green-400' :
                  syncStatus === 'error' ? 'bg-red-400' :
                  'bg-stone-400'
                }`} />
                <p className="text-sm text-foreground">
                  最近同步时间
                </p>
              </div>
              {lastSyncTime && (
                <p className="text-sm text-muted-foreground leading-tight">
                  {new Date(lastSyncTime).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          </div>

          {/* 操作区 */}
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              立即同步
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}

      {/* 认证弹窗 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onAuthSuccess={() => setAuthModalOpen(false)}
      />

      {/* 退出登录确认弹窗 */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowSignOutConfirm(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif text-foreground">退出登录</h2>
                <button onClick={() => setShowSignOutConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-foreground text-center leading-relaxed">
                  退出登录后，您的数据仍安全保留在本机。
                </p>

                {user && (
                  <p className="text-xs text-muted-foreground text-center">
                    如需清空数据，请前往「数据管理」
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      await signOut()
                      setShowSignOutConfirm(false)
                      toast.success('✅ 已退出登录')
                    }}
                    className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all"
                  >
                    确定退出
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
