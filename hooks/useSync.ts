"use client"

import { useState, useEffect } from 'react'
import { useLocalStorage } from 'react-use'
import { supabase, TABLES } from '@/lib/supabase'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
type ConflictStrategy = 'remote' | 'local' | 'merge'

export function useSync(
  user: any,
  localData: {
    records: PracticeRecord[]
    options: PracticeOption[]
    profile: UserProfile
  },
  onSyncComplete: (data: any) => void,
  onConflictDetected?: (localCount: number, remoteCount: number) => void
) {
  console.log('🔍 [useSync] Hook 被调用了')
  console.log('   user:', user)
  console.log('   localData.records.length:', localData?.records?.length)

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // 持久化状态（存储到 localStorage）
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<number | null>('last_sync_time', null)
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
    console.log('🔍 [useEffect] 触发', {
      hasUser: !!user,
      userId: user?.id,
      localDataLength: localData.records.length
    })

    if (user && localData.records.length >= 0) {
      console.log('✅ [useEffect] 条件满足，准备调用 autoSync')
      // 用户登录后，立即启动自动同步
      autoSync()
    } else {
      console.log('⏸️ [useEffect] 条件不满足，跳过自动同步')
    }
  }, [user]) // 只监听 user 变化

  // ==================== 自动同步函数 ====================
  const autoSync = async () => {
    console.log('🚨🚨🚨 [autoSync] 函数被调用了！🚨🚨🚨')
    console.log('='.repeat(50))
    console.log('🔄 [autoSync] 函数开始执行')
    console.log('='.repeat(50))

    if (!user) {
      console.log('❌ [autoSync] 用户未登录，退出')
      return
    }

    console.log('✅ [autoSync] 用户已登录，开始同步')
    console.log('   user_id:', user.id)
    console.log('   localData.records.length:', localData.records.length)

    console.log('⏳ [autoSync] 设置状态为 syncing...')
    setSyncStatus('syncing')
    console.log('✅ [autoSync] 状态已设置为 syncing')

    console.log('📝 [autoSync] 添加日志...')
    addLog('启动自动同步', 'success')
    console.log('✅ [autoSync] 日志已添加')

    try {
      console.log('📡 [autoSync] 开始下载云端数据...')
      // 1. 下载云端数据
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      console.log('✅ [autoSync] 云端数据下载成功')
      console.log('   remoteData.records.length:', remoteData.records?.length)

      const localCount = localData.records.length
      const remoteCount = remoteData.records.length

      console.log(`📊 [autoSync] 数据对比：本地${localCount}条，云端${remoteCount}条`)

      // 2. 智能同步策略
      if (remoteCount > 0 && localCount > 0) {
        // 两边都有数据，检查是否有差异需要同步
        const localIds = new Set(localData.records.map(r => r.id))
        const remoteIds = new Set(remoteData.records.map(r => r.id))

        const localOnly = localData.records.filter(r => !remoteIds.has(r.id))
        const remoteOnly = remoteData.records.filter(r => !localIds.has(r.id))

        if (localOnly.length === 0 && remoteOnly.length === 0) {
          // 没有差异，数据已一致
          console.log('✅ [autoSync] 数据已一致，无需同步')
          setSyncStatus('success')
          return
        }

        // 有差异：本地有新增数据 → 上传到云端
        if (localOnly.length > 0 && remoteOnly.length === 0) {
          console.log(`📤 [autoSync] 本地有${localOnly.length}条新数据，上传到云端`)
          addLog(`上传本地新增：${localOnly.length}条记录`, 'success')
          const success = await uploadLocalData(user.id, localData, user)
          if (success) {
            setSyncStatus('success')
            setLastSyncStatus('success')
            setLastSyncTime(Date.now())
          } else {
            setSyncStatus('error')
            setLastSyncStatus('error')
          }
          return
        }

        // 有差异：云端有新数据 → 使用云端数据
        if (remoteOnly.length > 0 && localOnly.length === 0) {
          console.log(`📥 [autoSync] 云端有${remoteOnly.length}条新数据，下载到本地`)
          addLog(`下载云端新增：${remoteOnly.length}条记录`, 'success')
          onSyncComplete({
            records: remoteData.records,
            options: remoteData.options || [],
            profile: remoteData.profile || { name: '阿斯汤加习练者', signature: '', avatar: null, is_pro: false }
          })
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
          return
        }

        // 两边都有新数据 → 真正的冲突，需要用户选择
        console.log(`⚠️ [autoSync] 双方都有新数据：本地${localOnly.length}条，云端${remoteOnly.length}条`)
        addLog(`检测到冲突：本地${localOnly.length}条新，云端${remoteOnly.length}条新`, 'success')
        if (onConflictDetected) {
          onConflictDetected(localCount, remoteCount)
        }
        setSyncStatus('idle')
        return
      }

      // 3. 只有云端有数据 → 使用云端
      if (remoteCount > 0 && localCount === 0) {
        addLog(`使用云端数据：${remoteCount}条记录`, 'success')
        onSyncComplete({
          records: remoteData.records,
          options: remoteData.options || [],
          profile: remoteData.profile || { name: '阿斯汤加习练者', signature: '', avatar: null, is_pro: false }
        })
        setSyncStatus('success')
        setLastSyncStatus('success')
        setLastSyncTime(Date.now())
        return
      }

      // 4. 只有本地有数据 → 上传到云端
      if (localCount > 0 && remoteCount === 0) {
        addLog(`上传本地数据：${localCount}条记录`, 'success')
        const success = await uploadLocalData(user.id, localData, user)
        if (success) {
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
        } else {
          throw new Error('上传本地数据失败')
        }
        return
      }

      // 5. 两边都没有数据 → 无需操作
      addLog('两端都没有数据', 'success')
      setSyncStatus('success')
      setLastSyncStatus('success')
      setLastSyncTime(Date.now()) // ⭐ 更新同步时间

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
    setLastSyncTime(Date.now())
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

      // 修复：解析 photos JSON 字符串为数组
      const records = (recordsRes.data || []).map(r => ({
        ...r,
        photos: r.photos ? (typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos) : []
      }))

      // 调试：打印云端选项数据
      console.log('📦 [downloadRemoteData] 云端选项数据:', optionsRes.data)
      console.log('   选项数量:', optionsRes.data?.length)

      // 修复：过滤掉无效的选项（id 必须存在）
      const options = (optionsRes.data || []).filter(o => {
        const isValid = o.id && (o.label || o.notes)
        if (!isValid) {
          console.log('   ⚠️ 过滤掉无效选项:', o)
        }
        return isValid
      })

      console.log('   ✅ 有效选项数量:', options.length)

      return {
        records,
        options,
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
      notes: r.notes || '',
      photos: null, // ⚠️ 照片暂不同步
      breakthrough: r.breakthrough || null,
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
    },
    user: any // ⭐ 新增：user 对象，用于获取邮箱
  ) => {
    setSyncStatus('syncing')
    const failedIds: string[] = []

    try {
      // 确保数据存在，提供默认值
      const records = localData.records || []
      const options = localData.options || []
      const profile = localData.profile || {
        name: '阿斯汤加习练者',
        signature: '练习、练习，一切随之而来。',
        avatar: null,
        is_pro: false
      }

      // 1. 上传用户资料（包含邮箱）

      const { error: profileError } = await supabase
        .from(TABLES.USER_PROFILES)
        .upsert({
          user_id: userId,
          name: profile.name,
          signature: profile.signature || '',
          avatar: null, // ⚠️ 头像只存本地，不上传云端（Base64太大）
          is_pro: profile.is_pro || false,
          email: user?.email || null
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        console.error('❌ 上传用户资料失败:', profileError)
        console.error('   错误详情:', JSON.stringify(profileError, null, 2))
        console.error('   user_id:', userId)
        console.error('   email:', user?.email)
        addLog('上传用户资料', 'error', undefined, profileError.message)
        throw profileError
      }
      addLog('上传用户资料', 'success')

      // 2. 批量上传练习记录（使用 upsert）
      if (records.length > 0) {
        const recordsToUpload = records.map(r => ({
          id: r.id,
          user_id: userId,
          date: r.date,
          type: r.type,
          duration: r.duration,
          notes: r.notes || '',
          photos: r.photos && r.photos.length > 0 ? JSON.stringify(r.photos) : null, // ⚠️ 转换为 JSON 字符串
          breakthrough: r.breakthrough || null,
        }))

        const { error: recordsError } = await supabase
          .from(TABLES.PRACTICE_RECORDS)
          .upsert(recordsToUpload, {
            onConflict: 'id'
          })

        if (recordsError) {
          // 记录失败的记录ID
          records.forEach(r => failedIds.push(r.id))
          addLog('批量上传记录', 'error', undefined, recordsError.message)
        } else {
          addLog(`批量上传${records.length}条记录`, 'success')
        }
      }

      // 3. 批量上传练习选项（包括默认和自定义，全部同步）
      if (options.length > 0) {
        const optionsToUpload = options.map(o => ({
          id: o.id,
          user_id: userId,
          label: o.label || '',
          notes: o.notes || null,
          is_custom: o.is_custom || false,
        }))

        const { error: optionsError } = await supabase
          .from(TABLES.PRACTICE_OPTIONS)
          .upsert(optionsToUpload, {
            onConflict: 'id'
          })

        if (optionsError) {
          console.error('❌ 批量上传选项失败:', optionsError)
          console.error('   错误详情:', JSON.stringify(optionsError, null, 2))
          console.error('   上传的数据:', JSON.stringify(optionsToUpload, null, 2))
          addLog('批量上传选项', 'error', undefined, optionsError.message)
        } else {
          addLog(`批量上传${options.length}个选项`, 'success')
        }
      }

      // 更新失败列表
      setFailedSyncIds(failedIds)
      setLastSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setLastSyncTime(Date.now())

      return failedIds.length === 0
    } catch (error: any) {
      console.error('Upload failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message)
      console.error('Error name:', error?.name)
      addLog('同步失败', 'error', undefined, error?.message || JSON.stringify(error))
      setSyncStatus('error')
      setLastSyncStatus('error')
      return false
    }
  }

  // ==================== 处理冲突策略 ====================
  const resolveConflict = async (strategy: ConflictStrategy) => {
    if (!user) return

    setSyncStatus('syncing')

    try {
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      switch (strategy) {
        case 'remote':
          // 使用云端数据
          addLog('使用云端数据', 'success')
          onSyncComplete({
            records: remoteData.records,
            options: remoteData.options || [],
            profile: remoteData.profile || { name: '阿斯汤加习练者', signature: '', avatar: null, is_pro: false }
          })
          break

        case 'local':
          // 使用本地数据，覆盖云端
          addLog('使用本地数据，覆盖云端', 'success')

          // 1. 先删除云端所有数据
          const { error: deleteError } = await supabase
            .from(TABLES.PRACTICE_RECORDS)
            .delete()
            .eq('user_id', user.id)

          if (deleteError) {
            throw new Error(`删除云端数据失败: ${deleteError.message}`)
          }
          addLog('云端数据已清空', 'success')

          // 2. 上传本地数据
          const success = await uploadLocalData(user.id, localData, user)
          if (!success) {
            throw new Error('上传本地数据失败')
          }
          break

        case 'merge':
          // 智能合并
          addLog('智能合并', 'success')
          const localIds = new Set(localData.records.map(r => r.id))
          const remoteIds = new Set(remoteData.records.map(r => r.id))

          const localOnly = localData.records.filter(r => !remoteIds.has(r.id))
          const remoteOnly = remoteData.records.filter(r => !localIds.has(r.id))

          await smartMerge(localOnly, remoteOnly, remoteData)
          break
      }

      setSyncStatus('success')
      setLastSyncStatus('success')
      setLastSyncTime(Date.now())

    } catch (error: any) {
      console.error('Resolve conflict failed:', error)
      addLog('处理冲突失败', 'error', undefined, error.message)
      setSyncStatus('error')
      setLastSyncStatus('error')
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
    resolveConflict, // ⭐ 新增：处理数据冲突
  }
}
