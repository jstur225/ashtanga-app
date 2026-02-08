"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle, LogOut, RefreshCw, Smartphone, X, LogOut as LogOutIcon, Key, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { DataStorageNotice } from './DataStorageNotice'
import { AuthModal } from './AuthModal'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
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

// 隐藏邮箱地址的辅助函数
function maskEmail(email: string): string {
  if (!email) return ''

  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  // 用户名只显示前2个字符，其余用***代替
  const maskedUsername = username.length <= 2
    ? username
    : username.slice(0, 2) + '***'

  return `${maskedUsername}@${domain}`
}

export function AccountBindingSection({
  profile,
  localData,
  onSyncComplete,
  onClose,
}: AccountBindingSectionProps) {
  const { user, signOut, deviceConflict, confirmDeviceConflict, cancelDeviceConflict } = useAuth()
  const { syncStatus, lastSyncTime, uploadLocalData, autoSync } = useSync(user, localData, onSyncComplete)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('register')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

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
              <p className="text-sm text-muted-foreground truncate leading-tight" title={user.email || ''}>
                {maskEmail(user.email || '')}
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

          {/* 修改密码按钮 */}
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border hover:border-primary/50 rounded-xl hover:bg-secondary/50 transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            <Key className="w-4 h-4" />
            修改密码
          </button>
        </div>
      )}

      {/* 认证弹窗 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onAuthSuccess={() => setAuthModalOpen(false)}
        onModeChange={(newMode) => setAuthMode(newMode)}
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

      {/* 修改密码弹窗 - 从下往上滑入 */}
      <AnimatePresence>
        {showChangePassword && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => {
                setShowChangePassword(false)
                setPasswordError('')
                setOldPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif text-foreground">🔑 修改密码</h2>
                <button
                  onClick={() => {
                    setShowChangePassword(false)
                    setPasswordError('')
                    setOldPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 旧密码 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    当前密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="请输入当前密码"
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                    />
                  </div>
                </div>

                {/* 新密码 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="至少8位字符，包含字母和数字"
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                    />
                  </div>
                </div>

                {/* 确认新密码 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="再次输入新密码"
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                    />
                  </div>
                </div>

                {/* 错误提示 */}
                {passwordError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                {/* 密码强度提示 */}
                {newPassword && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>密码要求：</p>
                    <ul className="pl-4 space-y-1">
                      <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}>
                        {newPassword.length >= 8 ? '✓' : '✗'} 至少8位字符
                      </li>
                      <li className={/[a-zA-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}>
                        {/[a-zA-Z]/.test(newPassword) ? '✓' : '✗'} 包含字母
                      </li>
                      <li className={/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}>
                        {/\d/.test(newPassword) ? '✓' : '✗'} 包含数字
                      </li>
                    </ul>
                  </div>
                )}

                {/* 按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowChangePassword(false)
                      setPasswordError('')
                      setOldPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      // 验证
                      if (!oldPassword || !newPassword || !confirmPassword) {
                        setPasswordError('请填写所有字段')
                        return
                      }

                      if (newPassword !== confirmPassword) {
                        setPasswordError('两次输入的新密码不一致')
                        return
                      }

                      if (newPassword.length < 8) {
                        setPasswordError('密码至少需要8位字符')
                        return
                      }

                      if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
                        setPasswordError('密码必须包含字母和数字')
                        return
                      }

                      // 更新密码
                      const { error } = await supabase.auth.updateUser({
                        password: newPassword
                      })

                      if (error) {
                        setPasswordError(error.message || '修改失败，请检查当前密码是否正确')
                        return
                      }

                      toast.success('✅ 密码修改成功')
                      setShowChangePassword(false)
                      setPasswordError('')
                      setOldPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all"
                  >
                    确认修改
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 设备冲突确认弹窗 - 从下往上滑入 */}
      <AnimatePresence>
        {deviceConflict && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={cancelDeviceConflict}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif text-foreground">⚠️ 设备登录提醒</h2>
                <button onClick={cancelDeviceConflict} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-foreground text-center leading-relaxed">
                  您的账号已在以下设备登录：
                </p>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{deviceConflict.oldDevice.name}</p>
                      <p className="text-xs text-amber-600">
                        {new Date(deviceConflict.oldDevice.last_seen).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-foreground text-center leading-relaxed">
                  在新设备登录后，以上设备将被退出登录。
                </p>

                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs text-blue-700 text-center leading-relaxed">
                    💡 建议先在旧设备上导出数据<br />
                    （设置 → 数据管理 → 导出数据）
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      await cancelDeviceConflict()
                      await signOut()
                      toast.info('已取消登录')
                    }}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      await confirmDeviceConflict()
                      toast.success('✅ 登录成功')
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all"
                  >
                    继续登录
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
