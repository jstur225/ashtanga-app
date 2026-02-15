"use client"

import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from 'react-use'
import { supabase, TABLES } from '@/lib/supabase'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
type ConflictStrategy = 'remote' | 'local' | 'merge'

// ⭐ 同步限制配置（硬上限1000条，防止攻击）
const MAX_SYNC_RECORDS = 1000

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
  // 移除这些日志，它们在每次渲染时都会输出
  // console.error('🔍 [useSync] Hook 被调用了')
  // console.error('   user:', user)
  // console.error('   localData.records.length:', localData?.records?.length)

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // 防止重复调用的 ref
  const isSyncingRef = useRef(false)

  // ⭐ 修复闭包陷阱：使用 ref 保存最新的 localData
  const localDataRef = useRef(localData)
  localDataRef.current = localData

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

  // ⭐ 同步统计信息（用于UI显示限制提示）
  const [syncStats, setSyncStats] = useState({
    totalLocalRecords: 0,
    syncedRecords: 0,
    maxSyncRecords: MAX_SYNC_RECORDS,
    localOnlyCount: 0, // 仅本地保留的记录数
    hasLimitWarning: false
  })

  // ==================== 自动计算本地统计（当 localData 变化时）====================
  // ⚠️ 注意：这里只更新本地记录数，syncedRecords 只在同步成功时更新
  useEffect(() => {
    const localCount = localData.records.length
    const sortedRecords = [...localData.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
    const localOnlyCount = localCount - recordsToSync.length

    console.error('📊 [useSync] 计算本地统计:', {
      localCount,
      recordsToSyncLength: recordsToSync.length,
      localOnlyCount,
      hasLimitWarning: localOnlyCount > 0
    })

    setSyncStats(prev => ({
      ...prev,
      totalLocalRecords: localCount,
      maxSyncRecords: MAX_SYNC_RECORDS,
      localOnlyCount,
      hasLimitWarning: localOnlyCount > 0
      // ⭐ syncedRecords 保持不变，只在同步成功时更新
    }))
  }, [localData.records.length])

  // ==================== 应用级自动同步 ====================
  // ⭐ 使用 ref 记录上一次的 user.id，只在从未登录变为登录时触发
  const prevUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const currentUserId = user?.id || null
    const hasUserChanged = prevUserIdRef.current !== currentUserId
    const isNewLogin = !prevUserIdRef.current && currentUserId

    console.error('🔍 [useEffect] 触发', {
      hasUser: !!user,
      userId: currentUserId,
      prevUserId: prevUserIdRef.current,
      localDataLength: localData.records.length,
      isSyncing: isSyncingRef.current,
      isNewLogin
    })

    // 更新 ref 为当前值
    prevUserIdRef.current = currentUserId

    // 只在新登录时（从 null 变为有值）才触发自动同步
    if (!isNewLogin) {
      console.error('⏸️ [useEffect] 不是新登录，跳过自动同步')
      return
    }

    // 如果正在同步中，跳过
    if (isSyncingRef.current) {
      console.error('⏸️ [useEffect] 正在同步中，跳过重复调用')
      return
    }

    if (user && localData.records.length >= 0) {
      console.error('✅ [useEffect] 新登录，准备调用 autoSync')
      // 用户登录后，立即启动自动同步
      autoSync()
    } else {
      console.error('⏸️ [useEffect] 条件不满足，跳过自动同步')
    }
  }, [user?.id]) // 只监听 user.id 变化，而不是整个 user 对象

  // ⭐ 从 localStorage 获取最新数据（避免闭包陷阱）
  const getLatestLocalData = () => {
    try {
      const recordsStr = localStorage.getItem('ashtanga_records')
      const optionsStr = localStorage.getItem('ashtanga_options')
      const profileStr = localStorage.getItem('ashtanga_profile')

      const records = recordsStr ? JSON.parse(recordsStr) : []
      const options = optionsStr ? JSON.parse(optionsStr) : []
      const profile = profileStr ? JSON.parse(profileStr) : null

      console.error('📦 [getLatestLocalData] 从 localStorage 读取:', {
        recordsCount: records.length,
        lastRecordId: records[records.length - 1]?.id,
        optionsCount: options.length
      })

      return { records, options, profile }
    } catch (e) {
      console.error('❌ [getLatestLocalData] 读取 localStorage 失败:', e)
      return localDataRef.current
    }
  }

  // ==================== 自动同步函数 ====================
  const autoSync = async () => {
    // 防止重复调用
    if (isSyncingRef.current) {
      console.error('⏸️ [autoSync] 已有同步任务在执行，跳过')
      return
    }

    // ⭐ 从 localStorage 获取最新数据，避免闭包陷阱
    const freshLocalData = getLatestLocalData()

    console.error('🚨🚨🚨 [autoSync] 函数被调用了！🚨🚨🚨')
    console.error('='.repeat(50))
    console.error('[autoSync] 函数开始执行')
    console.error('='.repeat(50))
    console.error('[autoSync] 🔍 localData 详情:')
    console.error('   - records.length:', freshLocalData.records.length)
    console.error('   - records[最后一条]?.id:', freshLocalData.records[freshLocalData.records.length - 1]?.id)
    console.error('   - options.length:', freshLocalData.options.length)

    if (!user) {
      console.error('[autoSync] 用户未登录，退出')
      return
    }

    // 设置同步标志
    isSyncingRef.current = true
    console.error('[autoSync] 设置同步标志')

    console.error('[autoSync] 用户已登录，开始同步')
    console.error('   user_id:', user.id)
    console.error('   localData.records.length:', freshLocalData.records.length)

    console.error('[autoSync] 设置状态为 syncing...')
    setSyncStatus('syncing')
    console.error('[autoSync] 状态已设置为 syncing')

    console.error('[autoSync] 添加日志...')
    addLog('启动自动同步', 'success')
    console.error('[autoSync] 日志已添加')

    try {
      console.error('[autoSync] 开始下载云端数据...')
      // 1. 下载云端数据
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      console.error('[autoSync] 云端数据下载成功')
      console.error('   remoteData.records.length:', remoteData.records?.length)

      const localCount = freshLocalData.records.length
      const remoteCount = remoteData.records.length

      console.error(`📊 [autoSync] 数据对比：本地${localCount}条，云端${remoteCount}条`)

      // ⭐ 计算同步限制（用于显示上限提醒）
      const sortedRecords = [...freshLocalData.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
      const localOnlyCount = localCount - recordsToSync.length

      if (localOnlyCount > 0) {
        console.error(`⚠️ [autoSync] 同步限制：${localOnlyCount}条最新记录仅保存在本地`)
      }

      // 2. 智能同步策略
      // ⭐ 使用截取后的 recordsToSync（最早的50条）进行比对，避免超过限制的记录触发冲突
      const effectiveLocalRecords = localOnlyCount > 0 ? recordsToSync : freshLocalData.records

      // ⭐ 云端数据也只取前50条进行比对（内测版本限制）
      const effectiveRemoteRecords = remoteCount > MAX_SYNC_RECORDS
        ? [...remoteData.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, MAX_SYNC_RECORDS)
        : remoteData.records

      if (remoteCount > 0 && localCount > 0) {
        // 两边都有数据，检查是否有差异需要同步
        const localIds = new Set(effectiveLocalRecords.map(r => r.id))
        const remoteIds = new Set(effectiveRemoteRecords.map(r => r.id))
        const remoteMap = new Map(effectiveRemoteRecords.map(r => [r.id, r]))

        // ⭐ 改进的对比逻辑：同时检测内容变化
        const localOnly: PracticeRecord[] = [] // 本地独有
        const remoteOnly: PracticeRecord[] = [] // 云端独有
        const localNewer: PracticeRecord[] = [] // 两边都有，但本地更新
        const remoteNewer: PracticeRecord[] = [] // 两边都有，但云端更新

        for (const localRecord of effectiveLocalRecords) {
          if (!remoteIds.has(localRecord.id)) {
            localOnly.push(localRecord)
          } else {
            // ⭐ 两边都有，对比 updated_at
            const remoteRecord = remoteMap.get(localRecord.id)
            if (remoteRecord) {
              const localTime = new Date(localRecord.updated_at || localRecord.created_at).getTime()
              const remoteTime = new Date(remoteRecord.updated_at || remoteRecord.created_at).getTime()

              if (localTime > remoteTime) {
                localNewer.push(localRecord)
                console.error(`📝 [autoSync] 记录 ${localRecord.id} 本地更新，本地时间: ${localTime}, 云端时间: ${remoteTime}`)
              } else if (remoteTime > localTime) {
                remoteNewer.push(remoteRecord)
                console.error(`📝 [autoSync] 记录 ${remoteRecord.id} 云端更新，云端时间: ${remoteTime}, 本地时间: ${localTime}`)
              }
              // 时间相同，不需要同步
            }
          }
        }

        // 云端独有的记录
        for (const remoteRecord of effectiveRemoteRecords) {
          if (!localIds.has(remoteRecord.id)) {
            remoteOnly.push(remoteRecord)
          }
        }

        const totalLocalChanges = localOnly.length + localNewer.length
        const totalRemoteChanges = remoteOnly.length + remoteNewer.length

        console.error(`📊 [autoSync] 比对结果：本地独有${localOnly.length}条，云端独有${remoteOnly.length}条，本地更新${localNewer.length}条，云端更新${remoteNewer.length}条`)

        if (totalLocalChanges === 0 && totalRemoteChanges === 0) {
          // 没有差异，数据已一致
          console.error('[autoSync] 数据已一致，无需同步')
          setSyncStatus('success')
          return
        }

        // 有差异：本地有新增/更新的数据 → 上传到云端
        if (totalLocalChanges > 0 && totalRemoteChanges === 0) {
          console.error(`📤 [autoSync] 本地有${totalLocalChanges}条变更（新增${localOnly.length}+更新${localNewer.length}），上传到云端`)
          addLog(`上传本地变更：${totalLocalChanges}条记录`, 'success')
          const result = await uploadLocalData(user.id, freshLocalData, user)
          if (result.success) {
            setSyncStatus('success')
            setLastSyncStatus('success')
            setLastSyncTime(Date.now())
          } else {
            setSyncStatus('error')
            setLastSyncStatus('error')
          }
          return
        }

        // 有差异：云端有新增/更新的数据 → 合并到本地
        if (totalRemoteChanges > 0 && totalLocalChanges === 0) {
          console.error(`📥 [autoSync] 云端有${totalRemoteChanges}条变更（新增${remoteOnly.length}+更新${remoteNewer.length}）`)

          // ⭐ 合并：本地记录 + 云端新增 + 云端更新的版本
          const localMap = new Map(effectiveLocalRecords.map(r => [r.id, r]))
          const mergedRecords = [...effectiveLocalRecords]

          // 添加云端独有的记录
          for (const record of remoteOnly) {
            mergedRecords.push(record)
          }

          // 更新云端更新的记录
          for (const record of remoteNewer) {
            const index = mergedRecords.findIndex(r => r.id === record.id)
            if (index >= 0) {
              mergedRecords[index] = record
            }
          }

          addLog(`同步云端变更：新增${remoteOnly.length}条，更新${remoteNewer.length}条`, 'success')
          onSyncComplete({
            records: mergedRecords,
            options: remoteData.options || [],
            profile: remoteData.profile && remoteData.profile.name && !remoteData.profile.name.match(/^\d+$/)
              ? remoteData.profile
              : { name: '阿斯汤加习练者', signature: remoteData.profile?.signature || '练习、练习，一切随之而来。', avatar: null, is_pro: false }
          })
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
          // ⭐ 更新同步统计（下载云端数据成功）
          setSyncStats({
            totalLocalRecords: mergedRecords.length,
            syncedRecords: mergedRecords.length,
            maxSyncRecords: MAX_SYNC_RECORDS,
            localOnlyCount: 0,
            hasLimitWarning: false
          })
          return
        }

        // 两边都有变更 → 真正的冲突，需要用户选择
        console.error(`⚠️ [autoSync] 双方都有变更：本地${totalLocalChanges}条，云端${totalRemoteChanges}条`)
        addLog(`检测到冲突：本地${totalLocalChanges}条变更，云端${totalRemoteChanges}条变更`, 'success')
        if (onConflictDetected) {
          onConflictDetected(localCount, remoteCount)
        }
        setSyncStatus('idle')
        return
      }

      // 3. 只有云端有数据 → 使用云端（但只取前50条）
      if (remoteCount > 0 && localCount === 0) {
        // ⭐ 内测版本：只使用云端前50条数据
        const remoteRecordsToUse = remoteCount > MAX_SYNC_RECORDS
          ? [...remoteData.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, MAX_SYNC_RECORDS)
          : remoteData.records

        if (remoteCount > MAX_SYNC_RECORDS) {
          console.error(`⚠️ [autoSync] 云端有${remoteCount}条记录，只使用前${MAX_SYNC_RECORDS}条`)
          addLog(`云端${remoteCount}条，只使用前${MAX_SYNC_RECORDS}条`, 'success')
        }

        addLog(`使用云端数据：${remoteRecordsToUse.length}条记录`, 'success')
        onSyncComplete({
          records: remoteRecordsToUse,
          options: remoteData.options || [],
          profile: remoteData.profile || { name: '阿斯汤加习练者', signature: '', avatar: null, is_pro: false }
        })
        setSyncStatus('success')
        setLastSyncStatus('success')
        setLastSyncTime(Date.now())
        // ⭐ 更新同步统计（使用云端数据）
        setSyncStats({
          totalLocalRecords: remoteRecordsToUse.length,
          syncedRecords: remoteRecordsToUse.length,
          maxSyncRecords: MAX_SYNC_RECORDS,
          localOnlyCount: 0,
          hasLimitWarning: false
        })
        return
      }

      // 4. 只有本地有数据 → 上传到云端
      if (localCount > 0 && remoteCount === 0) {
        addLog(`上传本地数据：${localCount}条记录`, 'success')
        const result = await uploadLocalData(user.id, freshLocalData, user)
        if (result.success) {
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
    } finally {
      // 清理同步标志，允许下次同步
      isSyncingRef.current = false
      console.error('[autoSync] 同步完成，清理标志')
      // ⭐ 确保如果状态仍然是 syncing，重置为 idle（防止卡住）
      setSyncStatus(prev => prev === 'syncing' ? 'idle' : prev)
    }
  }

  // ⭐ 手动重置同步状态（用于卡顿时）
  const resetSyncStatus = () => {
    isSyncingRef.current = false
    setSyncStatus('idle')
    addLog('手动重置同步状态', 'success')
  }

  // ==================== 智能合并 ====================
  const smartMerge = async (
    localOnly: PracticeRecord[],
    remoteOnly: PracticeRecord[],
    remoteData: any
  ) => {
    // ⭐ 使用 ref 获取最新的 localData
    const freshLocalData = localDataRef.current

    if (remoteOnly.length > 0) {
      // 云端有新数据，下载到本地
      addLog(`下载${remoteOnly.length}条云端记录`, 'success')
      onSyncComplete({ records: [...freshLocalData.records, ...remoteOnly], options: remoteData.options || [] })
    }

    if (localOnly.length > 0) {
      // 本地有新数据，上传到云端
      addLog(`上传${localOnly.length}条本地记录`, 'success')
      const result = await uploadLocalRecords(user.id, localOnly)
      if (!result.success) {
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
      console.error('📥 [downloadRemoteData] 开始下载，userId:', userId)

      console.error('📥 [downloadRemoteData] 准备发送查询...')

      // ⭐ 为每个查询添加单独的超时保护
      const queryWithTimeout = async (queryName: string, queryFn: () => Promise<any>) => {
        const queryPromise = queryFn()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${queryName} 查询超时`)), 30000) // 单个查询30秒超时
        })
        return Promise.race([queryPromise, timeoutPromise])
      }

      // 分别包装每个查询，以便追踪哪个卡住了
      const recordsPromise = queryWithTimeout('记录', () =>
        supabase.from(TABLES.PRACTICE_RECORDS).select('*').eq('user_id', userId).is('deleted_at', null)
          .then(res => { console.error('✅ [downloadRemoteData] 记录查询完成'); return res })
          .catch(err => { console.error('❌ [downloadRemoteData] 记录查询失败:', err); throw err })
      )

      const optionsPromise = queryWithTimeout('选项', () =>
        supabase.from(TABLES.PRACTICE_OPTIONS).select('*').eq('user_id', userId)
          .then(res => { console.error('✅ [downloadRemoteData] 选项查询完成'); return res })
          .catch(err => { console.error('❌ [downloadRemoteData] 选项查询失败:', err); throw err })
      )

      const profilePromise = queryWithTimeout('资料', () =>
        supabase.from(TABLES.USER_PROFILES).select('*').eq('user_id', userId).maybeSingle()
          .then(res => { console.error('✅ [downloadRemoteData] 资料查询完成'); return res })
          .catch(err => { console.error('❌ [downloadRemoteData] 资料查询失败:', err); throw err })
      )

      const fetchPromise = Promise.all([recordsPromise, optionsPromise, profilePromise])

      const [recordsRes, optionsRes, profileRes] = await fetchPromise as any

      console.error('📥 [downloadRemoteData] 查询完成')
      console.error('   recordsRes.error:', recordsRes.error)
      console.error('   optionsRes.error:', optionsRes.error)
      console.error('   profileRes.error:', profileRes.error)
      console.error('   recordsRes.data.length:', recordsRes.data?.length)

      if (recordsRes.error) throw recordsRes.error
      if (optionsRes.error) throw optionsRes.error
      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error // PGRST116 表示没有找到，可以忽略

      // 修复：解析 photos JSON 字符串为数组
      const records = (recordsRes.data || []).map(r => ({
        ...r,
        photos: r.photos ? (typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos) : []
      }))

      console.error('📥 [downloadRemoteData] 记录处理完成，数量:', records.length)

      // 调试：打印云端选项数据
      console.error('📦 [downloadRemoteData] 云端选项数据:', optionsRes.data)
      console.error('   选项数量:', optionsRes.data?.length)

      // 修复：过滤掉无效的选项（id 必须存在）
      const options = (optionsRes.data || []).filter(o => {
        const isValid = o.id && (o.label || o.notes)
        if (!isValid) {
          console.error('   ⚠️ 过滤掉无效选项:', o)
        }
        return isValid
      })

      console.error('   ✅ 有效选项数量:', options.length)

      return {
        records,
        options,
        profile: (profileRes.data && profileRes.data.name && !profileRes.data.name.match(/^\d+$/))
          ? profileRes.data
          : { name: '阿斯汤加习练者', signature: profileRes.data?.signature || '练习、练习，一切随之而来。', avatar: null, is_pro: false }, // 如果没有 profile 或 name 是数字，使用默认值
      }
    } catch (error: any) {
      addLog('下载数据失败', 'error', undefined, error.message)
      throw error
    }
  }

  // ==================== 上传本地记录 ====================
  const uploadLocalRecords = async (userId: string, records: PracticeRecord[]) => {
    if (records.length === 0) return { success: true, localOnlyCount: 0 }

    // ⭐ 新增：50条记录限制 - 保留最早的50条
    // 按日期排序（最早的在前），然后截取前50条
    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
    const localOnlyCount = records.length - recordsToSync.length

    if (localOnlyCount > 0) {
      console.error(`⚠️ [uploadLocalRecords] 同步限制：只上传最早的${MAX_SYNC_RECORDS}条记录`)
      addLog(`${localOnlyCount}条记录仅本地保存`, 'success')
    }

    const failedIds: string[] = []

    const recordsToUpload = recordsToSync.map(r => ({
      id: r.id, // ⭐ 使用原始 ID，不生成新的
      user_id: userId,
      date: r.date,
      type: r.type,
      duration: r.duration,
      notes: r.notes || '',
      photos: null, // ⚠️ 照片暂不同步
      breakthrough: r.breakthrough || null,
      updated_at: r.updated_at || r.created_at || new Date().toISOString(), // ⭐ 添加更新时间
    }))

    const { error } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .upsert(recordsToUpload, { onConflict: 'id' })

    if (error) {
      records.forEach(r => failedIds.push(r.id))
      addLog('批量上传失败', 'error', undefined, error.message)
    } else {
      addLog(`批量上传${recordsToSync.length}条记录成功`, 'success')
    }

    if (failedIds.length > 0) {
      setFailedSyncIds(failedIds)
      setLastSyncStatus('error')
      return { success: false, localOnlyCount }
    } else {
      setFailedSyncIds([])
      setLastSyncStatus('success')
      return { success: true, localOnlyCount }
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

      // ⭐ 新增：1000条记录限制 - 保留最早的1000条
      // 按日期排序（最早的在前），然后截取前1000条
      const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
      const localOnlyCount = records.length - recordsToSync.length // 仅本地保留的记录数

      if (localOnlyCount > 0) {
        console.error(`⚠️ [uploadLocalData] 同步限制：只同步最早的${MAX_SYNC_RECORDS}条记录，${localOnlyCount}条新记录仅保留在本地`)
        addLog(`${localOnlyCount}条记录仅本地保存`, 'success')
      }

      // 1. 上传用户资料（使用服务端 API 绕过 RLS）
      console.error('📤 开始上传用户资料（服务端 API）...')

      const profileResponse = await fetch('/api/sync/upload-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profile: {
            ...profile,
            email: user?.email || null
          }
        }),
      })

      const profileResult = await profileResponse.json()

      if (!profileResponse.ok) {
        console.error('❌ 上传用户资料失败:', profileResult.error)
        throw new Error(profileResult.error || '上传用户资料失败')
      }

      console.error('✅ 用户资料上传成功:', profileResult)
      addLog('上传用户资料', 'success')

      // 2. 批量上传练习记录（使用 upsert）- 使用限制后的 recordsToSync（最早的50条）
      if (recordsToSync.length > 0) {
        const recordsToUpload = recordsToSync.map(r => ({
          id: r.id,
          user_id: userId,
          date: r.date,
          type: r.type,
          duration: r.duration,
          notes: r.notes || '',
          photos: r.photos && r.photos.length > 0 ? JSON.stringify(r.photos) : null, // ⚠️ 转换为 JSON 字符串
          breakthrough: r.breakthrough || null,
          updated_at: r.updated_at || r.created_at || new Date().toISOString(), // ⭐ 添加更新时间
        }))

        console.error(`📤 [uploadLocalData] 准备上传${recordsToUpload.length}条记录`)
        console.error('📤 [uploadLocalData] 记录IDs:', recordsToUpload.map(r => r.id))

        const { error: recordsError, data: upsertData } = await supabase
          .from(TABLES.PRACTICE_RECORDS)
          .upsert(recordsToUpload, {
            onConflict: 'id'
          })
          .select()

        if (recordsError) {
          // 记录失败的记录ID
          records.forEach(r => failedIds.push(r.id))
          addLog('批量上传记录', 'error', undefined, recordsError.message)
          console.error('❌ [uploadLocalData] upsert 失败:', recordsError)
        } else {
          addLog(`批量上传${recordsToSync.length}条记录`, 'success')
          console.error(`✅ [uploadLocalData] upsert 成功，返回${upsertData?.length || 0}条记录`)
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

      // ⭐ 计算实际上传成功的记录数
      const successfullySynced = recordsToSync.length - failedIds.length

      // 更新失败列表
      setFailedSyncIds(failedIds)
      setLastSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setSyncStatus(failedIds.length === 0 ? 'success' : 'error')
      setLastSyncTime(Date.now())

      // ⭐ 更新同步统计信息（只在成功时更新 syncedRecords）
      setSyncStats(prev => ({
        totalLocalRecords: records.length,
        syncedRecords: failedIds.length === 0 ? recordsToSync.length : (prev?.syncedRecords || 0),
        maxSyncRecords: MAX_SYNC_RECORDS,
        localOnlyCount: failedIds.length === 0 ? localOnlyCount : records.length - (prev?.syncedRecords || 0),
        hasLimitWarning: failedIds.length === 0 ? localOnlyCount > 0 : records.length > (prev?.syncedRecords || 0)
      }))

      return {
        success: failedIds.length === 0,
        localOnlyCount, // ⭐ 返回仅本地保留的记录数
        syncedCount: recordsToSync.length,
        totalCount: records.length
      }
    } catch (error: any) {
      console.error('Upload failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message)
      console.error('Error name:', error?.name)
      addLog('同步失败', 'error', undefined, error?.message || JSON.stringify(error))
      setSyncStatus('error')
      setLastSyncStatus('error')
      return { success: false, localOnlyCount: 0, syncedCount: 0, totalCount: 0 }
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
            profile: remoteData.profile && remoteData.profile.name && !remoteData.profile.name.match(/^\d+$/)
              ? remoteData.profile
              : { name: '阿斯汤加习练者', signature: remoteData.profile?.signature || '练习、练习，一切随之而来。', avatar: null, is_pro: false }
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
          const result = await uploadLocalData(user.id, localDataRef.current, user)
          if (!result.success) {
            throw new Error('上传本地数据失败')
          }
          break

        case 'merge':
          // 智能合并
          addLog('智能合并', 'success')
          // ⭐ 使用 ref 获取最新的 localData
          const freshLocalDataForMerge = localDataRef.current
          const localIds = new Set(freshLocalDataForMerge.records.map(r => r.id))
          const remoteIds = new Set(remoteData.records.map(r => r.id))

          const localOnly = freshLocalDataForMerge.records.filter(r => !remoteIds.has(r.id))
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
    syncStats, // ⭐ 新增：同步统计信息
    autoSync, // 手动触发同步
    uploadLocalData, // 手动上传本地数据
    resolveConflict, // ⭐ 新增：处理数据冲突
    resetSyncStatus, // ⭐ 新增：手动重置同步状态
  }
}
