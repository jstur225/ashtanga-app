"use client"

import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from 'react-use'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'
import { diffRecords, buildProfileFromRemote, mergeRecords, mergeOptions, applySafeMerge, sortAndLimitRecords, buildUploadRecordPayload, resolveRecordColorLevel, createSyncLogEntry, trimSyncLogs, appendSyncErrorHistory, batchUploadRecords, buildOptionsUploadPayload, type SyncLogEntry } from '@/lib/sync-utils'
import {
  buildCompleteProfile,
  mapRemoteRecord,
  isValidRemoteOption,
  mapRemoteProfile,
} from '@/lib/sync-mappers'
import {
  fetchAllUserData,
  fetchCloudRecordsForMerge,
  upsertRecords as repoUpsertRecords,
  upsertOptions as repoUpsertOptions,
  deleteAllUserRecords as repoDeleteAllUserRecords,
  deleteAllUserOptions as repoDeleteAllUserOptions,
} from '@/lib/supabase-repository'
import { analyzeSync, executeConflictStrategy, computeSyncStats, recordPracticeIfNeeded } from '@/lib/sync-orchestrator'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
type ConflictStrategy = 'remote' | 'local' | 'merge'
type RemoteSyncData = {
  records: PracticeRecord[]
  options: PracticeOption[]
  profile: UserProfile
}

// ⭐ 同步限制配置（硬上限1000条，防止攻击）
const MAX_SYNC_RECORDS = 1000
const SYNC_DEBUG_STORAGE_KEY = '__debug_sync__'

function syncDebug(...args: unknown[]) {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(SYNC_DEBUG_STORAGE_KEY) === 'true') {
      console.debug(...args)
    }
  } catch {
    // Ignore storage access failures; sync diagnostics are optional.
  }
}

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // 防止重复调用的 ref
  const isSyncingRef = useRef(false)

  // 使用 ref 保存最新的 localData，修复闭包陷阱
  const localDataRef = useRef(localData)
  localDataRef.current = localData

  // 持久化状态（存储到 localStorage）
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<number | null>('last_sync_time', null)
  const [lastSyncStatus, setLastSyncStatus] = useLocalStorage<SyncStatus>('last_sync_status', 'idle')
  const [failedSyncIds, setFailedSyncIds] = useLocalStorage<string[]>('failed_sync_ids', [])
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
    const stats = computeSyncStats(localData.records)

    // 按日期排序（最新的在前），然后截取最新的1000条
    const sortedRecords = [...localData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
    const localOnlyCount = localData.records.length - recordsToSync.length

    syncDebug('📊 [useSync] 计算本地统计:', {
      totalPractices: stats.totalPractices,
      localCount: localData.records.length,
      recordsToSyncLength: recordsToSync.length,
      localOnlyCount,
      hasLimitWarning: localOnlyCount > 0
    })

    setSyncStats(prev => ({
      ...prev,
      totalLocalRecords: stats.totalPractices,
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
    syncDebug('🔍 [useEffect] 触发', {
      hasUser: !!user,
      userId: user?.id,
      localDataLength: localData.records.length,
      isSyncing: isSyncingRef.current,
      hasAutoSyncedInSession
    })

    // 如果当前会话已经自动同步过，跳过
    if (hasAutoSyncedInSession) {
      syncDebug('⏸️ [useEffect] 当前会话已自动同步过，跳过')
      return
    }

    // 如果正在同步中，跳过
    if (isSyncingRef.current) {
      syncDebug('⏸️ [useEffect] 正在同步中，跳过重复调用')
      return
    }

    if (user && localData.records.length >= 0) {
      syncDebug('✅ [useEffect] 首次同步，准备调用 autoSync')
      // 标记当前会话已自动同步
      if (typeof window !== 'undefined') {
        (window as any).__hasAutoSynced__ = true
      }
      // 用户登录后，立即启动自动同步
      autoSync()
    } else {
      syncDebug('⏸️ [useEffect] 条件不满足，跳过自动同步')
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

      syncDebug('📦 [getLatestLocalData] 从 localStorage 读取:', {
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
      syncDebug('⏸️ [autoSync] 已有同步任务在执行，跳过')
      return
    }

    // ⭐ 记录触发原因（默认取全局，若未传入则置默认）
    currentTriggerReasonRef.current = triggerReason || '应用启动自动同步'

    // ⭐ 从 localStorage 获取最新数据，避免闭包陷阱
    const freshLocalData = getLatestLocalData()

    syncDebug('🚨🚨🚨 [autoSync] 函数被调用了！🚨🚨🚨')
    syncDebug('='.repeat(50))
    syncDebug('[autoSync] 函数开始执行')
    syncDebug('   - 触发原因:', triggerReason || '(默认)')
    syncDebug('='.repeat(50))
    syncDebug('[autoSync] 🔍 localData 详情:')
    syncDebug('   - records.length:', freshLocalData.records.length)
    syncDebug('   - records[最后一条]?.id:', freshLocalData.records[freshLocalData.records.length - 1]?.id)
    syncDebug('   - options.length:', freshLocalData.options.length)
    syncDebug('   - profile.name:', freshLocalData.profile?.name)

    if (!user) {
      syncDebug('[autoSync] 用户未登录，退出')
      return
    }

    // 设置同步标志
    isSyncingRef.current = true
    syncDebug('[autoSync] 设置同步标志')

    syncDebug('[autoSync] 用户已登录，开始同步')
    syncDebug('   user_id:', user.id)
    syncDebug('   localData.records.length:', freshLocalData.records.length)

    syncDebug('[autoSync] 设置状态为 syncing...')
    setSyncStatus('syncing')
    syncDebug('[autoSync] 状态已设置为 syncing')

    syncDebug('[autoSync] 添加日志...')
    addLog('启动自动同步', 'success', undefined, undefined, undefined, {
      triggerReason: currentTriggerReasonRef.current || '(默认)',
      localCount: freshLocalData.records.length
    })
    syncDebug('[autoSync] 日志已添加')

    try {
      syncDebug('[autoSync] 开始下载云端数据...')
      // 1. 下载云端数据
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      syncDebug('[autoSync] 云端数据下载成功')
      syncDebug('   remoteData.records.length:', remoteData.records?.length)

      const localCount = freshLocalData.records.length
      const remoteCount = remoteData.records.length

      syncDebug(`📊 [autoSync] 数据对比：本地${localCount}条，云端${remoteCount}条`)

      // ⭐ 计算同步限制（用于显示上限提醒）
      // ⭐ 按日期排序（最新的在前），然后截取最新的1000条
      const sortedRecords = [...freshLocalData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const recordsToSync = sortedRecords.slice(0, MAX_SYNC_RECORDS)
      const localOnlyCount = localCount - recordsToSync.length

      if (localOnlyCount > 0) {
        syncDebug(`⚠️ [autoSync] 同步限制：${localOnlyCount}条最新记录仅保存在本地`)
      }

      // 2. 智能同步策略（使用 orchestrator 纯函数决策）
      // ⭐ 使用截取后的 recordsToSync 进行比对
      const effectiveLocalRecords = localOnlyCount > 0 ? recordsToSync : freshLocalData.records

      // ⭐ 云端数据也只取前1000条进行比对
      const effectiveRemoteRecords = remoteCount > MAX_SYNC_RECORDS
        ? [...remoteData.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_SYNC_RECORDS)
        : remoteData.records

      const analysis = analyzeSync(
        effectiveLocalRecords,
        effectiveRemoteRecords,
        freshLocalData.options || [],
        remoteData.options || [],
        freshLocalData.profile,
        remoteData.profile,
        MAX_SYNC_RECORDS,
        user.id,
      )

      syncDebug(`📊 [autoSync] 分析结果：${analysis.decision.action}（本地${analysis.localCount}条，云端${analysis.remoteCount}条）`)

      switch (analysis.decision.action) {
        case 'noop':
          syncDebug('[autoSync] 数据已一致，无需同步')
          addLog(`数据一致，无需同步：${analysis.decision.reason}`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount: analysis.localCount,
            remoteCount: analysis.remoteCount
          })
          setSyncStatus('success')
          return true

        case 'upload-local': {
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

        case 'merge-remote': {
          const mergedRecords = mergeRecords(
            effectiveLocalRecords,
            analysis.decision.mergedRecords,
            [],
          )
          const mergedOptions = mergeOptions(
            analysis.decision.remoteOptions,
            freshLocalData.options || [],
          )
          const mergedProfile = buildProfileFromRemote(remoteData.profile, freshLocalData.profile)

          addLog(`同步云端变更：合并 ${analysis.decision.mergedCount} 条`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount: analysis.localCount,
            remoteCount: analysis.remoteCount
          })

          onSyncComplete({
            records: mergedRecords,
            options: mergedOptions,
            profile: mergedProfile
          })
          localStorage.setItem('ashtanga_records', JSON.stringify(mergedRecords))
          localStorage.setItem('ashtanga_options', JSON.stringify(mergedOptions))
          syncDebug('✅ [autoSync] records 和 options 已保存到 localStorage')
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
          setSyncStats({
            totalLocalRecords: mergedRecords.length,
            syncedRecords: mergedRecords.length,
            maxSyncRecords: MAX_SYNC_RECORDS,
            localOnlyCount: 0,
            hasLimitWarning: false
          })
          return true
        }

        case 'use-remote-only': {
          const remoteRecordsToUse = analysis.remoteCount > MAX_SYNC_RECORDS
            ? analysis.decision.remoteRecords.slice(0, MAX_SYNC_RECORDS)
            : analysis.decision.remoteRecords
          const cloudProfile = buildCompleteProfile(remoteData.profile)

          addLog(`仅云端有数据：下载${remoteRecordsToUse.length}条`, 'success', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount: analysis.localCount,
            remoteCount: analysis.remoteCount
          })

          onSyncComplete({
            records: remoteRecordsToUse,
            options: analysis.decision.remoteOptions || [],
            profile: cloudProfile
          })
          localStorage.setItem('ashtanga_records', JSON.stringify(remoteRecordsToUse))
          localStorage.setItem('ashtanga_options', JSON.stringify(analysis.decision.remoteOptions || []))
          syncDebug('✅ [autoSync] 云端数据已保存到 localStorage')
          setSyncStatus('success')
          setLastSyncStatus('success')
          setLastSyncTime(Date.now())
          setSyncStats({
            totalLocalRecords: remoteRecordsToUse.length,
            syncedRecords: remoteRecordsToUse.length,
            maxSyncRecords: MAX_SYNC_RECORDS,
            localOnlyCount: 0,
            hasLimitWarning: false
          })
          return true
        }

        case 'conflict': {
          addLog(`检测到冲突：本地${analysis.localCount}条变更，云端${analysis.remoteCount}条变更`, 'warning', undefined, undefined, undefined, {
            triggerReason: currentTriggerReasonRef.current,
            localCount: analysis.localCount,
            remoteCount: analysis.remoteCount
          })
          if (onConflictDetected) {
            onConflictDetected(analysis.localCount, analysis.remoteCount)
          }
          setSyncStatus('idle')
          return false
        }
      }

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
      recordPracticeIfNeeded()

      // 清理同步标志，允许下次同步
      isSyncingRef.current = false
      syncDebug('[autoSync] 同步完成，清理标志')
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
  const downloadRemoteData = async (userId: string, retryCount = 0): Promise<RemoteSyncData | null> => {
    try {
      syncDebug('📥 [downloadRemoteData] 开始下载，userId:', userId, '重试次数:', retryCount)

      const { recordsRes, optionsRes, profileRes } = await fetchAllUserData(userId)

      syncDebug('📥 [downloadRemoteData] 查询完成')
      syncDebug('   recordsRes.error:', recordsRes.error)
      syncDebug('   optionsRes.error:', optionsRes.error)
      syncDebug('   profileRes.error:', profileRes.error)
      syncDebug('   recordsRes.data.length:', recordsRes.data?.length)

      if (recordsRes.error) throw recordsRes.error
      if (optionsRes.error) throw optionsRes.error
      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error // PGRST116 表示没有找到，可以忽略

      // 修复：解析 photos JSON 字符串为数组
      const records = (recordsRes.data || []).map((r: any) => mapRemoteRecord(r))

      syncDebug('📥 [downloadRemoteData] 记录处理完成，数量:', records.length)
      syncDebug('📦 [downloadRemoteData] 云端选项数据:', optionsRes.data)
      syncDebug('   选项数量:', optionsRes.data?.length)

      // 修复：过滤掉无效的选项（id 必须存在）
      const options = (optionsRes.data || []).filter(o => {
        const isValid = isValidRemoteOption(o)
        if (!isValid) {
          syncDebug('   ⚠️ 过滤掉无效选项:', o)
        }
        return isValid
      })

      syncDebug('   ✅ 有效选项数量:', options.length)
      syncDebug('📥 [downloadRemoteData] 云端 profile:', profileRes.data)
      syncDebug('   头像字段:', profileRes.data?.avatar ? '有值' : '无值')

      // ⭐ 构建返回的 profile，确保包含 updated_at 字段
      const profile = mapRemoteProfile(profileRes.data)

      return {
        records,
        options,
        profile,
      }
    } catch (error: any) {
      console.error('❌ [downloadRemoteData] 下载失败:', error.message)

      // ⭐ 自动重试机制（最多重试2次）
      if (retryCount < 2) {
        syncDebug(`🔄 [downloadRemoteData] 准备第 ${retryCount + 1} 次重试...`)
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
    const { toSync: recordsToSync, localOnlyCount } = sortAndLimitRecords(records, MAX_SYNC_RECORDS)

    if (localOnlyCount > 0) {
      syncDebug(`⚠️ [uploadLocalRecords] 同步限制：只上传最新的${MAX_SYNC_RECORDS}条记录`)
      addLog(`${localOnlyCount}条记录仅本地保存`, 'success')
    }

    let recordsToUpload = recordsToSync.map(r => buildUploadRecordPayload(r, userId, resolveRecordColorLevel(r, options)))

    // ⭐ 安全合并：上传前查询云端已有记录，防止本地空白覆盖云端有内容的记录
    try {
      const localIds = recordsToUpload.map(r => r.id)
      const { data: cloudRecords } = await fetchCloudRecordsForMerge(localIds)

      if (cloudRecords && cloudRecords.length > 0) {
        const cloudMap = new Map(cloudRecords.map(r => [r.id, r]))
        const { merged, mergedCount } = applySafeMerge(recordsToUpload, cloudMap, true)

        if (mergedCount > 0) {
          recordsToUpload = merged
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
    addLog(`准备上传 ${recordsToUpload.length} 条记录`, 'success')
    const { successCount, failedIds, lastError } = await batchUploadRecords(
      recordsToUpload,
      batch => repoUpsertRecords(batch as unknown as Record<string, unknown>[]),
    )

    // ⭐ 上传结果处理
    if (failedIds.length > 0) {
      addLog(`失败 ${failedIds.length} 条，成功 ${successCount} 条`, 'error')

      // 400 错误时打印样本记录格式
      if (lastError?.message?.includes('400')) {
        addLog('400 错误: 请求格式不正确', 'error')
        const sampleRecord = recordsToUpload[0]
        if (sampleRecord) {
          addLog(`样本记录ID: ${sampleRecord.id}`, 'error')
          addLog(`样本日期: ${sampleRecord.date}`, 'error')
          addLog(`样本类型: ${sampleRecord.type}`, 'error')
          addLog(`样本时长: ${sampleRecord.duration} (类型: ${typeof sampleRecord.duration})`, 'error')
          addLog(`照片类型: ${typeof sampleRecord.photos}`, 'error')
          addLog(`更新时间: ${sampleRecord.updated_at}`, 'error')
        }
      }

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

      // ⭐ 新增：1000条记录限制
      const { toSync: recordsToSync, localOnlyCount } = sortAndLimitRecords(records, MAX_SYNC_RECORDS)

      if (localOnlyCount > 0) {
        syncDebug(`⚠️ [uploadLocalData] 同步限制：只同步最新的${MAX_SYNC_RECORDS}条记录，${localOnlyCount}条旧记录仅保留在本地`)
        addLog(`${localOnlyCount}条旧记录仅本地保存`, 'success')
      }

      // 1. 上传用户资料（使用服务端 API 绕过 RLS）
      syncDebug('📤 开始上传用户资料（服务端 API）...')
      syncDebug('   profile.name:', profile.name)
      syncDebug('   profile.signature:', profile.signature)

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

      syncDebug('✅ 用户资料上传成功:', profileResult)
      addLog('上传用户资料', 'success')

      // 2. 批量上传练习记录（使用 upsert）- 使用限制后的 recordsToSync（最新的1000条）
      if (recordsToSync.length > 0) {
        let recordsToUpload = recordsToSync.map(r => buildUploadRecordPayload(r, userId, resolveRecordColorLevel(r, options)))

        // ⭐ 安全合并：上传前查询云端已有记录，防止本地空白覆盖云端有内容的记录
        try {
          const localIds = recordsToUpload.map(r => r.id)
          const { data: cloudRecords } = await fetchCloudRecordsForMerge(localIds)

          if (cloudRecords && cloudRecords.length > 0) {
            const cloudMap = new Map(cloudRecords.map(r => [r.id, r]))
            const { merged, mergedCount } = applySafeMerge(recordsToUpload, cloudMap)

            if (mergedCount > 0) {
              recordsToUpload = merged
              syncDebug(`✅ [uploadLocalData] 安全合并 ${mergedCount} 条云端已有内容的记录`)
            }
          }
        } catch (mergeErr) {
          console.error('⚠️ [uploadLocalData] 安全合并失败，继续直接上传:', mergeErr)
        }

        syncDebug(`📤 [uploadLocalData] 准备上传${recordsToUpload.length}条记录`)
        syncDebug('📤 [uploadLocalData] 记录IDs:', recordsToUpload.map(r => r.id))

        const { error: recordsError, data: upsertData } = await repoUpsertRecords(recordsToUpload as unknown as Record<string, unknown>[])

        if (recordsError) {
          // 记录失败的记录ID
          records.forEach(r => failedIds.push(r.id))
          addLog('批量上传记录', 'error', undefined, recordsError.message)
          console.error('❌ [uploadLocalData] upsert 失败:', recordsError)
        } else {
          addLog(`批量上传${recordsToSync.length}条记录`, 'success')
          syncDebug(`✅ [uploadLocalData] upsert 成功，返回${upsertData?.length || 0}条记录`)
        }
      }

      // 3. 批量上传练习选项（只同步自定义选项，color_level 不同步，留在本地）
      if (options.length > 0) {
        const optionsToUpload = buildOptionsUploadPayload(options, userId)

        const { error: optionsError } = await repoUpsertOptions(optionsToUpload as unknown as Record<string, unknown>[])

        if (optionsError) {
          console.error('❌ 批量上传选项失败:', optionsError)
          console.error('   错误详情:', JSON.stringify(optionsError, null, 2))
          syncDebug('   上传的数据:', JSON.stringify(optionsToUpload, null, 2))
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

          syncDebug('📦 [resolveConflict] 云端 profile 数据:', remoteData.profile)
          syncDebug('   头像:', remoteData.profile?.avatar ? remoteData.profile.avatar.substring(0, 50) + '...' : 'null')

          // ⭐ 构建完整的 profile 对象，确保包含 updated_at
          // 修复：只要云端有 profile 数据，就使用它，不要进行二次判断
          const remoteProfile = buildCompleteProfile(remoteData.profile)

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
          const { error: deleteError } = await repoDeleteAllUserRecords(user.id)

          if (deleteError) {
            throw new Error(`删除云端数据失败: ${deleteError.message}`)
          }

          // 同时删除云端所有选项
          await repoDeleteAllUserOptions(user.id)

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
    status: SyncLogEntry['status'],
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
    const entry = createSyncLogEntry(action, status, {
      recordId,
      error,
      triggerReason: extra?.triggerReason || currentTriggerReasonRef.current || '未知触发原因',
      localCount: extra?.localCount,
      remoteCount: extra?.remoteCount,
      details,
    })
    setSyncLogs(trimSyncLogs(syncLogs ?? [], entry))
    appendSyncErrorHistory(entry)
  }

  return {
    syncStatus,
    lastSyncTime,
    lastSyncStatus,
    failedSyncIds,
    setFailedSyncIds,
    setLastSyncStatus,
    syncLogs,
    syncStats,
    autoSync,
    uploadLocalData,
    resolveConflict,
    resetSyncStatus,
  }
}
