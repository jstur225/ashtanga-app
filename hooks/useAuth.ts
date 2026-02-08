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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    // Profile 会由数据库触发器自动创建，无需客户端处理

    return data
  }

  // ==================== 登录（限制1台设备） ====================
  const signIn = async (email: string, password: string) => {
    // 1. Supabase 验证密码
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

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

      const confirmed = confirm(
        `⚠️ 设备登录提醒\n\n` +
        `您的账号已在以下设备登录：\n` +
        `• ${oldDevice.name} (${new Date(oldDevice.last_seen).toLocaleDateString('zh-CN')})\n\n` +
        `在新设备登录后，以上设备将被退出登录。\n\n` +
        `💡 建议先在旧设备上导出数据（设置 → 数据管理 → 导出数据）\n\n` +
        `是否继续登录？`
      )

      if (!confirmed) {
        await supabase.auth.signOut()
        throw new Error('登录已取消')
      }
    }

    // 5. 清空旧设备，只保留当前设备
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
  }

  return {
    user,
    loading,
    currentDevice,
    signUp,
    signIn,
    signOut,
  }
}
