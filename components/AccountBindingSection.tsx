"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Mail, CheckCircle, LogOut, RefreshCw, Smartphone, X, LogOut as LogOutIcon, Key, Lock, AlertCircle, ChevronRight, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { DataStorageNotice } from './DataStorageNotice'
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
  onOpenLoginModal: () => void
  onOpenRegisterModal: () => void
  onShowClearDataConfirm?: () => void // ⭐ 新增：显示清空数据确认弹窗
  user?: any // ⭐ 新增：用户状态从父组件传递
}

// 隐藏邮箱地址的辅助函数
function maskEmail(email: string): string {
  if (!email) return ''

  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  // 用户名长度处理：前3位 + *** + 后3位
  if (username.length <= 6) {
    // 用户名太短，只显示前3位
    return username.slice(0, 3) + '***@' + domain
  }

  const prefix = username.slice(0, 3)
  const suffix = username.slice(-3)
  return `${prefix}****${suffix}@${domain}`
}

export function AccountBindingSection({
  profile,
  localData,
  onSyncComplete,
  onClose,
  onOpenLoginModal,
  onOpenRegisterModal,
  onShowClearDataConfirm,
  user: propUser,
}: AccountBindingSectionProps) {
  const { user: authUser, signOut, deviceConflict, confirmDeviceConflict, cancelDeviceConflict } = useAuth()
  // 优先使用 prop 传递的 user，如果没有则使用 useAuth 获取的
  const user = propUser || authUser
  const { syncStatus, lastSyncTime, lastSyncStatus, uploadLocalData, autoSync, syncStats, resetSyncStatus } = useSync(
    user,
    { ...localData, profile },
    onSyncComplete
  )
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // 测试 Supabase 连接
  const testSupabaseConnection = async () => {
    console.log('测试 Supabase 连接...')
    console.log('当前用户:', user)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Session 测试错误:', error)
      } else {
        console.log('Session 测试结果:', { data, error })
      }
    } catch (err: any) {
      // 忽略 AbortError（开发环境热重载导致的错误）
      if (err.name === 'AbortError') {
        console.log('Session 测试被中断（开发环境热重载）')
      } else {
        console.error('Session 测试异常:', err)
      }
    }
  }

  // 翻译 Supabase 错误消息
  const translateErrorMessage = (message: string): string => {
    console.log('翻译错误消息:', message)

    const errorMap: Record<string, string> = {
      'New password should be different from the old password.': '新密码不能与原密码相同',
      'Invalid login credentials': '邮箱或密码错误',
      'Email not confirmed': '邮箱未验证',
      'User already registered': '该邮箱已注册',
      'Password should be at least 6 characters': '密码至少需要6个字符',
      'Unable to validate email address: invalid format': '邮箱格式不正确',
      'Signups not allowed': '暂不允许注册',
      'Email rate limit exceeded': '发送邮件过于频繁，请稍后再试',
      '请求超时': '请求超时，请检查网络连接后重试',
      'Auth session missing': '登录已过期，请重新登录',
      'Auth session missing!': '登录已过期，请重新登录',
    }

    for (const [english, chinese] of Object.entries(errorMap)) {
      if (message.includes(english)) {
        console.log('找到匹配:', english, '→', chinese)
        return chinese
      }
    }

    console.log('未找到匹配，返回原消息')
    return message // 如果没有匹配到，返回原消息
  }

  // 组件挂载时测试连接（只在挂载时执行一次）
  useEffect(() => {
    console.log('AccountBindingSection 组件已挂载')
    console.log('当前用户状态:', user)
    testSupabaseConnection()
  }, []) // 空依赖数组 = 只在挂载时执行一次

  // 弹窗打开时阻止背景滚动
  useEffect(() => {
    const isAnyModalOpen = showSignOutConfirm || showChangePassword || !!deviceConflict

    if (isAnyModalOpen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY

      // 阻止滚动
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        // 恢复滚动
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [showSignOutConfirm, showChangePassword, deviceConflict])

  // ==================== 立即同步 ====================
  const handleSync = async () => {
    console.log('🚨🚨🚨 [handleSync] 按钮被点击了！🚨🚨🚨')

    if (!user) {
      console.log('❌ [handleSync] 用户未登录，退出')
      return
    }

    console.log('✅ [handleSync] 用户已登录')
    console.log('   user_id:', user.id)
    console.log('   autoSync 函数:', autoSync)
    console.log('   autoSync 类型:', typeof autoSync)

    try {
      // 手动触发自动同步
      console.log('🔄 [handleSync] 准备调用 autoSync...')
      await autoSync()
      console.log('✅ [handleSync] autoSync 执行完成')
    } catch (error: any) {
      console.error('❌ [handleSync] autoSync 执行失败:', error)
      console.error('   错误消息:', error?.message)
      console.error('   错误堆栈:', error?.stack)
    }
  }

  // ==================== 修改密码 ====================
  const handleChangePassword = () => {
    console.log('📝 打开修改密码弹窗')
    console.log('   当前用户状态:', user ? '已登录' : '未登录')

    setShowChangePassword(true)
    setPasswordError('')
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  // ==================== 退出登录 ====================
  const handleSignOut = () => {
    setShowSignOutConfirm(true)
  }

  return (
    <div>
      {/* 数据存储风险提示 - 包含已绑定邮箱、同步提醒、进度条 */}
      <DataStorageNotice
        isCloudSynced={!!user}
        email={user?.email}
        syncStats={syncStats}
        syncStatus={syncStatus}
        lastSyncStatus={lastSyncStatus}
        lastSyncTime={lastSyncTime}
      />

      {/* 未登录状态 */}
      {!user ? (
        <div className="space-y-3">
          <button
            onClick={onOpenRegisterModal}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium font-serif backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)]"
          >
            <Mail className="w-5 h-5" />
            去绑定邮箱
          </button>
          <button
            onClick={() => {
              toast.success('✅ 已选择继续使用本地存储')
              onClose()
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium font-serif border border-border"
          >
            <Smartphone className="w-5 h-5" />
            继续使用本地存储
          </button>
          <p className="text-xs font-serif text-center text-muted-foreground">
            已有账号？<button
              onClick={onOpenLoginModal}
              className="text-primary font-serif hover:underline"
            >
              点击登录
            </button>
          </p>
        </div>
      ) : (
        /* 已登录状态 */
        <div className="space-y-3">
          {/* ⭐ 上限提醒（当本地记录超过1000条时显示）*/}
          {syncStats?.localOnlyCount > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 border border-amber-200/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-muted-foreground font-serif">
                  上限提醒：已同步接近1000条，<span className="font-medium">{syncStats.localOnlyCount}</span> 条新记录仅保存在本地
                </p>
              </div>
            </div>
          )}

          {/* 操作区 */}
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-serif"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? '同步中...' : '立即同步'}
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>

          {/* 同步卡住时的重置按钮 */}
          {syncStatus === 'syncing' && (
            <button
              onClick={resetSyncStatus}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-serif"
            >
              <X className="w-3 h-3" />
              同步卡住？点击重置
            </button>
          )}

          {/* 修改密码按钮 */}
          <button
            onClick={handleChangePassword}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border hover:border-primary/50 rounded-xl hover:bg-secondary/50 transition-all text-sm font-serif text-muted-foreground hover:text-foreground"
          >
            <Key className="w-4 h-4" />
            修改密码
          </button>
        </div>
      )}

      {/* 退出登录确认弹窗 */}
      {showSignOutConfirm && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={() => setShowSignOutConfirm(false)} />

          {/* Modal - 居中显示 */}
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 pointer-events-none">
            <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto">
              <div className="p-6 pb-10">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-serif text-foreground">退出选项</h2>
                  <button onClick={() => setShowSignOutConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm font-serif text-muted-foreground mb-4">
                  请选择退出方式
                </p>

                <div className="space-y-3">

                  {/* 选项1：仅退出 - 灰色背景 */}
                  <button
                    onClick={async () => {
                      await signOut()
                      setShowSignOutConfirm(false)
                      toast.success('✅ 已退出登录')
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <div className="text-sm font-serif text-foreground">仅退出登录</div>
                        <div className="text-[10px] text-muted-foreground font-serif">数据保留在本地</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* 选项2：退出并清空 - 红色底红色框 */}
                  <button
                    onClick={() => {
                      setShowSignOutConfirm(false)
                      onShowClearDataConfirm?.() // 调用父组件显示清空数据弹窗
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-all border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div className="text-left">
                        <div className="text-sm font-serif text-red-700">退出并清空数据</div>
                        <div className="text-[10px] text-red-600 font-serif">彻底删除所有本地数据</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 修改密码弹窗 - 居中显示 */}
      {showChangePassword && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={() => {
              setShowChangePassword(false)
              setPasswordError('')
              setOldPassword('')
              setNewPassword('')
              setConfirmPassword('')
            }}
          />

          {/* Modal - 居中显示 */}
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 pointer-events-none">
            <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="p-6 pb-10">
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
                    <label className="block text-sm font-medium font-serif text-foreground mb-2">
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
                    <label className="block text-sm font-medium font-serif text-foreground mb-2">
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
                    <label className="block text-sm font-medium font-serif text-foreground mb-2">
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
                    <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {passwordError}
                    </div>
                  )}

                  {/* 密码强度提示 */}
                  {newPassword && (
                    <div className="text-xs font-serif text-muted-foreground space-y-1">
                      <p className="font-serif">密码要求：</p>
                      <ul className="pl-4 space-y-1">
                        <li className={`font-serif ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                          {newPassword.length >= 8 ? '✓' : '✗'} 至少8位字符
                        </li>
                        <li className={`font-serif ${/[a-zA-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                          {/[a-zA-Z]/.test(newPassword) ? '✓' : '✗'} 包含字母
                        </li>
                        <li className={`font-serif ${/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
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
                      className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        // 清空之前的错误
                        setPasswordError('')
                        console.log('开始修改密码...')

                        // 验证
                        if (!oldPassword || !newPassword || !confirmPassword) {
                          console.log('验证失败：未填写所有字段')
                          setPasswordError('请填写所有字段')
                          return
                        }

                        if (oldPassword === newPassword) {
                          console.log('验证失败：新旧密码相同')
                          setPasswordError('新密码不能与原密码相同')
                          return
                        }

                        if (newPassword !== confirmPassword) {
                          console.log('验证失败：密码不一致')
                          setPasswordError('两次输入的新密码不一致')
                          return
                        }

                        if (newPassword.length < 8) {
                          console.log('验证失败：密码长度不足')
                          setPasswordError('密码至少需要8位字符')
                          return
                        }

                        if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
                          console.log('验证失败：密码格式错误')
                          setPasswordError('密码必须包含字母和数字')
                          return
                        }

                        console.log('验证通过，开始调用 Supabase API...')
                        // 开始修改密码
                        setIsChangingPassword(true)

                        const startTime = Date.now()

                        try {
                          // 步骤1: 先验证原密码是否正确
                          console.log('1. 验证原密码...')
                          console.log('   用户邮箱:', user?.email)

                          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                            email: user?.email || '',
                            password: oldPassword
                          })

                          console.log('   验证结果:', signInError ? '失败' : '成功')

                          if (signInError) {
                            console.error('原密码验证失败:', signInError)
                            const translatedError = translateErrorMessage(signInError.message)
                            console.log('   翻译后的错误:', translatedError)
                            // 如果是密码错误，显示更友好的提示
                            if (signInError.message.includes('Invalid login credentials')) {
                              console.log('   显示错误：当前密码输入错误')
                              setPasswordError('当前密码输入错误，请重新输入')
                            } else {
                              console.log('   显示错误:', translatedError)
                              setPasswordError(translatedError)
                            }
                            setIsChangingPassword(false)
                            return
                          }

                          console.log('2. 原密码验证通过，开始更新密码...')
                          toast.loading('正在修改密码，请稍候...', { id: 'changing-password' })

                          // 步骤2: 更新密码
                          console.log('3. 调用 supabase.auth.updateUser...')

                          // 添加超时提示
                          const timeoutId = setTimeout(() => {
                            console.log('⏳ 修改密码请求进行中，请稍候...')
                          }, 3000)

                          const result = await supabase.auth.updateUser({
                            password: newPassword
                          })

                          clearTimeout(timeoutId)

                          clearTimeout(timeoutId)

                          const elapsed = Date.now() - startTime
                          console.log(`4. API 响应收到（耗时: ${elapsed/1000}秒）`)
                          console.log('   是否有错误:', result.error ? '是' : '否')
                          if (result.error) console.log('   错误信息:', result.error)

                          if (result.error) {
                            console.error('修改密码失败:', result.error)
                            const translatedError = translateErrorMessage(result.error.message)
                            console.log('   翻译后的错误:', translatedError)
                            console.log('   显示错误提示')
                            setPasswordError(translatedError)
                            toast.dismiss('changing-password')
                            toast.error('❌ ' + translatedError)
                          } else {
                            console.log('✅ 修改密码成功！')
                            console.log('   显示成功提示')
                            toast.dismiss('changing-password')
                            toast.success('✅ 密码修改成功，请使用新密码登录')

                            // 延迟关闭弹窗，让用户看到成功提示
                            setTimeout(() => {
                              console.log('   关闭修改密码弹窗')
                              setShowChangePassword(false)
                              setOldPassword('')
                              setNewPassword('')
                              setConfirmPassword('')
                            }, 1500)
                          }
                        } catch (err: any) {
                          const elapsedCatch = Date.now() - startTime
                          console.error(`❌ 修改密码异常（${elapsedCatch/1000}秒）:`, err)
                          console.error('   错误详情:', err.message)
                          const translatedError = translateErrorMessage(err.message)
                          console.log('   翻译后的错误:', translatedError)
                          console.log('   显示错误提示')
                          setPasswordError(translatedError)
                          toast.dismiss('changing-password')
                          toast.error('❌ ' + translatedError)
                        } finally {
                          console.log('6. 结束修改密码流程，重置loading状态')
                          setIsChangingPassword(false)
                        }
                      }}
                      disabled={isChangingPassword}
                      className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
                    >
                      {isChangingPassword ? '修改中...' : '确认修改'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 设备冲突确认弹窗 - 居中显示 */}
      {deviceConflict && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={cancelDeviceConflict} />

          {/* Modal - 居中显示 */}
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 pointer-events-none">
            <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto">
              <div className="p-6 pb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-serif text-foreground">⚠️ 设备登录提醒</h2>
                  <button onClick={cancelDeviceConflict} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                    您的账号已在以下设备登录：
                  </p>

                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium font-serif text-amber-800">{deviceConflict.oldDevice.name}</p>
                        <p className="text-xs font-serif text-amber-600">
                          {new Date(deviceConflict.oldDevice.last_seen).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                    在新设备登录后，以上设备将被退出登录。
                  </p>

                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                    <p className="text-xs font-serif text-blue-700 text-center leading-relaxed">
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
                      className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        await confirmDeviceConflict()
                        toast.success('✅ 登录成功')
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-serif"
                    >
                      继续登录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
