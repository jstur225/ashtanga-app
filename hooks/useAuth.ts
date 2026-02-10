"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ==================== 设备管理工具函数 ====================

// 设备ID生成（每个浏览器/设备唯一）
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id')

  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('device_id', deviceId)
  }

  return deviceId
}

// 获取设备名称（根据UserAgent判断设备类型）
const getDeviceName = (): string => {
  const ua = navigator.userAgent

  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Win/.test(ua)) return 'Windows'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux'

  return 'Unknown Device'
}

// ==================== useAuth Hook ====================

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDevice, setCurrentDevice] = useState<{
    id: string
    name: string
    last_seen: string
  } | null>(null)
  const [deviceConflict, setDeviceConflict] = useState<{
    oldDevice: { id: string; name: string; last_seen: string }
    newDevice: { id: string; name: string }
  } | null>(null)

  // ==================== 初始化：检查登录状态 ====================
  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        loadDeviceInfo(session.user.id)
      }
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadDeviceInfo(session.user.id)
      } else {
        setCurrentDevice(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ==================== 加载当前设备信息 ====================
  const loadDeviceInfo = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('logged_in_devices')
      .eq('user_id', userId)
      .single()

    const devices = data?.logged_in_devices || []
    const deviceId = getOrCreateDeviceId()

    const device = devices.find((d: any) => d.id === deviceId)
    if (device) {
      setCurrentDevice(device)
    }
  }

  // ==================== 注册 ====================
  const signUp = async (email: string, password: string) => {
    console.log('[useAuth] 开始注册...', { email })

    // 先检测网络连接
    try {
      const testResponse = await fetch('https://xojbgxvwgvjanxsowqik.supabase.co', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      })
      console.log('[useAuth] 网络连接检测: 成功')
    } catch (networkError: any) {
      console.error('[useAuth] ❌ 网络连接检测失败:', networkError.message)
      console.error('[useAuth] 可能的原因:')
      console.error('  1. 网络连接问题（VPN/防火墙/公司网络限制）')
      console.error('  2. DNS 解析失败')
      console.error('  3. Supabase 服务暂时不可用')
      throw new Error('无法连接到 Supabase 服务器，请检查网络连接或稍后重试')
    }

    try {
      // 添加超时控制（60秒）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('注册请求超时，请稍后重试')), 60000)
      })

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
      })

      console.log('[useAuth] 等待 Supabase 响应...')

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any

      console.log('[useAuth] 收到响应:', { data, error })

      if (error) {
        console.error('[useAuth] 注册失败:', error)
        console.error('[useAuth] 错误详情:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        })

        // 提供更详细的错误信息
        if (error.message?.includes('User already registered')) {
          throw new Error('该邮箱已注册，请直接登录')
        }

        // 网络连接错误
        if (error.message?.includes('Failed to fetch') ||
            error.message?.includes('ERR_CONNECTION_CLOSED') ||
            error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
            error.status === 0) {
          console.error('[useAuth] ❌ 网络连接错误')
          throw new Error('网络连接失败，请检查：\n1. 是否能正常访问其他网站\n2. 是否开启了 VPN/代理（尝试关闭）\n3. 是否在公司/学校网络（可能有限制）\n4. 防火墙是否拦截了请求\n\n建议稍后重试，或使用手机热点测试')
        }

        // 如果是 504 或超时错误，可能已经注册成功
        if (error.message?.includes('504') ||
            error.message?.includes('Gateway Timeout') ||
            error.message?.includes('超时') ||
            error.status === 504) {
          console.log('[useAuth] ⚠️ 注册超时，但可能已成功，尝试登录验证...')
          throw { ...error, isTimeout: true }
        }

        throw error
      }

      console.log('[useAuth] 注册成功:', data)
      console.log('[useAuth] 用户ID:', data.user?.id)

      // Profile 会由数据库触发器自动创建，无需客户端处理

      // ⭐ 立即更新用户状态（不等待 onAuthStateChange 事件）
      if (data.user) {
        console.log('[useAuth] 立即更新用户状态')
        setUser(data.user)

        // 如果有 session，也加载设备信息
        if (data.session) {
          await loadDeviceInfo(data.user.id)
        }
      }

      return data
    } catch (error: any) {
      console.error('[useAuth] 注册异常:', error)
      console.error('[useAuth] 错误详情:', {
        message: error.message,
        status: error.status,
        name: error.name
      })

      // 提供友好的错误提示
      if (error.message?.includes('超时')) {
        throw new Error('注册请求超时，可能是网络问题或 Supabase 服务繁忙。建议：1. 检查网络连接 2. 等待几分钟后重试 3. 或稍后直接尝试登录')
      }

      throw error
    }
  }

  // ==================== 登录（限制1台设备） ====================
  const signIn = async (email: string, password: string) => {
    // 1. Supabase 验证密码
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // ⭐ 立即更新用户状态
    console.log('[useAuth] 登录成功，立即更新用户状态')
    if (data.user) {
      setUser(data.user)
    }

    // 2. 获取当前设备ID和名称
    const deviceId = getOrCreateDeviceId()
    const deviceName = getDeviceName()

    // 3. 查询已登录设备
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('logged_in_devices')
      .eq('user_id', data.user.id)
      .single()

    const devices = profile?.logged_in_devices || []
    const existingDevice = devices.find((d: any) => d.id === deviceId)

    if (existingDevice) {
      // 当前设备已登录，更新时间
      const updatedDevices = devices.map((d: any) =>
        d.id === deviceId
          ? { ...d, last_seen: new Date().toISOString() }
          : d
      )

      await supabase
        .from('user_profiles')
        .update({ logged_in_devices: updatedDevices })
        .eq('user_id', data.user.id)

      setCurrentDevice(existingDevice)
      return data
    }

    // 4. 新设备登录，检查是否有旧设备
    if (devices.length > 0) {
      const oldDevice = devices[0] // 只有1台设备

      // 设置设备冲突状态，让调用方显示自定义弹窗
      setDeviceConflict({
        oldDevice,
        newDevice: {
          id: deviceId,
          name: deviceName
        }
      })

      // 不自动更新设备列表，等待用户确认
      // 返回登录成功的数据，但不标记设备已更新
      setCurrentDevice(null) // 还没有更新设备
      return data
    }

    // 5. 没有旧设备，直接更新
    const newDevice = {
      id: deviceId,
      name: deviceName,
      last_seen: new Date().toISOString(),
    }

    await supabase
      .from('user_profiles')
      .update({ logged_in_devices: [newDevice] }) // 只保留新设备
      .eq('user_id', data.user.id)

    setCurrentDevice(newDevice)
    return data
  }

  // ==================== 退出登录 ====================
  const signOut = async () => {
    if (!user) return

    await supabase
      .from('user_profiles')
      .update({ logged_in_devices: [] }) // 清空设备列表
      .eq('user_id', user.id)

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    setCurrentDevice(null)
    setDeviceConflict(null)
  }

  // ==================== 确认设备冲突，继续登录 ====================
  const confirmDeviceConflict = async () => {
    if (!deviceConflict || !user) return

    const { newDevice } = deviceConflict

    // 清空旧设备，只保留当前设备
    const updatedDevice = {
      id: newDevice.id,
      name: newDevice.name,
      last_seen: new Date().toISOString(),
    }

    await supabase
      .from('user_profiles')
      .update({ logged_in_devices: [updatedDevice] })
      .eq('user_id', user.id)

    setCurrentDevice(updatedDevice)
    setDeviceConflict(null)
  }

  // ==================== 取消设备冲突，保持退出状态 ====================
  const cancelDeviceConflict = () => {
    setDeviceConflict(null)
  }

  return {
    user,
    loading,
    currentDevice,
    deviceConflict,
    signUp,
    signIn,
    signOut,
    confirmDeviceConflict,
    cancelDeviceConflict,
  }
}
