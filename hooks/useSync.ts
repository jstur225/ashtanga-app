"use client"

import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from 'react-use'
import type { PracticeRecord, PracticeOption, UserProfile } from '@/lib/supabase'
import { buildProfileFromRemote, mergeRecords, mergeOptions, applySafeMerge, sortAndLimitRecords, buildUploadRecordPayload, resolveRecordColorLevel, createSyncLogEntry, trimSyncLogs, appendSyncErrorHistory, batchUploadRecords, buildOptionsUploadPayload, type SyncLogEntry, type UploadRecordPayload } from '@/lib/sync-utils'
import { withRetry, persistFailedSyncIds, loadFailedSyncIds } from '@/lib/sync-retry'
import {
  buildCompleteProfile,
  mapRemoteRecord,
  isValidRemoteRecord,
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
import { analyzeSync, executeConflictStrategy, computeSyncStats, recordPracticeIfNeeded, resolveConflict as resolveConflictOrchestrator, type ConflictDeps } from '@/lib/sync-orchestrator'

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

// ⭐ 从 localStorage 获取最新数据（避免闭包陷阱）
// 模块级纯函数：读取 localStorage，失败时回退到调用方提供的 fallback。
function readLatestLocalData(fallback: RemoteSyncData): RemoteSyncData {
  try {
    const recordsStr = localStorage.getItem('ashtanga_records')
    const optionsStr = localStorage.getItem('ashtanga_options')
    const profileStr = localStorage.getItem('ashtanga_profile')
    const records = recordsStr ? JSON.parse(recordsStr) : fallback.records
    const options = optionsStr ? JSON.parse(optionsStr) : fallback.options
    const profile = profileStr ? JSON.parse(profileStr) : fallback.profile

    return {
      records: Array.isArray(records) ? records as PracticeRecord[] : fallback.records,
      options: Array.isArray(options) ? options as PracticeOption[] : fallback.options,
      profile: profile && typeof profile === 'object' ? profile as UserProfile : fallback.profile,
    }
  } catch (e) {
    console.error('❌ [readLatestLocalData] 读取 localStorage 失败:', e)
    return fallback
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
  // 自动重试防重复标记（仅允许一次自动重试）
  const autoRetriedRef = useRef(false)
  // 并发队列：同步中收到新请求时标记，结束后补一次
  const pendingSyncRef = useRef(false)

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
    // 如果当前会话已经自动同步过，跳过
    if (hasAutoSyncedInSession) {
      syncDebug('⏸️ [useEffect] 当前会话已自动同步过，跳过')
      return
    }

    // 如果正在同步中，跳过
    if (isSyncingRef.current) {
      return
    }

    if (user && localData.records.length >= 0) {
      // 标记当前会话已自动同步
      if (typeof window !== 'undefined') {
        (window as any).__hasAutoSynced__ = true
      }
      autoSync()
    }
  }, [user?.id])

  // ⭐ 从 localStorage 获取最新数据（避免闭包陷阱）— 委托给模块级函数
  const getLatestLocalData = () => readLatestLocalData(localDataRef.current)

  // ==================== 自动同步函数 ====================
  const autoSync = async (triggerReason?: string) => {
    // 防止重复调用
    if (isSyncingRef.current) {
      pendingSyncRef.current = true
      syncDebug('⏸️ [autoSync] 已有同步任务在执行，标记后续同步')
      return
    }

    // ⭐ 记录触发原因（默认取全局，若未传入则置默认）
    currentTriggerReasonRef.current = triggerReason || '应用启动自动同步'

    // ⭐ 从 localStorage 获取最新数据，避免闭包陷阱
    const freshLocalData = getLatestLocalData()

    syncDebug(`[autoSync] 触发原因: ${triggerReason || '(默认)'}，本地 ${freshLocalData.records.length} 条`)

    if (!user) {
      syncDebug('[autoSync] 用户未登录，退出')
      return
    }

    // 设置同步标志
    isSyncingRef.current = true
    // 每次新同步开始时重置自动重试标记
    autoRetriedRef.current = false

    setSyncStatus('syncing')

    addLog('启动自动同步', 'success', undefined, undefined, undefined, {
      triggerReason: currentTriggerReasonRef.current || '(默认)',
      localCount: freshLocalData.records.length
    })

    try {
      // 1. 下载云端数据
      const remoteData = await downloadRemoteData(user.id)
      if (!remoteData) {
        throw new Error('下载云端数据失败')
      }

      const localCount = freshLocalData.records.length
      const remoteCount = remoteData.records.length

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

      switch (analysis.decision.action) {
        case 'noop':
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
      // 自动重试一次（2 秒后），避免单次网络抖动导致失败
      if (!autoRetriedRef.current) {
        autoRetriedRef.current = true
        setTimeout(() => {
          autoRetriedRef.current = false // 为下次同步重置
          autoSync('自动重试: ' + currentTriggerReasonRef.current)
        }, 2000)
      }
      return false
    } finally {
      // 兜底：确保今天有练习记录时 has_practiced 被标记
      recordPracticeIfNeeded()

      // 清理同步标志，允许下次同步
      isSyncingRef.current = false
      syncDebug('[autoSync] 同步完成，清理标志')
      // ⭐ 确保如果状态仍然是 syncing，重置为 idle（防止卡住）
      setSyncStatus(prev => prev === 'syncing' ? 'idle' : prev)

      // 如果有排队请求，触发后续同步
      if (pendingSyncRef.current) {
        pendingSyncRef.current = false
        syncDebug('🔄 [autoSync] 检测到排队请求，启动后续同步')
        autoSync('后续: ' + currentTriggerReasonRef.current)
      }
    }
  }

  // ⭐ 手动重置同步状态（用于卡顿时）
  const resetSyncStatus = () => {
    isSyncingRef.current = false
    setSyncStatus('idle')
    addLog('手动重置同步状态', 'success')
  }

  // ==================== 下载云端数据 ====================
  const downloadRemoteData = async (userId: string, retryCount = 0): Promise<RemoteSyncData | null> => {
    try {
      const { recordsRes, optionsRes, profileRes } = await fetchAllUserData(userId)

      syncDebug(`📥 [downloadRemoteData] 查询完成: records=${recordsRes.data?.length}, options=${optionsRes.data?.length}, errors=${!!recordsRes.error}/${!!optionsRes.error}/${!!profileRes.error}`)

      if (recordsRes.error) throw recordsRes.error
      if (optionsRes.error) throw optionsRes.error
      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error // PGRST116 表示没有找到，可以忽略

      // 修复：解析 photos JSON 字符串为数组，过滤无效记录
      const records = (recordsRes.data || []).filter((r: unknown) => {
        const valid = isValidRemoteRecord(r)
        if (!valid) {
          syncDebug('   ⚠️ 过滤掉无效记录:', r)
        }
        return valid
      }).map((r: any) => mapRemoteRecord(r))

      syncDebug(`📥 [downloadRemoteData] 处理后: ${records.length} 条有效记录, ${optionsRes.data?.length} 个选项`)

      // 修复：过滤掉无效的选项（id 必须存在）
      const options = (optionsRes.data || []).filter(o => {
        const isValid = isValidRemoteOption(o)
        if (!isValid) {
          syncDebug('   ⚠️ 过滤掉无效选项:', o)
        }
        return isValid
      })

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

  // ==================== 共享：构造上传 payload + 安全合并云端已有记录 ====================
  // 被 uploadLocalRecords 和 uploadLocalData 共用，避免两处重复实现。
  // 差异通过 config 参数注入：mergeUpdatedAt（合并时间戳策略）、logMergeSuccess（addLog 还是 syncDebug）
  const prepareRecordsForSafeUpload = async (
    userId: string,
    recordsToSync: PracticeRecord[],
    options: PracticeOption[] | undefined,
    config: { mergeUpdatedAt: boolean; logLabel: string; logMergeSuccess: boolean },
  ): Promise<UploadRecordPayload[]> => {
    // ⭐ 过滤系统记录：教程记录不应上传到云端
    const filteredRecords = recordsToSync.filter(r => !r.is_tutorial)
    if (filteredRecords.length === 0) return []

    let recordsToUpload = filteredRecords.map(r =>
      buildUploadRecordPayload(r, userId, resolveRecordColorLevel(r, options))
    )

    try {
      const localIds = recordsToUpload.map(r => r.id)
      const { data: cloudRecords } = await fetchCloudRecordsForMerge(localIds)

      if (cloudRecords && cloudRecords.length > 0) {
        const cloudMap = new Map(cloudRecords.map(r => [r.id, r]))
        const { merged, mergedCount } = applySafeMerge(
          recordsToUpload, cloudMap, config.mergeUpdatedAt
        )

        if (mergedCount > 0) {
          recordsToUpload = merged
          if (config.logMergeSuccess) {
            addLog(`安全合并 ${mergedCount} 条云端已有内容的记录`, 'success')
          } else {
            syncDebug(`✅ [${config.logLabel}] 安全合并 ${mergedCount} 条云端已有内容的记录`)
          }
        }
      }
    } catch (mergeErr) {
      console.error(`⚠️ [${config.logLabel}] 安全合并失败，继续直接上传:`, mergeErr)
    }

    return recordsToUpload
  }

  // ==================== 上传本地记录 ====================
  const uploadLocalRecords = async (userId: string, records: PracticeRecord[], options?: PracticeOption[]) => {
    if (records.length === 0) return { success: true, localOnlyCount: 0 }

    // ⭐ 1000 条限制：保留最新的 1000 条
    const { toSync: recordsToSync, localOnlyCount } = sortAndLimitRecords(records, MAX_SYNC_RECORDS)

    if (localOnlyCount > 0) {
      syncDebug(`⚠️ [uploadLocalRecords] 同步限制：只上传最新的${MAX_SYNC_RECORDS}条记录`)
      addLog(`${localOnlyCount}条记录仅本地保存`, 'success')
    }

    // 构造 payload + 安全合并（mergeUpdatedAt=true：合并时间戳）
    const recordsToUpload = await prepareRecordsForSafeUpload(
      userId, recordsToSync, options,
      { mergeUpdatedAt: true, logLabel: 'uploadLocalRecords', logMergeSuccess: true },
    )

    // ⭐ 显示排查日志到页面
    addLog(`准备上传 ${recordsToUpload.length} 条记录`, 'success')

    // ⭐ 检查数据格式
    const firstRecord = recordsToUpload[0]
    addLog(`首条记录ID: ${firstRecord?.id?.slice(0,8)}...`, 'success')
    addLog(`首条日期: ${firstRecord?.date}`, 'success')
    addLog(`照片字段类型: ${typeof firstRecord?.photos}`, 'success')

    // ⭐ 分批上传：每批 50 条
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
      persistFailedSyncIds(failedIds)
      setLastSyncStatus('error')
      return { success: false, localOnlyCount }
    } else {
      addLog(`全部上传成功: ${successCount} 条`, 'success')
      setFailedSyncIds([])
      persistFailedSyncIds([])
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
    // ⭐ 用户隔离守卫：未登录时禁止任何上传（autoSync/resolveConflict 已有保护，
    // 但被 return 暴露的 uploadLocalData 必须自带守卫，防止外部直接调用导致脏数据）
    if (!user) {
      console.warn('[uploadLocalData] 未登录用户禁止上传')
      return { success: false, localOnlyCount: 0, syncedCount: 0, totalCount: 0 }
    }
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

      // 防御：确保远端返回的是合法 JSON，非 2xx 时优先用 statusText
      let profileResult: any
      try {
        profileResult = await profileResponse.json()
      } catch {
        throw new Error(`上传用户资料失败: HTTP ${profileResponse.status} ${profileResponse.statusText}`)
      }
      if (!profileResponse.ok) {
        throw new Error(profileResult.error || profileResponse.statusText || '上传用户资料失败')
      }

      addLog('上传用户资料', 'success')

      // 2. 批量上传练习记录（使用 upsert）- 使用限制后的 recordsToSync（最新的1000条）
      if (recordsToSync.length > 0) {
        const recordsToUpload = await prepareRecordsForSafeUpload(
          userId, recordsToSync, options,
          { mergeUpdatedAt: false, logLabel: 'uploadLocalData', logMergeSuccess: false },
        )

        try {
          await withRetry(
            async () => {
              const { error } = await repoUpsertRecords(recordsToUpload as unknown as Record<string, unknown>[])
              if (error) throw error
            },
            { maxRetries: 2, baseDelay: 1000, onRetry: (attempt) => {
              syncDebug(`🔄 [uploadLocalData] 记录上传重试 (${attempt}/2)...`)
              addLog(`记录上传重试 (${attempt}/2)...`, 'warning')
            }},
          )
          addLog(`批量上传${recordsToUpload.length}条记录`, 'success')
        } catch (error: any) {
          // 记录失败的记录ID
          recordsToUpload.forEach(r => failedIds.push(r.id))
          addLog('批量上传记录', 'error', undefined, error.message)
          console.error('❌ [uploadLocalData] upsert 失败:', error)
        }
      }

      // 3. 批量上传练习选项（只同步自定义选项，color_level 不同步，留在本地）
      if (options.length > 0) {
        const optionsToUpload = buildOptionsUploadPayload(options, userId)

        try {
          await withRetry(
            async () => {
              const { error } = await repoUpsertOptions(optionsToUpload as unknown as Record<string, unknown>[])
              if (error) throw error
            },
            { maxRetries: 2, baseDelay: 1000, onRetry: (attempt) => {
              syncDebug(`🔄 [uploadLocalData] 选项上传重试 (${attempt}/2)...`)
            }},
          )
          addLog(`批量上传${optionsToUpload.length}个选项（已过滤固定按钮）`, 'success')
        } catch (error: any) {
          console.error('❌ 批量上传选项失败:', error)
          addLog('批量上传选项', 'error', undefined, error.message)
        }
      }

      // ⭐ 计算实际上传成功的记录数
      const successfullySynced = recordsToSync.length - failedIds.length

      // 更新失败列表
      setFailedSyncIds(failedIds)
      persistFailedSyncIds(failedIds)
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
      const deps: ConflictDeps = {
        downloadRemoteData,
        uploadLocalData,
        uploadLocalRecords,
        repoDeleteAllUserRecords,
        repoDeleteAllUserOptions,
        onSyncComplete,
        addLog,
      }

      const result = await resolveConflictOrchestrator(strategy, user.id, user, localDataRef.current, deps)

      if (result.success) {
        setSyncStatus('success')
        setLastSyncStatus('success')
        setLastSyncTime(Date.now())
      } else {
        throw new Error(result.error || '处理冲突失败')
      }
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
