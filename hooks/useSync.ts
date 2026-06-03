"use client"

import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from 'react-use'
import { supabase, TABLES } from '@/lib/supabase'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'
import { diffRecords, buildProfileFromRemote, mergeRecords, mergeOptions } from '@/lib/sync-utils'

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
  interface SyncLogEntry {
    timestamp: string
    action: string
    status: 'success' | 'error' | 'warning'
    triggerReason: string  // 同步触发原因，如"保存练习后同步"、"应用启动自动同步"
    localCount?: number    // 触发同步时本地记录数
    remoteCount?: number   // 触发同步时云端记录数
    recordId?: string
    error?: string
    details?: {
      stack?: string
      retryCount?: number
      requestInfo?: string
      responseStatus?: number
    }
  }
  const [syncLogs, setSyncLogs] = useLocalStorage<SyncLogEntry[]>('sync_logs', [])

  // 保存当前同步的触发原因，供 autoSync 内各子步骤的 addLog 使用
  const currentTriggerReasonRef = useRef<string>('')

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
    // ⭐ 按日期排序（最新的在前），然后截取最新的1000条
    const sortedRecords = [...localData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
  // ⭐ 使用全局标志，确保每个页面会话只自动同步一次
  const hasAutoSyncedInSession = typeof window !== 'undefined' && (window as any).__hasAutoSynced__

  useEffect(() => {
    console.error('🔍 [useEffect] 触发', {
      hasUser: !!user,
      userId: user?.id,
      localDataLength: localData.records.length,
      isSyncing: isSyncingRef.current,
      hasAutoSyncedInSession
    })

    // 如果当前会话已经自动同步过，跳过
    if (hasAutoSyncedInSession) {
      console.error('⏸️ [useEffect] 当前会话已自动同步过，跳过')
      return
    }

    // 如果正在同步中，跳过
    if (isSyncingRef.current) {
      console.error('⏸️ [useEffect] 正在同步中，跳过重复调用')
      return
    }

    if (user && localData.records.length >= 0) {
      console.error('✅ [useEffect] 首次同步，准备调用 autoSync')
      // 标记当前会话已自动同步
      if (typeof window !== 'undefined') {
        (window as any).__hasAutoSynced__ = true
      }
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
        optionsCount: options.length,
        profileName: profile?.name
      })

      return { records, options, profile }
    } catch (e) {
      console.error('❌ [getLatestLocalData] 读取 localStorage 失败:', e)
      return localDataRef.current
    }
  }

  // ==================== 自动同步函数 ====================
  const autoSync = async (triggerReason?: string) => {
    // 防止重复调用
    if (isSyncingRef.current) {
      console.error('⏸️ [autoSync] 已有同步任务在执行，跳过')
      return
    }

    // ⭐ 记录触发原因（默认取全局，若未传入则置默认）
    currentTriggerReasonRef.current = triggerReason || '应用启动自动同步'

    // ⭐ 从 localStorage 获取最新数据，避免闭包陷阱
    const freshLocalData = getLatestLocalData()

    console.error('🚨🚨🚨 [autoSync] 函数被调用了！🚨🚨🚨')
    console.error('='.repeat(50))
    console.error('[autoSync] 函数开始执行')
    console.error('   - 触发原因:', triggerReason || '(默认)')
    console.error('='.repeat(50))
    console.error('[autoSync] 🔍 localData 详情:')
    console.error('   - records.length:', freshLocalData.records.length)
    console.error('   - records[最后一条]?.id:', freshLocalData.records[freshLocalData.records.length - 1]?.id)
    console.error('   - options.length:', freshLocalData.options.length)
    console.error('   - profile.name:', freshLocalData.profile?.name)

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
    addLog('启动自动同步', 'success', undefined, undefined, undefined, {
      triggerReason: currentTriggerReasonRef.current || '(默认)',
      localCount: freshLocalData.records.length
    })
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
      // ⭐ 按日期排序（最新的在前），然后截取最新的1000条
      const sortedRecords = [...freshLocalData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
      const localOnlyCount = localCount - recordsToSync.length

      if (localOnlyCount > 0) {
        console.error(`⚠️ [autoSync] 同步限制：${localOnlyCount}条最新记录仅保存在本地`)
      }

      // 2. 智能同步策略
      // ⭐ 使用截取后的 recordsToSync（最早的50条）进行比对，避免超过限制的记录触发冲突
      const effectiveLocalRecords = localOnlyCount > 0 ? recordsToSync : freshLocalData.records

      // ⭐ 云端数据也只取前1000条进行比对（最新的1000条）
      const effectiveRemoteRecords = remoteCount > MAX_SYNC_RECORDS
        ? [...remoteData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_SYNC_RECORDS)
        : remoteData.records

      if (remoteCount > 0 && localCount > 0) {
        // 两边都有数据，检查是否有差异需要同步
        const { localOnly, remoteOnly, localNewer, remoteNewer } = diffRecords(effectiveLocalRecords, effectiveRemoteRecords)

        const totalLocalChanges = localOnly.length + localNewer.length
        const totalRemoteChanges = remoteOnly.length + remoteNewer.length

        // ⭐ 检查选项是否有差异（新增/删除/修改）
        const localOptions = freshLocalData.options || []
        const remoteOptions = remoteData.options || []
        const localOptionIds = new Set(localOptions.map((o: PracticeOption) => o.id))
        const remoteOptionIds = new Set(remoteOptions.map((o: PracticeOption) => o.id))

        // 检查选项数量或内容是否不同
        let optionsChanged = false
        let optionsChangeSource: 'local' | 'remote' | null = null

        if (localOptions.length !== remoteOptions.length) {
          optionsChanged = true
          // 数量不同，判断哪边有新增
          if (localOptions.length > remoteOptions.length) {
            optionsChangeSource = 'local'
            console.error(`📊 [autoSync] 选项本地新增：本地${localOptions.length}个，云端${remoteOptions.length}个`)
          } else {
            optionsChangeSource = 'remote'
            console.error(`📊 [autoSync] 选项云端新增：云端${remoteOptions.length}个，本地${localOptions.length}个`)
          }
        } else {
          // 数量相同，检查是否有不同的选项ID 或内容差异（color_level/label/notes）
          const hasDifferentOptions = localOptions.some((o: PracticeOption) => !remoteOptionIds.has(o.id)) ||
                                      remoteOptions.some((o: PracticeOption) => !localOptionIds.has(o.id))
          if (hasDifferentOptions) {
            optionsChanged = true
            optionsChangeSource = 'local' // 默认本地优先
            console.error(`📊 [autoSync] 选项内容不同，需要同步`)
          }
        }

        // ⭐ 检查 profile 是否有差异（基于 updated_at 时间戳）
        const localProfile = freshLocalData.profile
        const remoteProfile = remoteData.profile
        let profileChanged = false
        let profileChangeSource: 'local' | 'remote' | null = null

        if (localProfile && remoteProfile) {
          // ⭐ 如果本地是默认 profile（id 为空），强制从云端下载
          if (!localProfile.id || localProfile.id === '') {
            profileChanged = true
            profileChangeSource = 'remote'
            console.error(`📊 [autoSync] profile 本地为默认空数据，从云端下载`)
          } else {
            // ⭐ 比对 name、signature、avatar 等字段
            const hasContentDiff = localProfile.name !== remoteProfile.name ||
                localProfile.signature !== remoteProfile.signature ||
                localProfile.avatar !== remoteProfile.avatar ||
                (localProfile.historical_days || 0) !== (remoteProfile.historical_days || 0) ||
                (localProfile.historical_avg_minutes || 0) !== (remoteProfile.historical_avg_minutes || 0)

            if (hasContentDiff) {
              profileChanged = true

              // ⭐ 基于时间戳判断谁更新
              const localTime = new Date(localProfile.updated_at || localProfile.created_at).getTime()
              const remoteTime = new Date(remoteProfile.updated_at || remoteProfile.created_at).getTime()

              if (localTime > remoteTime) {
                profileChangeSource = 'local'
                console.error(`📊 [autoSync] profile 本地更新：本地时间=${new Date(localTime).toISOString()}, 云端时间=${new Date(remoteTime).toISOString()}`)
              } else if (remoteTime > localTime) {
                profileChangeSource = 'remote'
                console.error(`📊 [autoSync] profile 云端更新：云端时间=${new Date(remoteTime).toISOString()}, 本地时间=${new Date(localTime).toISOString()}`)
              } else {
                // 时间相同，默认本地优先
                profileChangeSource = 'local'
                console.error(`📊 [autoSync] profile 时间相同，默认本地优先`)
              }
            }
          }
        } else if (localProfile && !remoteProfile) {
          // 只有本地有 profile，上传到云端
          profileChanged = true
          profileChangeSource = 'local'
          console.error(`📊 [autoSync] profile 仅本地存在，需要上传`)
        } else if (!localProfile && remoteProfile) {
          // 只有云端有 profile，下载到本地
          profileChanged = true
          profileChangeSource = 'remote'
          console.error(`📊 [autoSync] profile 仅云端存在，需要下载`)
        }

        console.error(`📊 [autoSync] 比对结果：本地独有${localOnly.length}条，云端独有${remoteOnly.length}条，本地更新${localNewer.length}条，云端更新${remoteNewer.length}条，profile变化=${profileChanged}，选项变化=${optionsChanged}`)

        if (totalLocalChanges === 0 && totalRemoteChanges === 0 && !profileChanged && !optionsChanged) {
          // 没有差异，数据已一致
          console.error('[autoSync] 数据已一致，无需同步')
          addLog(`数据一致，无需同步`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount,
            remoteCount
          })
          setSyncStatus('success')
          return true
        }

        // 有差异：本地有新增/更新的数据 → 上传到云端
        if ((totalLocalChanges > 0 || profileChangeSource === 'local' || optionsChangeSource === 'local') && totalRemoteChanges === 0 && optionsChangeSource !== 'remote') {
          console.error(`📤 [autoSync] 本地有${totalLocalChanges}条变更（新增${localOnly.length}+更新${localNewer.length}）${profileChanged ? '+ profile变更' : ''}，上传到云端`)
          addLog(`上传本地 ${totalLocalChanges} 条变更新到云端`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount,
            remoteCount
          })
          const result = await uploadLocalData(user.id, freshLocalData, user)
          if (result.success) {
            setSyncStatus('success')
            setLastSyncStatus('success')
            setLastSyncTime(Date.now())
            return true
          } else {
            setSyncStatus('error')
            setLastSyncStatus('error')
            return false
          }
        }

        // 有差异：云端有新增/更新的数据 → 合并到本地
        if ((totalRemoteChanges > 0 || profileChangeSource === 'remote' || optionsChangeSource === 'remote') && totalLocalChanges === 0 && profileChangeSource !== 'local' && optionsChangeSource !== 'local') {
          console.error(`📥 [autoSync] 云端有${totalRemoteChanges}条变更（新增${remoteOnly.length}+更新${remoteNewer.length}）`)

          // ⭐ 合并：本地记录 + 云端新增 + 云端更新的版本
          const mergedRecords = mergeRecords(effectiveLocalRecords, remoteOnly, remoteNewer)

          addLog(`同步云端变更：新增${remoteOnly.length}条，更新${remoteNewer.length}条`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount,
            remoteCount
          })

          // ⭐ 构建完整的 profile 对象，确保包含 updated_at
          const mergedProfile = buildProfileFromRemote(remoteData.profile, freshLocalData.profile)

          // ⭐ 合并选项：保留本地的本地字段（is_preset/audio_src/can_edit）
          const mergedOptions = mergeOptions(remoteData.options, freshLocalData.options)

          onSyncComplete({
            records: mergedRecords,
            options: mergedOptions,
            profile: mergedProfile
          })
          // ⭐ 关键修复：直接保存到 localStorage（不依赖回调）
          localStorage.setItem('ashtanga_records', JSON.stringify(mergedRecords))
          localStorage.setItem('ashtanga_options', JSON.stringify(mergedOptions))
          console.error('✅ [autoSync] records 和 options 已保存到 localStorage')
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
          return true
        }

        // 两边都有变更 → 真正的冲突，需要用户选择
        console.error(`⚠️ [autoSync] 双方都有变更：本地${totalLocalChanges}条，云端${totalRemoteChanges}条`)
        addLog(`检测到冲突：本地${totalLocalChanges}条变更，云端${totalRemoteChanges}条变更`, 'warning', undefined, undefined, undefined, {
          triggerReason: currentTriggerReasonRef.current,
          localCount,
          remoteCount
        })
        if (onConflictDetected) {
          onConflictDetected(localCount, remoteCount)
        }
        setSyncStatus('idle')
        return false
      }

      // 3. 只有云端有数据 → 使用云端（但只取前1000条）
      if (remoteCount > 0 && localCount === 0) {
        // ⭐ 只使用云端最新的1000条数据
        const remoteRecordsToUse = remoteCount > MAX_SYNC_RECORDS
          ? [...remoteData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_SYNC_RECORDS)
          : remoteData.records

        if (remoteCount > MAX_SYNC_RECORDS) {
          console.error(`⚠️ [autoSync] 云端有${remoteCount}条记录，只使用前${MAX_SYNC_RECORDS}条`)
          addLog(`云端${remoteCount}条，只使用前${MAX_SYNC_RECORDS}条`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount,
            remoteCount
          })
        }

        addLog(`仅云端有数据：下载${remoteRecordsToUse.length}条`, 'success', undefined, undefined, undefined, {
          triggerReason: currentTriggerReasonRef.current,
          localCount,
          remoteCount
        })

        // ⭐ 构建完整的 profile 对象，确保包含 updated_at
        // 修复：只要云端有 profile 数据，就使用它，不要进行二次判断
        const cloudProfile = remoteData.profile && remoteData.profile.name
          ? {
              id: remoteData.profile.id || '',
              user_id: remoteData.profile.user_id || '',
              created_at: remoteData.profile.created_at || new Date().toISOString(),
              updated_at: remoteData.profile.updated_at || remoteData.profile.created_at || new Date().toISOString(),
              name: remoteData.profile.name,
              signature: remoteData.profile.signature || '练习、练习，一切随之而来。',
              avatar: remoteData.profile?.avatar || null,
              phone: remoteData.profile.phone,
              historical_days: remoteData.profile.historical_days || 0,
              historical_avg_minutes: remoteData.profile.historical_avg_minutes || 0,
            }
          : { name: '阿斯汤加习练者', signature: remoteData.profile?.signature || '练习、练习，一切随之而来。', avatar: null, historical_days: 0, historical_avg_minutes: 0 }

        onSyncComplete({
          records: remoteRecordsToUse,
          options: remoteData.options || [],
          profile: cloudProfile
        })
        // ⭐ 关键修复：直接保存到 localStorage
        localStorage.setItem('ashtanga_records', JSON.stringify(remoteRecordsToUse))
        localStorage.setItem('ashtanga_options', JSON.stringify(remoteData.options || []))
        console.error('✅ [autoSync] 云端数据已保存到 localStorage')
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
        return true
      }

      // 4. 只有本地有数据 → 上传到云端
      if (localCount > 0 && remoteCount === 0) {
        addLog(`仅本地有数据：上传${localCount}条`, 'success', undefined, undefined, undefined, {
          triggerReason: currentTriggerReasonRef.current,
          localCount,
          remoteCount
        })
        const result = await uploadLocalData(user.id, freshLocalData, user)
        if (result.success) {
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
          return true
        } else {
          throw new Error('上传本地数据失败')
        }
      }

      // 5. 两边都没有数据 → 无需操作
      addLog('两端都没有数据', 'success', undefined, undefined, undefined, {
        triggerReason: currentTriggerReasonRef.current,
        localCount,
        remoteCount
      })
      setSyncStatus('success')
      setLastSyncStatus('success')
      setLastSyncTime(Date.now()) // ⭐ 更新同步时间
      return true

    } catch (error: any) {
      console.error('Auto sync failed:', error)
      addLog('自动同步失败', 'error', undefined, error.message, {
        stack: error.stack,
        requestInfo: `user_id: ${user?.id}, records: ${localDataRef.current.records.length}`
      })
      setSyncStatus('error')
      setLastSyncStatus('error')
      return false
    } finally {
      // 兜底：确保今天有练习记录时 has_practiced 被标记
      try {
        const uuid = typeof window !== 'undefined' ? localStorage.getItem('ashtanga_uuid') : null
        if (uuid && localDataRef.current?.records?.length > 0) {
          const beijingNow = new Date(Date.now() + 8 * 3600 * 1000)
          const today = beijingNow.toISOString().slice(0, 10)
          const practicedToday = localDataRef.current.records.some(r => r.date === today)
          if (practicedToday) {
            fetch('/api/stats/record-practice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uuid }),
            }).catch(() => {})
          }
        }
      } catch {}

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
    localNewer: PracticeRecord[],
    remoteNewer: PracticeRecord[],
    remoteData: any
  ) => {
    // ⭐ 使用 ref 获取最新的 localData
    const freshLocalData = localDataRef.current

    // ⭐ 智能合并 profile：比较时间戳，使用更新的那个
    let mergedProfile = freshLocalData.profile
    if (remoteData.profile) {
      const localTime = new Date(freshLocalData.profile?.updated_at || freshLocalData.profile?.created_at || 0).getTime()
      const remoteTime = new Date(remoteData.profile.updated_at || remoteData.profile.created_at).getTime()

      if (remoteTime > localTime) {
        mergedProfile = remoteData.profile
      }
    }

    // 合并记录：本地基础 + 云端独有 + 云端更新的覆盖本地旧版本
    const mergedRecords = mergeRecords(freshLocalData.records, remoteOnly, remoteNewer)

    // 合并选项：保留本地字段（is_preset/audio_src/can_edit）
    const mergedOptions = mergeOptions(remoteData.options, freshLocalData.options)

    const downloadCount = remoteOnly.length + remoteNewer.length
    if (downloadCount > 0) {
      addLog(`下载${downloadCount}条云端记录（新增${remoteOnly.length}，更新${remoteNewer.length}）`, 'success')
    }
    onSyncComplete({
      records: mergedRecords,
      options: mergedOptions,
      profile: mergedProfile
    })

    // 上传本地独有 + 本地更新的记录
    const toUpload = [...localOnly, ...localNewer]
    if (toUpload.length > 0) {
      addLog(`上传${toUpload.length}条本地记录（新增${localOnly.length}，更新${localNewer.length}）`, 'success')
      const result = await uploadLocalRecords(user.id, toUpload, freshLocalData.options)
      if (!result.success) {
        throw new Error('上传本地记录失败')
      }
    }

    setSyncStatus('success')
    setLastSyncStatus('success')
    setLastSyncTime(Date.now())
  }

  // ==================== 下载云端数据 ====================
  const downloadRemoteData = async (userId: string, retryCount = 0) => {
    try {
      console.error('📥 [downloadRemoteData] 开始下载，userId:', userId, '重试次数:', retryCount)

      console.error('📥 [downloadRemoteData] 准备发送查询...')

      // ⭐ 为每个查询添加单独的超时保护（30秒，失败会重试）
      const queryWithTimeout = async (queryName: string, queryFn: () => Promise<any>) => {
        const startTime = Date.now()
        const queryPromise = queryFn()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const elapsed = Date.now() - startTime
            reject(new Error(`${queryName} 查询超时 (${elapsed}ms)`))
          }, 30000) // 单个查询30秒超时，失败后重试
        })
        return Promise.race([queryPromise, timeoutPromise])
      }

      // 分别包装每个查询，以便追踪哪个卡住了
      const recordsPromise = queryWithTimeout('记录', async () => {
        console.error('🚀 [downloadRemoteData] 开始执行记录查询...')
        try {
          const query = supabase.from(TABLES.PRACTICE_RECORDS).select('*').eq('user_id', userId).is('deleted_at', null).neq('type', '草稿')
          console.error('🚀 [downloadRemoteData] 查询对象创建成功，准备执行...')
          const res = await query
          console.error('✅ [downloadRemoteData] 记录查询完成')
          return res
        } catch (err) {
          console.error('❌ [downloadRemoteData] 记录查询失败:', err)
          throw err
        }
      })

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
      console.error('📥 [downloadRemoteData] 云端 profile:', profileRes.data)
      console.error('   头像字段:', profileRes.data?.avatar ? '有值' : '无值')

      // ⭐ 构建返回的 profile，确保包含 updated_at 字段
      let profile: UserProfile | null = null
      if (profileRes.data && profileRes.data.name && !profileRes.data.name.match(/^\d+$/)) {
        profile = {
          id: profileRes.data.id || '',
          user_id: profileRes.data.user_id || '',
          created_at: profileRes.data.created_at || new Date().toISOString(),
          updated_at: profileRes.data.updated_at || profileRes.data.created_at || new Date().toISOString(), // ⭐ 确保 updated_at
          name: profileRes.data.name,
          signature: profileRes.data.signature || '练习、练习，一切随之而来。',
          avatar: profileRes.data?.avatar || null,
          phone: profileRes.data.phone,
          historical_days: profileRes.data.historical_days || 0,           // ⭐ 历史练习天数
          historical_avg_minutes: profileRes.data.historical_avg_minutes || 0, // ⭐ 历史平均时长
        }
      }

      return {
        records,
        options,
        profile: profile || { name: '阿斯汤加习练者', signature: profileRes.data?.signature || '练习、练习，一切随之而来。', avatar: null },
      }
    } catch (error: any) {
      console.error('❌ [downloadRemoteData] 下载失败:', error.message)

      // ⭐ 自动重试机制（最多重试2次）
      if (retryCount < 2) {
        console.error(`🔄 [downloadRemoteData] 准备第 ${retryCount + 1} 次重试...`)
        addLog(`查询超时，正在重试 (${retryCount + 1}/2)...`, 'warning')
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒后重试
        return downloadRemoteData(userId, retryCount + 1)
      }

      addLog('下载数据失败', 'error', undefined, error.message, {
        stack: error.stack,
        retryCount,
        requestInfo: `user_id: ${userId}`,
        responseStatus: error.status || error.code
      })
      throw error
    }
  }

  // ==================== 上传本地记录 ====================
  const uploadLocalRecords = async (userId: string, records: PracticeRecord[], options?: PracticeOption[]) => {
    if (records.length === 0) return { success: true, localOnlyCount: 0 }

    // ⭐ 新增：1000条记录限制 - 保留最新的1000条
    // 按日期排序（最新的在前），然后截取最新的1000条
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
    const localOnlyCount = records.length - recordsToSync.length

    if (localOnlyCount > 0) {
      console.error(`⚠️ [uploadLocalRecords] 同步限制：只上传最新的${MAX_SYNC_RECORDS}条记录`)
      addLog(`${localOnlyCount}条记录仅本地保存`, 'success')
    }

    const failedIds: string[] = []

    let recordsToUpload = recordsToSync.map(r => ({
      id: r.id,
      user_id: userId,
      date: r.date,
      type: r.type,
      duration: Number(r.duration) || 0, // ⭐ 确保是数字
      notes: r.notes || '',
      photos: r.photos && r.photos.length > 0 ? r.photos : null,
      breakthrough: r.breakthrough || null,
      start_time: r.start_time || null,
      // ⭐ 色阶等级：优先用记录自身，其次用选项默认，最后用 3
      color_level: r.color_level ?? options?.find(o => o.label === r.type)?.color_level ?? 3,
      updated_at: r.updated_at || r.created_at || new Date().toISOString(),
    }))

    // ⭐ 安全合并：上传前查询云端已有记录，防止本地空白覆盖云端有内容的记录
    try {
      const localIds = recordsToUpload.map(r => r.id)
      const { data: cloudRecords } = await supabase
        .from(TABLES.PRACTICE_RECORDS)
        .select('id, notes, breakthrough, photos, duration, updated_at')
        .in('id', localIds)

      if (cloudRecords && cloudRecords.length > 0) {
        const cloudMap = new Map(cloudRecords.map(r => [r.id, r]))
        let mergedCount = 0

        recordsToUpload = recordsToUpload.map(local => {
          const cloud = cloudMap.get(local.id)
          if (!cloud) return local

          const needsMerge = (
            // 本地 notes 为空或默认文案，但云端有非空内容
            (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
          ) || (
            // 本地 breakthrough 为空，但云端有内容
            !local.breakthrough && cloud.breakthrough
          ) || (
            // 本地没有照片但云端有
            (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
          )

          if (!needsMerge) return local

          mergedCount++
          const cloudTime = new Date(cloud.updated_at || 0).getTime()
          const localTime = new Date(local.updated_at).getTime()

          return {
            ...local,
            // notes: 如果本地为空/默认，但云端有内容 → 保留云端
            notes: (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
              ? cloud.notes
              : local.notes,
            // breakthrough: 如果本地为空但云端有 → 保留云端
            breakthrough: !local.breakthrough && cloud.breakthrough ? cloud.breakthrough : local.breakthrough,
            // photos: 如果本地为空但云端有 → 保留云端
            photos: (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
              ? cloud.photos
              : local.photos,
            // updated_at: 使用较新的时间戳
            updated_at: localTime > cloudTime ? local.updated_at : cloud.updated_at,
          }
        })

        if (mergedCount > 0) {
          addLog(`安全合并 ${mergedCount} 条云端已有内容的记录`, 'success')
        }
      }
    } catch (mergeErr) {
      // 合并失败不影响后续上传流程
      console.error('⚠️ [uploadLocalRecords] 安全合并失败，继续直接上传:', mergeErr)
    }

    // ⭐ 显示排查日志到页面
    addLog(`准备上传 ${recordsToUpload.length} 条记录`, 'success')

    // ⭐ 检查数据格式
    const firstRecord = recordsToUpload[0]
    addLog(`首条记录ID: ${firstRecord?.id?.slice(0,8)}...`, 'success')
    addLog(`首条日期: ${firstRecord?.date}`, 'success')
    addLog(`照片字段类型: ${typeof firstRecord?.photos}`, 'success')

    // ⭐ 分批上传：每批50条
    const BATCH_SIZE = 50
    let successCount = 0
    let lastError: any = null

    for (let i = 0; i < recordsToUpload.length; i += BATCH_SIZE) {
      const batch = recordsToUpload.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i/BATCH_SIZE) + 1
      const totalBatches = Math.ceil(recordsToUpload.length/BATCH_SIZE)

      addLog(`上传第 ${batchNum}/${totalBatches} 批 (${batch.length}条)`, 'success')

      const { error } = await supabase
        .from(TABLES.PRACTICE_RECORDS)
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        lastError = error
        addLog(`第 ${batchNum} 批失败`, 'error')
        addLog(`错误消息: ${error.message || '无消息'}`, 'error')
        addLog(`错误代码: ${error.code || '无代码'}`, 'error')
        addLog(`错误详情: ${JSON.stringify(error).slice(0, 300)}`, 'error')

        // ⭐ 尝试解析 Supabase 错误详情
        if (error.message && error.message.includes('400')) {
          addLog('400 错误: 请求格式不正确', 'error')
          // 打印第一条记录的数据格式
          const sampleRecord = batch[0]
          addLog(`样本记录ID: ${sampleRecord.id}`, 'error')
          addLog(`样本日期: ${sampleRecord.date}`, 'error')
          addLog(`样本类型: ${sampleRecord.type}`, 'error')
          addLog(`样本时长: ${sampleRecord.duration} (类型: ${typeof sampleRecord.duration})`, 'error')
          addLog(`照片类型: ${typeof sampleRecord.photos}`, 'error')
          addLog(`更新时间: ${sampleRecord.updated_at}`, 'error')
        }

        // 记录失败的ID
        batch.forEach(r => failedIds.push(r.id))
      } else {
        successCount += batch.length
        addLog(`第 ${batchNum} 批成功`, 'success')
      }
    }

    if (failedIds.length > 0) {
      addLog(`失败 ${failedIds.length} 条，成功 ${successCount} 条`, 'error')
      setFailedSyncIds(failedIds)
      setLastSyncStatus('error')
      return { success: false, localOnlyCount }
    } else {
      addLog(`全部上传成功: ${successCount} 条`, 'success')
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
      }

      // ⭐ 新增：1000条记录限制 - 保留最新的1000条
      // 按日期排序（最新的在前），然后截取最新的1000条
      const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
      const localOnlyCount = records.length - recordsToSync.length // 仅本地保留的记录数

      if (localOnlyCount > 0) {
        console.error(`⚠️ [uploadLocalData] 同步限制：只同步最新的${MAX_SYNC_RECORDS}条记录，${localOnlyCount}条旧记录仅保留在本地`)
        addLog(`${localOnlyCount}条旧记录仅本地保存`, 'success')
      }

      // 1. 上传用户资料（使用服务端 API 绕过 RLS）
      console.error('📤 开始上传用户资料（服务端 API）...')
      console.error('   profile.name:', profile.name)
      console.error('   profile.signature:', profile.signature)

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

      // 2. 批量上传练习记录（使用 upsert）- 使用限制后的 recordsToSync（最新的1000条）
      if (recordsToSync.length > 0) {
        let recordsToUpload = recordsToSync.map(r => ({
          id: r.id,
          user_id: userId,
          date: r.date,
          type: r.type,
          duration: Number(r.duration) || 0, // ⭐ 确保是数字
          notes: r.notes || '',
          photos: r.photos && r.photos.length > 0 ? r.photos : null, // ⭐ 直接传数组，不 stringify
          breakthrough: r.breakthrough || null,
          start_time: r.start_time || null,
          // ⭐ 色阶等级：优先用记录自身，其次用选项默认，最后用 3
          color_level: r.color_level ?? options?.find(o => o.label === r.type)?.color_level ?? 3,
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        }))

        // ⭐ 安全合并：上传前查询云端已有记录，防止本地空白覆盖云端有内容的记录
        try {
          const localIds = recordsToUpload.map(r => r.id)
          const { data: cloudRecords } = await supabase
            .from(TABLES.PRACTICE_RECORDS)
            .select('id, notes, breakthrough, photos, duration, updated_at')
            .in('id', localIds)

          if (cloudRecords && cloudRecords.length > 0) {
            const cloudMap = new Map(cloudRecords.map(r => [r.id, r]))
            let mergedCount = 0

            recordsToUpload = recordsToUpload.map(local => {
              const cloud = cloudMap.get(local.id)
              if (!cloud) return local

              const needsMerge = (
                (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
              ) || (
                !local.breakthrough && cloud.breakthrough
              ) || (
                (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
              )

              if (!needsMerge) return local

              mergedCount++
              return {
                ...local,
                notes: (!local.notes || local.notes.trim() === '' || local.notes === '今日练习完成') && cloud.notes
                  ? cloud.notes
                  : local.notes,
                breakthrough: !local.breakthrough && cloud.breakthrough ? cloud.breakthrough : local.breakthrough,
                photos: (!local.photos || local.photos.length === 0) && cloud.photos && cloud.photos.length > 0
                  ? cloud.photos
                  : local.photos,
              }
            })

            if (mergedCount > 0) {
              console.error(`✅ [uploadLocalData] 安全合并 ${mergedCount} 条云端已有内容的记录`)
            }
          }
        } catch (mergeErr) {
          console.error('⚠️ [uploadLocalData] 安全合并失败，继续直接上传:', mergeErr)
        }

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

      // 3. 批量上传练习选项（只同步自定义选项，color_level 不同步，留在本地）
      if (options.length > 0) {
        const customOptions = options.filter(o => o.is_custom && o.id !== 'custom')
        const optionsToUpload = customOptions.map(o => ({
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
          addLog(`批量上传${optionsToUpload.length}个选项（已过滤固定按钮）`, 'success')
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
      addLog('同步失败', 'error', undefined, error?.message || JSON.stringify(error), {
        stack: error?.stack,
        requestInfo: `user_id: ${userId}, records: ${localData.records.length}`
      })
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

      const localCount = localDataRef.current.records.length
      const remoteCount = remoteData.records.length

      switch (strategy) {
        case 'remote':
          // 使用云端数据
          addLog('冲突解决：选择云端数据覆盖本地', 'success', undefined, undefined, undefined, {
            triggerReason: '用户手动选择云端',
            localCount,
            remoteCount
          })

          console.error('📦 [resolveConflict] 云端 profile 数据:', remoteData.profile)
          console.error('   头像:', remoteData.profile?.avatar ? remoteData.profile.avatar.substring(0, 50) + '...' : 'null')

          // ⭐ 构建完整的 profile 对象，确保包含 updated_at
          // 修复：只要云端有 profile 数据，就使用它，不要进行二次判断
          const remoteProfile = remoteData.profile && remoteData.profile.name
            ? {
                id: remoteData.profile.id || '',
                user_id: remoteData.profile.user_id || '',
                created_at: remoteData.profile.created_at || new Date().toISOString(),
                updated_at: remoteData.profile.updated_at || remoteData.profile.created_at || new Date().toISOString(),
                name: remoteData.profile.name,
                signature: remoteData.profile.signature || '练习、练习，一切随之而来。',
                avatar: remoteData.profile?.avatar || null,
                phone: remoteData.profile.phone,
                historical_days: remoteData.profile.historical_days || 0,
                historical_avg_minutes: remoteData.profile.historical_avg_minutes || 0,
              }
            : { name: '阿斯汤加习练者', signature: remoteData.profile?.signature || '练习、练习，一切随之而来。', avatar: remoteData.profile?.avatar || null, historical_days: 0, historical_avg_minutes: 0 }

          onSyncComplete({
            records: remoteData.records,
            options: remoteData.options || [],
            profile: remoteProfile
          })
          // ⭐ 关键修复：直接保存到 localStorage
          localStorage.setItem('ashtanga_records', JSON.stringify(remoteData.records))
          localStorage.setItem('ashtanga_options', JSON.stringify(remoteData.options || []))
          break

        case 'local':
          // 使用本地数据，覆盖云端
          addLog(`冲突解决：选择本地数据覆盖云端`, 'success', undefined, undefined, undefined, {
            triggerReason: '用户手动选择本地',
            localCount,
            remoteCount
          })

          // 1. 先删除云端所有数据（包括记录和选项）
          const { error: deleteError } = await supabase
            .from(TABLES.PRACTICE_RECORDS)
            .delete()
            .eq('user_id', user.id)

          if (deleteError) {
            throw new Error(`删除云端数据失败: ${deleteError.message}`)
          }

          // 同时删除云端所有选项
          await supabase
            .from(TABLES.PRACTICE_OPTIONS)
            .delete()
            .eq('user_id', user.id)

          addLog('云端数据已清空', 'success')

          // 2. 上传本地数据
          const result = await uploadLocalData(user.id, localDataRef.current, user)
          if (!result.success) {
            throw new Error('上传本地数据失败')
          }
          break

        case 'merge':
          // 智能合并
          addLog(`冲突解决：智能合并`, 'success', undefined, undefined, undefined, {
            triggerReason: '用户手动选择合并',
            localCount,
            remoteCount
          })
          // ⭐ 使用 ref 获取最新的 localData
          const freshLocalDataForMerge = localDataRef.current
          const { localOnly, remoteOnly, localNewer, remoteNewer } = diffRecords(freshLocalDataForMerge.records, remoteData.records)

          await smartMerge(localOnly, remoteOnly, localNewer, remoteNewer, remoteData)
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
  const addLog = (
    action: string,
    status: 'success' | 'error' | 'warning',
    recordId?: string,
    error?: string,
    details?: {
      stack?: string
      retryCount?: number
      requestInfo?: string
      responseStatus?: number
    },
    extra?: {
      triggerReason?: string
      localCount?: number
      remoteCount?: number
    }
  ) => {
    // 限制错误消息长度（200字符）
    const truncatedError = error ? error.slice(0, 200) + (error.length > 200 ? '...' : '') : undefined
    // 限制堆栈长度（500字符）
    const truncatedStack = details?.stack ? details.stack.slice(0, 500) + (details.stack.length > 500 ? '...' : '') : undefined

    const log: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      status,
      triggerReason: extra?.triggerReason || currentTriggerReasonRef.current || '未知触发原因',
      localCount: extra?.localCount,
      remoteCount: extra?.remoteCount,
      recordId,
      error: truncatedError,
      details: details ? {
        stack: truncatedStack,
        retryCount: details.retryCount,
        requestInfo: details.requestInfo,
        responseStatus: details.responseStatus
      } : undefined
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

    // ⭐ 同时记录到全局错误历史（用于日志导出）
    if (status === 'error' && typeof window !== 'undefined') {
      try {
        const existingErrors = JSON.parse(localStorage.getItem('__errorHistory') || '[]')
        const errorEntry = {
          timestamp: new Date().toISOString(),
          action,
          error: truncatedError,
          stack: truncatedStack,
          retryCount: details?.retryCount,
          userAgent: navigator.userAgent.substring(0, 100),
          url: window.location.href
        }
        const newErrors = [errorEntry, ...existingErrors].slice(0, 20)
        localStorage.setItem('__errorHistory', JSON.stringify(newErrors))
      } catch (e) {
        // 忽略 localStorage 错误
      }
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
