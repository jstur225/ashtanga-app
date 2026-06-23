"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useLocalStorage } from 'react-use';
import { motion, AnimatePresence } from "framer-motion"
import dynamic from 'next/dynamic'
import { usePracticeData, type PracticeRecord, type PracticeOption, type UserProfile, GUIDED_AUDIO_OPTION, MAX_SLOTS_FREE, MAX_SLOTS_PRO } from "@/hooks/usePracticeData"
import { useMembership } from "@/hooks/useMembership"
import { useAnnotations } from "@/hooks/useAnnotations"
import { useAuth } from "@/hooks/useAuth"
import { useSync } from "@/hooks/useSync"
import { usePracticeSession } from "@/hooks/usePracticeSession"
import { useGuidedAudio } from "@/hooks/useGuidedAudio"
import { useChantPlayback } from "@/hooks/useChantPlayback"
import { usePracticeCommands } from "@/hooks/usePracticeCommands"
import { User, Upload, Plus, Minus, Share2, Sparkles, Check, ClipboardPaste, Volume2, Ticket, Loader2, Users } from "lucide-react"
import { cn } from '@/lib/utils'
import { getColorClass } from '@/lib/sync-utils'
import { VoiceButton } from "@/components/VoiceButton"
import { CompletionSheet } from "@/components/practice-record/CompletionSheet"
import { PhotoUploadButton } from "@/components/PhotoUploadButton"
import { toast } from 'sonner'
import { trackEvent, setUserProfile } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getLocalDateStr } from '@/lib/practice-utils'
import { collectPracticeDebugLog, type PracticeExportLog } from '@/lib/practice-debug-log'
import { hasOpenPracticeOverlay, PracticeNavigation, type PracticeTab } from '@/components/practice/PracticeNavigation'
import { DynamicTabShell } from '@/components/practice/DynamicTabWrapper'
import { PracticeDashboard } from '@/components/practice/PracticeDashboard'
import { PracticeSessionView } from '@/components/practice/PracticeSessionView'
import { PracticeModalHost } from '@/components/practice/PracticeModalHost'

// 懒加载弹窗（不阻塞首屏渲染）
const TabLoading = () => (
  <div className="flex-1 flex items-center justify-center" role="status" aria-label="正在加载页面">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

const PosesTab = DynamicTabShell(dynamic(() => import('@/components/PosesTab').then(m => ({ default: m.PosesTab })), { ssr: false, loading: TabLoading }))
const JournalTab = DynamicTabShell(dynamic(() => import('@/components/journal/JournalTab').then(m => ({ default: m.JournalTab })), { ssr: false, loading: TabLoading }))
const StatsTab = DynamicTabShell(dynamic(() => import('@/components/stats/StatsTab').then(m => ({ default: m.StatsTab })), { ssr: false, loading: TabLoading }))

import { INVITE_VERSION } from "@/lib/invite-version"

// 固定功能栏按钮（不计入用户选项名额）
const FIXED_BUTTONS = [
  { id: "chant_switch", label: "开篇唱诵", notes: "关" },
  { id: "guided_audio", label: "一序列", notes: "老掌门人版口令" },
  { id: "today_count", label: "", notes: "今日练习人数" },
]

export default function AshtangaTracker() {
  const router = useRouter()
  const {
    records: practiceHistory,
    options: practiceOptionsData,
    profile: userProfile,
    addRecord,
    updateRecord,
    deleteRecord,
    updateProfile,
    addOption,
    updateOption,
    deleteOption,
    exportData,
    importData,
    clearAllData
  } = usePracticeData()

  // ==================== 会员状态 ====================
  const { membership, loading: membershipLoading, isPro: membershipIsPro, refresh: refreshMembership } = useMembership()

  // ==================== 日历标注 ====================
  const {
    types: annotationTypes,
    maxTypes: maxAnnotationTypes,
    loadTypes: loadAnnotationTypes,
    loadMonth: loadAnnotationMonth,
    createType: createAnnotationType,
    updateType: updateAnnotationType,
    deleteType: deleteAnnotationType,
    addAnnotation,
    removeAnnotation,
    buildAnnotationMap,
    buildAnnotatedDates,
  } = useAnnotations()
  const [showAnnotationManager, setShowAnnotationManager] = useState(false)
  const [journalDate, setJournalDate] = useState(new Date())
  // 当前显示的标注映射
  const annotationMap = useMemo(
    () => buildAnnotationMap(journalDate.getFullYear(), journalDate.getMonth()),
    [buildAnnotationMap, journalDate]
  )
  // 当前月的标注日期映射（用于弹窗）
  const annotationDates = useMemo(
    () => buildAnnotatedDates(journalDate.getFullYear(), journalDate.getMonth()),
    [buildAnnotatedDates, journalDate]
  )

  // 加载标注类型
  useEffect(() => {
    loadAnnotationTypes()
  }, [loadAnnotationTypes])

  // 月份切换时加载标注
  useEffect(() => {
    loadAnnotationMonth(journalDate.getFullYear(), journalDate.getMonth())
  }, [journalDate, loadAnnotationMonth])

  // ==================== 认证状态 ====================
  const { user, loading: authLoading } = useAuth()

  const [practiceOptions, setPracticeOptions] = useState<PracticeOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const [customPracticeName, setCustomPracticeName] = useState("")
  const {
    isPracticing,
    isPaused,
    totalPausedTime,
    elapsedTime,
    showConfirmEnd,
    showCompletion,
    finalDuration,
    isHydrated: sessionHydrated,
    activePractice,
    completedStartTimeRef: startTimeRef,
    start: startPracticeSession,
    restartTimer: restartPracticeTimer,
    pause: pausePracticeSession,
    resume: resumePracticeSession,
    requestEnd: requestPracticeEnd,
    cancelEnd: cancelPracticeEnd,
    confirmEnd: confirmPracticeEnd,
    discardEnd: discardPracticeEnd,
    finishCompletion,
  } = usePracticeSession()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingOption, setEditingOption] = useState<PracticeOption | null>(null)
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState<PracticeTab>('practice')
  const [posesDetailOpen, setPosesDetailOpen] = useState(false)

  // ⭐ 读取 URL 参数，切换 Tab（客户端 only，只执行一次）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const tab = searchParams.get('tab')
    if (tab === 'stats') {
      setActiveTab('stats')
    } else if (tab === 'journal') {
      setActiveTab('journal')
    } else if (tab === 'practice') {
      setActiveTab('practice')
    }
    // 清除 URL 参数，避免刷新时再次触发
    if (tab) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // 只在组件挂载时执行一次

  const [showSettings, setShowSettings] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<'profile' | 'membership' | 'account' | 'data'>('profile')
  const [showAccountSync, setShowAccountSync] = useState(false)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showMembershipPrompt, setShowMembershipPrompt] = useState(false)
  const [membershipPromptReason, setMembershipPromptReason] = useState<'options_full' | 'locked_option' | 'locked_practice' | 'locked_annotation' | 'color_level'>('options_full')
  const [showFakeDoor, setShowFakeDoor] = useState<{ type: 'cloud' | 'pro' | 'voice' | 'photo', isOpen: boolean }>({ type: 'cloud', isOpen: false })
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDebugLogModal, setShowDebugLogModal] = useState(false)
  const [debugLogContent, setDebugLogContent] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportedData, setExportedData] = useState('')
  const [votedCloud, setVotedCloud] = useLocalStorage('voted_cloud_sync', false)

  // Auth Modal 状态
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPWAInstallTutorial, setShowPWAInstallTutorial] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login')

  // 数据冲突处理状态
  const [showDataConflict, setShowDataConflict] = useState(false)
  const [conflictLocalCount, setConflictLocalCount] = useState(0)
  const [conflictRemoteCount, setConflictRemoteCount] = useState(0)

  // 清空数据确认弹窗状态
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false)
  const [clearDataStep, setClearDataStep] = useState<1 | 2 | 3>(1)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 唱诵状态
  const [chantEnabled, setChantEnabled] = useLocalStorage('ashtanga_chant_enabled', false)
  const [chantDelay, setChantDelay] = useLocalStorage('ashtanga_chant_delay', 60) // 秒
  const chantDelaySeconds = chantDelay ?? 60
  const [showChantSettings, setShowChantSettings] = useState(false)
  const [chantMins, setChantMins] = useState(1)
  const [chantSecs, setChantSecs] = useState(0)

  const {
    progress: audioProgress,
    duration: audioDuration,
    currentTime: audioCurrentTime,
    isLoaded: isAudioLoaded,
    isLoading: isAudioLoading,
    error: audioError,
    seekStep,
    isUsingCache,
    setSeekStep,
    load: loadGuidedAudio,
    retry: retryGuidedAudio,
    pause: pauseGuidedAudio,
    play: playGuidedAudio,
    seek: handleAudioSeek,
    reset: resetGuidedAudio,
  } = useGuidedAudio({
    source: GUIDED_AUDIO_OPTION.audio_src || '',
    onReady: resumePracticeSession,
    onEnded: requestPracticeEnd,
  })

  const {
    isCountdown: isChantCountdown,
    countdown: chantCountdown,
    isPlaying: isChantPlaying,
    start: startChantCountdown,
    skip: skipChantCountdown,
    reset: resetChantPlayback,
  } = useChantPlayback({
    delaySeconds: chantDelaySeconds,
    onStart: (context, now) => { startPracticeSession(true, now, context) },
    onFinished: restartPracticeTimer,
    onError: () => { toast.error('唱诵音频加载失败') },
  })

  // 今日练习人数
  const [todayPracticeCount, setTodayPracticeCount] = useState<number>(0)
  const [todayCountLoading, setTodayCountLoading] = useState(true)

  const [exportLogs, setExportLogs] = useLocalStorage<PracticeExportLog[]>('ashtanga_export_logs', [])

  // ⭐ 页面可见性变化时刷新会员状态（从设置页返回时）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Practice] 页面重新可见，刷新会员状态')
        refreshMembership()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshMembership])

  // 小红书群邀请弹窗状态
  const [showXiaohongshuModal, setShowXiaohongshuModal] = useState(false)

  // 已读版本号（localStorage持久化）
  const [readInviteVersion, setReadInviteVersion] = useLocalStorage('xhs_invite_version', '')

  // 派生状态：判断是否显示红点（版本号不同时显示）
  const hasNewXhsMessage = readInviteVersion !== INVITE_VERSION

  // ==================== 同步状态 ====================
  const localDataForSync = {
    records: practiceHistory,
    options: practiceOptions,
    profile: userProfile
  }

  const { syncStatus, lastSyncTime, failedSyncIds, setFailedSyncIds, setLastSyncStatus, resolveConflict, syncStats, autoSync } = useSync(
    user,
    localDataForSync,
    async (data) => {
      // 同步完成后的回调：更新本地数据
      if (data.records) {
        console.log('🔄 同步完成，更新本地数据...')
        console.log('   云端记录数:', data.records.length)

        try {
          // ⭐ 保存当前正在编辑的记录ID（在清空数据前）
          const editingRecordId = editingRecord?.id

          // 清空本地数据
          clearAllData()
          console.log('   ✅ 本地数据已清空')

          // 导入云端数据（importData 需要 JSON 字符串）
          const jsonData = JSON.stringify(data)
          const importResult = importData(jsonData)

          if (importResult) {
            console.log('   ✅ 云端数据已导入')

            // ⭐ 重新设置正在编辑的记录（从新的记录列表中查找）
            if (editingRecordId) {
              const newEditingRecord = data.records.find((r: PracticeRecord) => r.id === editingRecordId)
              console.error('   🔍 [Sync] 查找编辑记录:', {
                editingRecordId,
                found: !!newEditingRecord,
                cloudRecordCount: data.records.length
              })
              if (newEditingRecord) {
                setEditingRecord(newEditingRecord)
                console.error('   ✅ [Sync] 已恢复编辑状态')
                toast.success('同步完成，编辑状态已恢复')
              } else {
                console.error('   ❌ [Sync] 编辑的记录在云端找不到，保持本地编辑状态')
                toast.warning('同步提示：新记录尚未上传到云端，继续编辑')
                // 不要关闭弹窗，让用户继续编辑
                // setEditingRecord(null)
              }
            }

            toast.success(`✅ 已同步${data.records.length}条云端数据`, {
              duration: 3000,
              position: 'top-center'
            })
          } else {
            throw new Error('导入云端数据失败')
          }
        } catch (error: any) {
          console.error('   ❌ 更新本地数据失败:', error)
          toast.error('❌ 同步数据失败，请重试', {
            duration: 3000,
            position: 'top-center'
          })
        }
      }
    },
    (localCount, remoteCount) => {
      // 检测到数据冲突
      setConflictLocalCount(localCount)
      setConflictRemoteCount(remoteCount)
      setShowDataConflict(true)
    }
  )

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 跟踪子组件内部的弹窗状态（无法直接访问）
  const [childModalOpen, setChildModalOpen] = useState(false)

  // 派生状态：判断是否有需要隐藏导航栏的弹窗打开
  const hasAnyModalOpen = hasOpenPracticeOverlay({
    showEditModal,
    showCustomModal,
    editingOption: editingOption !== null,
    showAddModal,
    showSettings,
    childModalOpen,
    editingRecord: editingRecord !== null,
    showConfirmEnd,
    showCompletion,
    posesDetailOpen,
    showAnnotationManager,
    showAccountSync,
    showActivateModal,
    showPurchaseModal,
    showMembershipPrompt,
    showFakeDoor: showFakeDoor.isOpen,
    showImportModal,
    showDebugLogModal,
    showExportModal,
    showAuthModal,
    showPWAInstallTutorial,
    showDataConflict,
    showClearDataConfirm,
    showChantSettings,
    showXiaohongshuModal,
  })

  // Initialize practice options from hook data
  useEffect(() => {
    // 只获取用户自定义选项（过滤掉 custom 和固定按钮的 ID）
    const fixedIds = new Set(FIXED_BUTTONS.map(b => b.id))
    const userOptions = practiceOptionsData.filter(o =>
      o.id !== "custom" && !fixedIds.has(o.id) && o.visible !== false
    )

    setPracticeOptions([
      // 固定按钮（第一行）
      ...FIXED_BUTTONS.map(b => ({
        id: b.id,
        created_at: '',
        label: b.id === 'today_count' ? (todayCount !== null ? String(todayCount) : '--') : b.label,
        notes: b.id === 'chant_switch'
          ? (chantEnabled ? `${chantDelaySeconds}秒后播放` : '关')
          : b.notes,
        is_custom: false,
        isCustom: false,
        is_fixed: true,      // 固定按钮
        is_preset: b.id === 'guided_audio',  // 口令跟练显示喇叭图标
        can_edit: false
      })),
      // 用户选项
      ...userOptions.map(o => ({
        id: o.id,
        created_at: o.created_at,
        label: o.label,
        notes: o.notes,
        is_custom: o.is_custom,
        isCustom: o.is_custom,
        is_fixed: false,
        can_edit: o.can_edit,
        color_level: o.color_level
      })),
      // 自定义按钮
      { id: "custom", created_at: '', label: "自定义", notes: '', is_custom: false, isCustom: false }
    ])
  }, [practiceOptionsData, todayCount, chantEnabled, chantDelaySeconds])

  // 获取今日练习次数
  const fetchTodayCount = useCallback(() => {
    fetch(`/api/stats/today?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setTodayCount(data.count || 0))
      .catch(() => {})
  }, [])

  // 页面加载 + 页面可见时刷新
  useEffect(() => {
    fetchTodayCount()
    const handler = () => {
      if (document.visibilityState === 'visible') fetchTodayCount()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchTodayCount])

  // Keep screen awake during practice
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    const requestWakeLock = async () => {
      if (isPracticing && "wakeLock" in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request("screen")
        } catch {
          // Wake Lock not supported or failed
        }
      }
    }

    if (isPracticing) {
      requestWakeLock()
    }

    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [isPracticing])

  const {
    canDeleteOption,
    isOptionsFull,
    lockedOptionIds,
    handleOptionTap,
    handleEditSave,
    handleEditDelete,
    handleEditRecord,
    handleDeleteRecord,
    handleAddRecord,
    handleAddOption,
  } = usePracticeCommands({
    user,
    practiceOptions,
    selectedOption,
    membershipIsPro,
    chantEnabled,
    chantDelaySeconds,
    setPracticeOptions,
    setSelectedOption,
    setCustomPracticeName,
    setChantEnabled,
    setChantMins,
    setChantSecs,
    setShowChantSettings,
    setEditingOption,
    setShowEditModal,
    setShowCustomModal,
    setMembershipPromptReason,
    setShowMembershipPrompt,
    fetchTodayCount,
    updateOption,
    deleteOption,
    addOption,
    updateRecord,
    deleteRecord,
    addRecord,
    autoSync,
  })

  const handleVoteCloud = () => {
    // Update the votedCloud state directly
    setVotedCloud(true)
  }

  const handleResolveConflict = (strategy: 'remote' | 'local' | 'merge') => {
    setShowDataConflict(false)
    if (resolveConflict) {
      resolveConflict(strategy)
    }
  }

  const handleExportDebugLog = async () => {
    try {
      const debugLog = await collectPracticeDebugLog({
        user,
        syncStatus,
        lastSyncTime,
        failedSyncIds,
        conflictLocalCount,
        conflictRemoteCount,
        showDataConflict,
        practiceHistory,
        practiceOptions,
        userProfile,
        membership,
        membershipIsPro,
        membershipLoading,
        exportLogs,
        activeTab,
        showSettings,
        showAccountSync,
        showAuthModal,
        authMode,
        showClearDataConfirm,
        clearDataStep,
        selectedOption,
        isPaused,
        elapsedTime,
        totalPausedTime,
        customPracticeName,
        showImportModal,
        showExportModal,
        showDebugLogModal,
        showCompletion,
        showFakeDoor: showFakeDoor.isOpen,
        chantEnabled,
        chantDelaySeconds,
      })
      setDebugLogContent(JSON.stringify(debugLog, null, 2))
      setShowDebugLogModal(true)
    } catch (error) {
      console.error('[Practice] 生成调试日志失败:', error)
      toast.error('生成调试日志失败')
    }
  }

  const handleStartPractice = async () => {
    if (selectedOption) {
      // 锁定选项不可开始练习
      if (lockedOptionIds.has(selectedOption)) {
        setMembershipPromptReason('locked_practice')
        setShowMembershipPrompt(true)
        return
      }

      // 唱诵模式：倒计时 → 唱诵 → 自动开始
      if (chantEnabled && selectedOption === 'guided_audio') {
        toast('唱诵与口令跟练不可同时使用')
        return
      }
      if (chantEnabled) {
        startChantCountdown({
          optionId: selectedOption,
          label: getSelectedLabel(),
          notes: getSelectedNotes(),
        })
        trackEvent('start_practice', { type: getSelectedLabel(), chant: true })
        return
      }

      // 先进入练习界面（立即给用户反馈）
      const now = Date.now()
      const isGuidedAudio = selectedOption === 'guided_audio'
      startPracticeSession(isGuidedAudio, now, {
        optionId: selectedOption,
        label: getSelectedLabel(),
        notes: getSelectedNotes(),
      })

      // 口令跟练模式：加载音频
      if (isGuidedAudio) {
        await loadGuidedAudio()
      }

      trackEvent('start_practice', { type: getSelectedLabel() })
    }
  }

  const handlePauseResume = () => {
    const now = Date.now()
    if (!isPaused) {
      pausePracticeSession(now)
      // 音频同步暂停
      if ((selectedOption ?? activePractice?.optionId) === 'guided_audio') {
        pauseGuidedAudio()
      }
    } else {
      resumePracticeSession(now)
      // 音频同步继续
      if ((selectedOption ?? activePractice?.optionId) === 'guided_audio') {
        playGuidedAudio()
      }
    }
    trackEvent(isPaused ? 'resume_practice' : 'pause_practice')
  }

  const getSelectedLabel = useCallback(() => {
    if (!selectedOption && activePractice) {
      return activePractice.label
    }
    if ((selectedOption === "custom" || selectedOption === "custom-temp") && customPracticeName) {
      return customPracticeName
    }
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.label || ""
  }, [selectedOption, activePractice, customPracticeName, practiceOptions])

  const getSelectedNotes = useCallback(() => {
    if (!selectedOption && activePractice) {
      return activePractice.notes
    }
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.notes || ""
  }, [selectedOption, activePractice, practiceOptions])

  const activeOptionId = selectedOption ?? activePractice?.optionId ?? null

  // 步长选项
  const SEEK_STEP_OPTIONS = [10, 15, 30]

  const handleEndRequest = () => {
    requestPracticeEnd()
  }

  const handleConfirmEnd = () => {
    confirmPracticeEnd()

    resetChantPlayback()
    resetGuidedAudio()
  }

  // 不保存结束：丢弃记录，直接回到初始状态
  const handleDiscardEnd = () => {
    discardPracticeEnd()

    resetChantPlayback()
    resetGuidedAudio()
  }

  const handleSavePractice = useCallback((record: PracticeRecord) => {
    if (isSaving) {
      return
    }
    setIsSaving(true)

    try {
      startTimeRef.current = null

      trackEvent('finish_practice', {
        type: record.type,
        duration: record.duration,
        is_patch: false
      })

      // ⭐ 更新 Mixpanel User Profile（实时同步总数）
      const recordsData = localStorage.getItem('ashtanga_records')
      if (recordsData) {
        try {
          const records = JSON.parse(recordsData)
          if (Array.isArray(records)) {
            const totalRecords = records.length
            const recordsWithNotes = records.filter((r: any) =>
              r.notes && r.notes.trim().length > 0
            ).length
            const recordsWithBreakthrough = records.filter((r: any) =>
              r.breakthrough && r.breakthrough.trim().length > 0
            ).length

            setUserProfile({
              total_records: totalRecords,
              records_with_notes: recordsWithNotes,
              records_with_breakthrough: recordsWithBreakthrough,
              notes_rate: totalRecords > 0 ? Math.round((recordsWithNotes / totalRecords) * 100) : 0,
              last_practice_at: new Date().toISOString()
            })
          }
        } catch (e) {
          console.error('[finish_practice] 更新 Mixpanel Profile 失败:', e)
        }
      }

      finishCompletion()
      setSelectedOption(null)
      setCustomPracticeName("")
      setActiveTab('journal') // Switch to 觉察日记 tab

      toast.success('✅ 打卡成功！', {
        duration: 2000,
        position: 'top-center'
      })

      // 刷新今日练习人数
      fetchTodayCount()

      // 记录练习行为到设备活动统计（匿名用户也记录）
      const uuid = localStorage.getItem('ashtanga_uuid')
      if (uuid) {
        fetch('/api/stats/record-practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid }),
        }).catch(() => {})
      }

    } catch (error) {
      console.error('保存失败:', error)
      toast.error('❌ 保存失败，请重试', {
        duration: 3000,
        position: 'top-center'
      })
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, fetchTodayCount, finishCompletion, startTimeRef])

  // Keep the server HTML and the first client render identical. Persisted
  // practice state is revealed only after the client has mounted.
  if (!sessionHydrated) {
    return <div className="h-screen bg-background" aria-label="正在恢复练习" />
  }

  // Full-screen Timer View with Hero Transition
  if (isPracticing) {
    return (
      <>
        <PracticeSessionView
          elapsedTime={elapsedTime}
          isPaused={Boolean(isPaused)}
          practiceLabel={getSelectedLabel()}
          practiceNotes={getSelectedNotes()}
          activeOptionId={activeOptionId}
          isChantCountdown={isChantCountdown}
          chantCountdown={chantCountdown}
          onSkipChantCountdown={skipChantCountdown}
          isChantPlaying={isChantPlaying}
          isAudioLoaded={isAudioLoaded}
          isAudioLoading={isAudioLoading}
          audioError={audioError}
          isUsingCache={isUsingCache}
          audioProgress={audioProgress}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          onRetryAudio={retryGuidedAudio}
          onPauseResume={handlePauseResume}
          onRequestEnd={handleEndRequest}
          seekStepOptions={SEEK_STEP_OPTIONS}
          seekStep={seekStep}
          onSeekStepChange={setSeekStep}
          onAudioSeek={handleAudioSeek}
          showConfirmEnd={showConfirmEnd}
          onCancelEnd={cancelPracticeEnd}
          onConfirmEnd={handleConfirmEnd}
          onDiscardEnd={handleDiscardEnd}
        />

        <CompletionSheet
          isOpen={showCompletion}
          practiceType={getSelectedLabel()}
          duration={finalDuration}
          startTime={startTimeRef.current ? new Date(startTimeRef.current).toISOString() : undefined}
          onFinalizeRecord={handleSavePractice}
          onClose={() => {
            finishCompletion()
            setSelectedOption(null)
            setCustomPracticeName("")
            setActiveTab('journal')
          }}
          addRecord={addRecord}
          updateRecord={updateRecord}
          autoSync={autoSync}
          onDeleteDraft={handleDeleteRecord}
          onShowMembershipPrompt={() => {
            setMembershipPromptReason('color_level')
            setShowMembershipPrompt(true)
          }}
          user={user}
          practiceOptions={practiceOptionsData}
          isPro={membershipIsPro}
        />
      </>
    )
  }
  // Dashboard View
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Tab Content - includes header in scroll */}
      <div className="flex-1 flex flex-col min-h-0">
      <AnimatePresence mode="wait">
      {activeTab === 'practice' && (
        <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
        <PracticeDashboard
          practiceOptions={practiceOptions}
          selectedOption={selectedOption}
          lockedOptionIds={lockedOptionIds}
          chantEnabled={Boolean(chantEnabled)}
          onOptionTap={handleOptionTap}
          onStartPractice={handleStartPractice}
        />
        </motion.div>
      )}

      {activeTab === 'journal' && (
        <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
        <JournalTab
          practiceHistory={practiceHistory}
          practiceOptions={practiceOptions}
          profile={userProfile}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
          onAddRecord={handleAddRecord}
          onOpenFakeDoor={() => {
            // 无论是否登录，都直接打开账户同步弹窗
            setShowAccountSync(true)
          }}
          onOpenVoiceFakeDoor={() => setShowFakeDoor({ type: 'voice', isOpen: true })}
          onOpenPhotoFakeDoor={() => setShowFakeDoor({ type: 'photo', isOpen: true })}
          onAddOption={handleAddOption}
          votedCloud={votedCloud ?? false}
          onLogExport={(log) => setExportLogs([...(exportLogs ?? []), log])}
          editingRecord={editingRecord}
          onSetEditingRecord={setEditingRecord}
          showAddModal={showAddModal}
          onSetShowAddModal={setShowAddModal}
          syncStatus={syncStatus}
          user={user}
          annotationMap={annotationMap}
          onOpenAnnotationManager={() => {
            if (!user) {
              toast.error('绑定邮箱后才可使用日历标注功能')
              return
            }
            setShowAnnotationManager(true)
          }}
          onJournalMonthChange={setJournalDate}
          onOpenXiaohongshuModal={() => setShowXiaohongshuModal(true)}
          hasNewXhsMessage={hasNewXhsMessage}
          onReadInvite={() => setReadInviteVersion(INVITE_VERSION)}
          onShowMembershipPrompt={() => {
            setMembershipPromptReason('color_level')
            setShowMembershipPrompt(true)
          }}
          isPro={membershipIsPro}
        />
        </motion.div>
      )}
      {activeTab === 'poses' && (
        <motion.div key="poses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
        <PosesTab
          onDetailOpen={() => setPosesDetailOpen(true)}
          onDetailClose={() => setPosesDetailOpen(false)}
        />
        </motion.div>
      )}
      {activeTab === 'stats' && (
        <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
        <StatsTab
          practiceHistory={practiceHistory}
          practiceOptions={practiceOptions}
          profile={userProfile}
          membership={membership}
          membershipLoading={membershipLoading}
          onOpenSettings={() => setShowSettings(true)}
          onOpenMembership={() => {
            setSettingsInitialSection('membership')
            setShowSettings(true)
          }}
          onOpenFakeDoor={() => setShowFakeDoor({ type: 'pro', isOpen: true })}
          showXiaohongshuModal={showXiaohongshuModal}
          setShowXiaohongshuModal={setShowXiaohongshuModal}
          user={user}
          showPWAInstallTutorial={showPWAInstallTutorial}
          setShowPWAInstallTutorial={setShowPWAInstallTutorial}
        />
        </motion.div>
      )}
      </AnimatePresence>
      </div>
      <PracticeNavigation activeTab={activeTab} hidden={hasAnyModalOpen} onChange={setActiveTab} />
      <PracticeModalHost
        clearData={{
          isOpen: showClearDataConfirm,
          step: clearDataStep,
          confirmPhrase,
          onClose: () => setShowClearDataConfirm(false),
          onStepChange: setClearDataStep,
          onConfirmPhraseChange: setConfirmPhrase,
          onInvalidConfirmPhrase: () => toast.error('确认词输入错误，请重新输入'),
          onComplete: async () => {
            localStorage.clear()
            if (user && clearAllData) {
              await clearAllData()
            }
            setShowClearDataConfirm(false)
            setClearDataStep(1)
            await supabase.auth.signOut()
            router.push('/')
          },
        }}
        chantSettings={{
          isOpen: showChantSettings,
          isPro: membershipIsPro,
          minutes: chantMins,
          seconds: chantSecs,
          delaySeconds: chantDelaySeconds,
          onMinutesChange: setChantMins,
          onSecondsChange: setChantSecs,
          onDelayChange: setChantDelay,
          onClose: () => setShowChantSettings(false),
          onUpgrade: () => {
            setShowChantSettings(false)
            setMembershipPromptReason('options_full')
            setShowMembershipPrompt(true)
          },
        }}
        external={{
          customPractice: {
            isOpen: showCustomModal,
            onClose: () => setShowCustomModal(false),
            onConfirm: handleAddOption,
            isFull: isOptionsFull,
            maxSlots: membershipIsPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE,
            membership,
            onShowMembershipPrompt: () => {
              setMembershipPromptReason('color_level')
              setShowMembershipPrompt(true)
            },
          },
          editOption: {
            isOpen: showEditModal,
            onClose: () => {
              setShowEditModal(false)
              setEditingOption(null)
            },
            option: editingOption,
            onSave: handleEditSave,
            onDelete: handleEditDelete,
            canDelete: canDeleteOption && editingOption?.id !== 'custom',
            membership,
            onShowMembershipPrompt: () => {
              setMembershipPromptReason('color_level')
              setShowMembershipPrompt(true)
            },
          },
          settings: {
            isOpen: showSettings,
            onClose: () => {
              setShowSettings(false)
              setSettingsInitialSection('profile')
            },
            initialSection: settingsInitialSection,
            profile: userProfile,
            onSave: async (profile) => {
              updateProfile(profile)
              if (user) {
                toast.loading('正在同步到云端...', { id: 'sync-profile' })
                try {
                  const result = await autoSync('保存个人资料后同步')
                  toast.dismiss('sync-profile')
                  if (result) toast.success('✅ 资料已同步到云端')
                  else toast.error('❌ 同步失败，请稍后重试')
                } catch {
                  toast.dismiss('sync-profile')
                  toast.error('❌ 同步失败')
                }
              }
            },
            onOpenExport: () => {
              setExportedData(exportData())
              setShowExportModal(true)
            },
            onOpenImport: () => setShowImportModal(true),
            onExportLog: handleExportDebugLog,
            onClearData: clearAllData,
            user,
            practiceHistory,
            practiceOptionsData,
            onShowClearDataConfirm: () => {
              setClearDataStep(1)
              setConfirmPhrase('')
              setShowClearDataConfirm(true)
            },
            onOpenLoginModal: () => {
              setShowAuthModal(true)
              setAuthMode('login')
            },
            onOpenRegisterModal: () => {
              setShowAuthModal(true)
              setAuthMode('register')
            },
            membership,
            onActivateMembership: () => setShowActivateModal(true),
            onPurchaseMembership: () => setShowPurchaseModal(true),
            onUpdateProfile: updateProfile,
          },
          annotationManager: {
            isOpen: showAnnotationManager,
            onClose: () => setShowAnnotationManager(false),
            types: annotationTypes,
            maxTypes: maxAnnotationTypes,
            isPro: membershipIsPro,
            onCreateType: createAnnotationType,
            onUpdateType: updateAnnotationType,
            onDeleteType: deleteAnnotationType,
            onAddAnnotation: addAnnotation,
            onRemoveAnnotation: removeAnnotation,
            onLockedClick: () => {
              setMembershipPromptReason('locked_annotation')
              setShowMembershipPrompt(true)
            },
            annotationDates,
          },
          activate: {
            isOpen: showActivateModal,
            onClose: () => setShowActivateModal(false),
            onSuccess: async () => {
              console.log('[Practice] 激活成功，准备刷新会员状态')
              await refreshMembership()
              console.log('[Practice] refreshMembership 完成')
            },
          },
          membershipPrompt: {
            isOpen: showMembershipPrompt,
            onClose: () => setShowMembershipPrompt(false),
            reason: membershipPromptReason,
            onActivate: () => setShowActivateModal(true),
          },
          purchaseGuide: {
            isOpen: showPurchaseModal,
            onClose: () => setShowPurchaseModal(false),
          },
          accountSync: {
            isOpen: showAccountSync,
            onClose: () => setShowAccountSync(false),
            profile: userProfile,
            practiceHistory,
            practiceOptionsData,
            onOpenLoginModal: () => {
              setShowAuthModal(true)
              setAuthMode('login')
            },
            onOpenRegisterModal: () => {
              setShowAuthModal(true)
              setAuthMode('register')
            },
            onShowClearDataConfirm: () => {
              setShowClearDataConfirm(true)
              setClearDataStep(2)
            },
            onUpdateProfile: updateProfile,
            user,
          },
          importModal: {
            isOpen: showImportModal,
            onClose: () => setShowImportModal(false),
            onImport: (json) => {
              const result = importData(json)
              if (result) {
                toast.success('✅ 数据导入成功！', { duration: 3000, position: 'top-center' })
                trackEvent('import_data')
                setTimeout(() => {
                  setShowImportModal(false)
                  setShowSettings(false)
                }, 500)
              } else {
                toast.error('❌ 数据导入失败，请检查格式', { duration: 3000, position: 'top-center' })
              }
            },
          },
          exportModal: {
            isOpen: showExportModal,
            onClose: () => setShowExportModal(false),
            data: exportedData,
          },
          debugLogModal: {
            isOpen: showDebugLogModal,
            onClose: () => setShowDebugLogModal(false),
            logContent: debugLogContent,
          },
          completion: {
            isOpen: showCompletion,
            practiceType: getSelectedLabel(),
            duration: finalDuration,
            startTime: startTimeRef.current ? new Date(startTimeRef.current).toISOString() : undefined,
            onFinalizeRecord: handleSavePractice,
            onClose: () => {
              finishCompletion()
              setSelectedOption(null)
              setCustomPracticeName('')
              setActiveTab('journal')
            },
            addRecord,
            updateRecord,
            autoSync,
            onDeleteDraft: handleDeleteRecord,
            onShowMembershipPrompt: () => {
              setMembershipPromptReason('color_level')
              setShowMembershipPrompt(true)
            },
            user,
            practiceOptions: practiceOptionsData,
            isPro: membershipIsPro,
          },
          fakeDoor: {
            type: showFakeDoor.type,
            isOpen: showFakeDoor.isOpen,
            onClose: () => setShowFakeDoor({ ...showFakeDoor, isOpen: false }),
            onVote: handleVoteCloud,
          },
          xiaohongshu: {
            isOpen: showXiaohongshuModal,
            onClose: () => {
              setShowXiaohongshuModal(false)
              setReadInviteVersion(INVITE_VERSION)
            },
          },
          auth: {
            isOpen: showAuthModal,
            onClose: () => setShowAuthModal(false),
            mode: authMode,
            onAuthSuccess: () => {
              setShowAuthModal(false)
              refreshMembership()
            },
            onModeChange: setAuthMode,
          },
          dataConflict: {
            isOpen: showDataConflict,
            localCount: conflictLocalCount,
            remoteCount: conflictRemoteCount,
            onSelect: handleResolveConflict,
          },
        }}
      />

    </div>
  )
}
