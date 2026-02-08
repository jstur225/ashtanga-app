"use client"

import { useState, useEffect } from 'react'
import { useLocalStorage } from 'react-use'
import { supabase, TABLES } from '@/lib/supabase'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export function useSync(
  user: any,
  localData: {
    records: PracticeRecord[]
    options: PracticeOption[]
    profile: UserProfile
  },
  onSyncComplete: (data: any) => void
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // 持久化状态（存储到 localStorage）
  const [lastSyncStatus, setLastSyncStatus] = useLocalStorage<SyncStatus>('last_sync_status', 'idle')
  const [failedSyncIds, setFailedSyncIds] = useLocalStorage<string[]>('failed_sync_ids', [])
  const [syncLogs, setSyncLogs] = useLocalStorage<Array<{
    timestamp: string
    action: string
    status: 'success' | 'error'
    recordId?: string
    error?: string
  }>>('sync_logs', [])

  // ==================== 应用级自动同步 ====================
  useEffect(() => {
    if (user && localData.records.length > 0) {
      // 用户登录后，立即启动自动同步
      autoSync()
    }
  }, [user]) // 只监听 user 变化

  // ==================== 自动同步函数 ====================
  const autoSync = async () => {
    if (!user) return

    setSyncStatus('syncing')
    addLog('启动自动同步', 'success')

    try {
      // 1. 下载云端数据
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      // 2. 对比本地和云端数据
      const localIds = new Set(localData.records.map(r => r.id))
      const remoteIds = new Set(remoteData.records.map(r => r.id))

      const localOnly = localData.records.filter(r => !remoteIds.has(r.id))
      const remoteOnly = remoteData.records.filter(r => !localIds.has(r.id))

      // 3. 检查是否需要同步
      if (localOnly.length === 0 && remoteOnly.length === 0) {
        // 数据一致，无需同步
        setSyncStatus('success')
        setLastSyncStatus('success')
        setLastSyncTime(new Date())
        addLog('数据已是最新', 'success')
        return
      }

      // 4. 有数据差异，自动合并
      addLog(`检测到差异：本地${localOnly.length}条，云端${remoteOnly.length}条`, 'success')
      await smartMerge(localOnly, remoteOnly, remoteData)

    } catch (error: any) {
      console.error('Auto sync failed:', error)
      addLog('自动同步失败', 'error', undefined, error.message)
      setSyncStatus('error')
      setLastSyncStatus('error')
    }
  }

  // ==================== 智能合并 ====================
  const smartMerge = async (
    localOnly: PracticeRecord[],
    remoteOnly: PracticeRecord[],
    remoteData: any
  ) => {
    if (remoteOnly.length > 0) {
      // 云端有新数据，下载到本地
      addLog(`下载${remoteOnly.length}条云端记录`, 'success')
      onSyncComplete({ records: [...localData.records, ...remoteOnly], options: remoteData.options || [] })
    }

    if (localOnly.length > 0) {
      // 本地有新数据，上传到云端
      addLog(`上传${localOnly.length}条本地记录`, 'success')
      const success = await uploadLocalRecords(user.id, localOnly)
      if (!success) {
        throw new Error('上传本地记录失败')
      }
    }

    setSyncStatus('success')
    setLastSyncStatus('success')
    setLastSyncTime(new Date())
  }

  // ==================== 下载云端数据 ====================
  const downloadRemoteData = async (userId: string) => {
    try {
      const [recordsRes, optionsRes, profileRes] = await Promise.all([
        supabase.from(TABLES.PRACTICE_RECORDS).select('*').eq('user_id', userId).is('deleted_at', null),
        supabase.from(TABLES.PRACTICE_OPTIONS).select('*').eq('user_id', userId),
        supabase.from(TABLES.USER_PROFILES).select('*').eq('user_id', userId).maybeSingle(), // 改为 maybeSingle
      ])

      if (recordsRes.error) throw recordsRes.error
      if (optionsRes.error) throw optionsRes.error
      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error // PGRST116 表示没有找到，可以忽略

      return {
        records: recordsRes.data || [],
        options: optionsRes.data || [],
        profile: profileRes.data || { name: '阿斯汤加习练者', signature: '', avatar: null, is_pro: false }, // 如果没有 profile，使用默认值
      }
    } catch (error: any) {
      addLog('下载数据失败', 'error', undefined, error.message)
      throw error
    }
  }

  // ==================== 上传本地记录 ====================
  const uploadLocalRecords = async (userId: string, records: PracticeRecord[]) => {
    if (records.length === 0) return true

    const failedIds: string[] = []

    const recordsToUpload = records.map(r => ({
      id: crypto.randomUUID(), // ⚠️ 生成新的 UUID，替换本地数字 ID
      user_id: userId,
      date: r.date,
      type: r.type,
      duration: r.duration,
      notes: r.notes,
      photos: [], // ⚠️ 强制为空，暂不同步照片
      breakthrough: r.breakthrough,
      deleted_at: null, // ⚠️ 添加 deleted_at 字段
    }))

    const { error } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .upsert(recordsToUpload, { onConflict: 'id' })

    if (error) {
      records.forEach(r => failedIds.push(r.id))
      addLog('批量上传失败', 'error', undefined, error.message)
    } else {
      addLog(`批量上传${records.length}条记录成功`, 'success')
    }

    if (failedIds.length > 0) {
      setFailedSyncIds(failedIds)
      setLastSyncStatus('error')
      return false
    } else {
      setFailedSyncIds([])
      setLastSyncStatus('success')
      return true
    }
  }

  // ==================== 上传本地数据到云端（完整版） ====================
  const uploadLocalData = async (
    userId: string,
    localData: {
      records: PracticeRecord[]
      options: PracticeOption[]
      profile: UserProfile
    }
  ) => {
    setSyncStatus('syncing')
    const failedIds: string[] = []

    try {
      // 1. 上传用户资料（不上传 email 和 avatar）
      const { error: profileError } = await supabase
        .from(TABLES.USER_PROFILES)
        .upsert({
          user_id: userId,
          name: localData.profile.name,
          signature: localData.profile.signature,
          avatar: null, // ⚠️ 头像只存本地，不上传云端
          is_pro: localData.profile.is_pro,
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        addLog('上传用户资料', 'error', undefined, profileError.message)
        throw profileError
      }
      addLog('上传用户资料', 'success')

      // 2. 批量上传练习记录（使用 upsert，强制忽略 photos）
      if (localData.records.length > 0) {
        const recordsToUpload = localData.records.map(r => ({
          id: r.id,
          user_id: userId,
          date: r.date,
          type: r.type,
          duration: r.duration,
          notes: r.notes,
          photos: [], // ⚠️ 强制为空，暂不同步照片
          breakthrough: r.breakthrough,
        }))

        const { error: recordsError } = await supabase
          .from(TABLES.PRACTICE_RECORDS)
          .upsert(recordsToUpload, {
            onConflict: 'id'
          })

        if (recordsError) {
          // 记录失败的记录ID
          localData.records.forEach(r => failedIds.push(r.id))
          addLog('批量上传记录', 'error', undefined, recordsError.message)
        } else {
          addLog(`批量上传${localData.records.length}条记录`, 'success')
        }
      }

      // 3. 批量上传练习选项（包括默认和自定义，全部同步）
      if (localData.options.length > 0) {
        const optionsToUpload = localData.options.map(o => ({
          id: o.id,
          user_id: userId,
          label: o.label,
          label_zh: o.label_zh,
          notes: o.notes,
          is_custom: o.is_custom,
        }))

        const { error: optionsError } = await supabase
          .from(TABLES.PRACTICE_OPTIONS)
          .upsert(optionsToUpload, {
            onConflict: 'id'
          })

        if (optionsError) {
          addLog('批量上传选项', 'error', undefined, optionsError.message)
        } else {
          addLog(`批量上传${localData.options.length}个选项`, 'success')
        }
      }

      // 更新失败列表
      setFailedSyncIds(failedIds)
      setLastSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setLastSyncTime(new Date())

      return failedIds.length === 0
    } catch (error: any) {
      console.error('Upload failed:', error)
      addLog('同步失败', 'error', undefined, error.message)
      setSyncStatus('error')
      setLastSyncStatus('error')
      return false
    }
  }

  // ==================== 添加日志（限制大小） ====================
  const addLog = (action: string, status: 'success' | 'error', recordId?: string, error?: string) => {
    // 限制错误消息长度（200字符）
    const truncatedError = error ? error.slice(0, 200) + (error.length > 200 ? '...' : '') : undefined

    const log = {
      timestamp: new Date().toISOString(),
      action,
      status,
      recordId,
      error: truncatedError,
    }

    const newLogs = [log, ...syncLogs].slice(0, 50) // 减少到50条

    // 检查大小（不超过 100KB）
    const logsSize = new Blob([JSON.stringify(newLogs)]).size
    if (logsSize > 100 * 1024) {
      // 如果还是太大，只保留最近20条
      setSyncLogs(newLogs.slice(0, 20))
    } else {
      setSyncLogs(newLogs)
    }
  }

  return {
    syncStatus,
    lastSyncTime,
    lastSyncStatus,
    failedSyncIds,
    setFailedSyncIds, // ⭐ 新增：用于重置失败列表
    setLastSyncStatus, // ⭐ 新增：用于重置同步状态
    syncLogs,
    autoSync, // 手动触发同步
    uploadLocalData, // 手动上传本地数据
  }
}
