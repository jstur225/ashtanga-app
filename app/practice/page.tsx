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
import { usePracticeSession, type ActivePracticeContext } from "@/hooks/usePracticeSession"
import { BookOpen, BarChart3, Calendar, X, Pause, Play, User, ChevronUp, ChevronDown, Upload, Plus, Minus, Share2, Sparkles, Check, ClipboardPaste, AlertCircle, SkipBack, SkipForward, Volume, Volume2, Crown, Ticket, Loader2, Lock, Users, Library } from "lucide-react"
import { cn } from '@/lib/utils'
import { getColorClass } from '@/lib/sync-utils'
import { VoiceButton } from "@/components/VoiceButton"
import { CompletionSheet } from "@/components/practice-record/CompletionSheet"
import { AccountSyncModal } from "@/components/AccountSyncModal"
import { JournalTab } from "@/components/journal/JournalTab"
import { StatsTab } from "@/components/stats/StatsTab"
import { PhotoUploadButton } from "@/components/PhotoUploadButton"
import { toast } from 'sonner'
import { trackEvent, setUserProfile } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import { deletePracticeRecord } from '@/lib/database'
import { useRouter } from 'next/navigation'
import { getVersionInfo } from '@/lib/version'
import { audioCache } from '@/lib/audioCache'
import { formatMinutes, formatSeconds, getLocalDateStr } from '@/lib/practice-utils'
import { CustomPracticeModal, EditOptionModal } from '@/components/practice/OptionModals'
import { BreathingRipples, ConfirmEndDialog } from '@/components/practice/PracticeSessionControls'

// 懒加载弹窗（不阻塞首屏渲染）
const AnnotationManagerModal = dynamic(() => import('@/components/CalendarAnnotation/AnnotationManagerModal').then(m => ({ default: m.AnnotationManagerModal })), { ssr: false })
const FakeDoorModal = dynamic(() => import('@/components/FakeDoorModal').then(m => ({ default: m.FakeDoorModal })), { ssr: false })
const ImportModal = dynamic(() => import('@/components/ImportModal').then(m => ({ default: m.ImportModal })), { ssr: false })
const ExportModal = dynamic(() => import('@/components/ExportModal').then(m => ({ default: m.ExportModal })), { ssr: false })
const XiaohongshuInviteModal = dynamic(() => import('@/components/XiaohongshuInviteModal').then(m => ({ default: m.XiaohongshuInviteModal })), { ssr: false })
const AuthModal = dynamic(() => import('@/components/AuthModal').then(m => ({ default: m.AuthModal })), { ssr: false })
const DataConflictModal = dynamic(() => import('@/components/DataConflictModal').then(m => ({ default: m.DataConflictModal })), { ssr: false })
const DebugLogModal = dynamic(() => import('@/components/DebugLogModal').then(m => ({ default: m.DebugLogModal })), { ssr: false })
const PosesTab = dynamic(() => import('@/components/PosesTab').then(m => ({ default: m.PosesTab })), { ssr: false })
const SettingsModal = dynamic(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })), { ssr: false })
const ActivateModal = dynamic(() => import('@/components/Membership/ActivateModal').then(m => ({ default: m.ActivateModal })), { ssr: false })
const MembershipPromptModal = dynamic(() => import('@/components/Membership/MembershipPromptModal').then(m => ({ default: m.MembershipPromptModal })), { ssr: false })
const PurchaseGuideModal = dynamic(() => import('@/components/Membership/PurchaseGuideModal').then(m => ({ default: m.PurchaseGuideModal })), { ssr: false })

// INVITE_VERSION 是常量，需要直接导入
import { INVITE_VERSION } from "@/components/XiaohongshuInviteModal"

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
  const [activeTab, setActiveTab] = useState<'practice' | 'journal' | 'poses' | 'stats'>('practice')
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

  // 音频播放器状态
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)  // 0-100
  const [audioDuration, setAudioDuration] = useState(0)  // 总时长（秒）
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)  // 当前时间（秒）
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)  // 加载中状态
  const [audioError, setAudioError] = useState<string | null>(null)  // 加载错误
  const [seekStep, setSeekStep] = useState<number>(15)  // 快进/后退步长（默认15秒）
  const [audioDownloadProgress, setAudioDownloadProgress] = useState<number>(0)  // 下载进度（0-100）
  const [isUsingCache, setIsUsingCache] = useState<boolean>(false)  // 是否使用缓存
  const [isBackgroundCaching, setIsBackgroundCaching] = useState<boolean>(false)  // 后台缓存中
  const audioBlobUrlRef = useRef<string | null>(null)  // Blob URL 追踪（防内存泄漏）

  // 唱诵状态
  const [chantEnabled, setChantEnabled] = useLocalStorage('ashtanga_chant_enabled', false)
  const [chantDelay, setChantDelay] = useLocalStorage('ashtanga_chant_delay', 60) // 秒
  const chantDelaySeconds = chantDelay ?? 60
  const [isChantCountdown, setIsChantCountdown] = useState(false)
  const [chantCountdown, setChantCountdown] = useState(0) // 剩余秒数
  const [isChantPlaying, setIsChantPlaying] = useState(false)
  const [showChantSettings, setShowChantSettings] = useState(false)
  const [chantMins, setChantMins] = useState(1)
  const [chantSecs, setChantSecs] = useState(0)
  const chantAudioRef = useRef<HTMLAudioElement | null>(null)
  const chantCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 今日练习人数
  const [todayPracticeCount, setTodayPracticeCount] = useState<number>(0)
  const [todayCountLoading, setTodayCountLoading] = useState(true)

  const [exportLogs, setExportLogs] = useLocalStorage<{
    timestamp: string
    success: boolean
    error?: string
    userAgent: string
    recordDate?: string
  }[]>('ashtanga_export_logs', [])

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
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // 跟踪子组件内部的弹窗状态（无法直接访问）
  const [childModalOpen, setChildModalOpen] = useState(false)

  // 派生状态：判断是否有需要隐藏导航栏的弹窗打开
  const hasAnyModalOpen = useMemo(() => {
    return (
      showEditModal ||
      editingOption !== null ||
      showAddModal ||
      showSettings ||
      childModalOpen ||  // 子组件的弹窗（包含确认删除等）
      editingRecord !== null ||  // 编辑记录弹窗
      showConfirmEnd ||  // 确认结束弹窗
      showCompletion ||  // 完成练习弹窗
      posesDetailOpen    // 体式库详情页
    )
  }, [
    showEditModal,
    showEditModal,
    editingOption,
    showAddModal,
    showSettings,
    childModalOpen,
    editingRecord,
    showConfirmEnd,
    showCompletion,
    posesDetailOpen
  ])

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

  const handleOptionTap = (option: PracticeOption) => {
    const now = Date.now()
    const lastTap = lastTapRef.current

    // Check for double tap (within 300ms on the same option)
    if (lastTap && lastTap.id === option.id && now - lastTap.time < 300) {
      lastTapRef.current = null
      // 固定按钮双击
      if (option.is_fixed) {
        if (option.id === 'chant_switch') {
          setChantMins(Math.floor(chantDelaySeconds / 60))
          setChantSecs(chantDelaySeconds % 60)
          setShowChantSettings(true)
        }
        return
      }
      // Double tap - open edit modal (but not for custom button and preset options)
      // 预设选项不能编辑
      if (option.id !== "custom" && !option.is_preset && option.can_edit !== false) {
        setEditingOption(option)
        setShowEditModal(true)
      } else if (option.is_preset || option.can_edit === false) {
        toast('预设按钮暂不支持编辑')
      }
      return
    }

    // Single tap - store for double tap detection
    lastTapRef.current = { id: option.id, time: now }

    // 固定按钮特殊处理（单击）
    if (option.is_fixed) {
      if (option.id === "guided_audio") {
        // 口令跟练：直接选中
        // 互斥：如果唱诵开启，先关闭唱诵
        if (chantEnabled) {
          setChantEnabled(false)
          toast('已关闭唱诵')
        }
        setSelectedOption('guided_audio')
        setCustomPracticeName("")
      } else if (option.id === 'today_count') {
        fetchTodayCount()
        toast('今天你熬汤了吗？')
      } else if (option.id === 'chant_switch') {
        const newEnabled = !chantEnabled
        setChantEnabled(newEnabled)
        if (newEnabled) {
          toast('唱诵已开启')
          // 互斥：如果当前选中口令跟练，取消选中
          if (selectedOption === 'guided_audio') {
            setSelectedOption(null)
            toast('已关闭口令跟练')
          }
        } else {
          toast('唱诵已关闭')
        }
      }
      return
    }

    // Select the option
    if (option.id === "custom") {
      if (isOptionsFull && !membershipIsPro) {
        // 免费用户已满 → 会员转化弹窗
        setMembershipPromptReason('options_full')
        setShowMembershipPrompt(true)
      } else {
        setShowCustomModal(true)
      }
    } else if (lockedOptionIds.has(option.id)) {
      // 锁定选项：单击打开会员转化弹窗
      setMembershipPromptReason('locked_option')
      setShowMembershipPrompt(true)
    } else {
      setSelectedOption(option.id)
      setCustomPracticeName("")
    }
  }

  const handleEditSave = (id: string, name: string, notes: string, colorLevel?: number) => {
    // 免费用户：被锁定的色阶强制降为 3
    const safeColorLevel = (!membershipIsPro && (colorLevel === 1 || colorLevel === 4)) ? 3 : (colorLevel ?? 3)
    // Update localStorage (also persists color_level for type default)
    updateOption(id, name, notes, safeColorLevel)

    // Update local state (including color_level)
    setPracticeOptions(prev => prev.map(o =>
      o.id === id ? { ...o, label: name, notes, color_level: safeColorLevel } : o
    ))

    toast.success('已保存修改')

    // 如果已登录，自动同步到云端
    if (user) {
      setTimeout(async () => {
        await autoSync('编辑选项后同步')
      }, 500)
    }
  }

  const handleEditDelete = async (id: string) => {
    // Cannot delete if only 2 non-custom options remain
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    if (nonCustomOptions.length <= 2) {
      toast.error('至少需要保留2个练习选项')
      return
    }

    // Update localStorage
    deleteOption(id)

    // Update local state
    setPracticeOptions(prev => prev.filter(o => o.id !== id))
    if (selectedOption === id) {
      setSelectedOption(null)
    }

    toast.success('已删除选项')

    // ⭐ 新增：如果已登录，从云端删除并触发同步
    if (user) {
      console.log('[handleEditDelete] 用户已登录，从云端删除选项...')
      try {
        // 调用 Supabase 删除选项
        const { error } = await supabase
          .from('practice_options')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (error) {
          console.error('[handleEditDelete] 云端删除失败:', error)
          toast.error('云端删除失败，选项仅在本设备删除')
        } else {
          console.log('[handleEditDelete] 云端删除成功')
          // 触发同步确保状态一致
          await autoSync('删除选项后同步')
        }
      } catch (err) {
        console.error('[handleEditDelete] 删除异常:', err)
        toast.error('删除同步失败，选项仅在本设备删除')
      }
    }
  }

  const handleEditRecord = (id: string, data: Partial<PracticeRecord>) => {
    updateRecord(id, data, () => {
      // 编辑后触发同步
      if (user) {
        autoSync('编辑记录后同步')
      }
    })
    toast.success('更新成功')
  }

  const handleDeleteRecord = async (id: string, skipConfirm = false) => {
    // Confirm before deleting (skip for draft records)
    if (!skipConfirm && !confirm('确定要删除这条记录吗？')) return

    // 1. 从本地状态移除
    deleteRecord(id)

    // 2. 软删除 Supabase 中的记录（设置 deleted_at）
    const success = await deletePracticeRecord(id)
    if (success) {
      // 只有正式记录才显示删除成功提示（草稿记录静默删除）
      if (!skipConfirm) {
        toast.success('已删除记录')
      }
      // 3. 触发同步（如果用户已登录）
      if (user) {
        autoSync('删除记录后同步')
      }
    } else {
      toast.error('删除同步失败，记录仅在本设备删除')
    }
  }

  const handleAddRecord = (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => {
    const newRecord = addRecord(record)
    trackEvent('add_record', {
      type: record.type,
      duration: record.duration,
      date: record.date,
      has_breakthrough: !!record.breakthrough,
      has_notes: !!record.notes && record.notes.length > 0
    })

    // ⭐ 更新 Mixpanel User Profile（实时同步总数）
    setTimeout(() => {
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
              last_patch_at: new Date().toISOString()
            })
          }
        } catch (e) {
          console.error('[add_record] 更新 Mixpanel Profile 失败:', e)
        }
      }
    }, 100)

    // 只有非草稿记录才显示 toast
    if (record.type !== '草稿') {
      toast.success('补卡成功！')
    }

    // 记录练习行为到设备活动统计（补卡也记录）
    const recordUuid = localStorage.getItem('ashtanga_uuid')
    if (recordUuid) {
      fetch('/api/stats/record-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: recordUuid }),
      }).catch(() => {})
    }

    // 延迟 500ms 同步，确保 localStorage 已完全更新
    // ⭐ 只有绑定邮箱的用户才同步到云端
    if (user?.email) {
      setTimeout(() => {
        autoSync('添加记录后同步')
      }, 500)
    }
    return newRecord
  }

  const handleAddOption = async (name: string, notes: string, colorLevel?: number) => {
    const maxSlots = membershipIsPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE
    // Check if we can add more options
    const userOptions = practiceOptions.filter(o => !o.is_fixed && o.id !== "custom")
    if (userOptions.length >= maxSlots) {
      setMembershipPromptReason('options_full')
      setShowMembershipPrompt(true)
      return
    }

    const result = addOption(name, name, notes, undefined, membershipIsPro, colorLevel)
    if (!result) {
      toast.error('添加选项失败，可能已达到上限')
      return
    }

    toast.success('已添加自定义选项')
    // 如果已登录，自动同步到云端
    if (user) {
      setTimeout(async () => {
        await autoSync('添加自定义选项后同步')
      }, 500)
    }
  }

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
    // ⭐ 先发起 Supabase 连接测试（异步）
    let supabaseConnectionTest = { status: 'testing', latency: -1, error: null as string | null }
    try {
      const testStart = Date.now()
      // 执行一个简单的查询来测试连接
      const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
      const latency = Date.now() - testStart
      if (error) {
        supabaseConnectionTest = { status: 'error', latency, error: error.message }
      } else {
        supabaseConnectionTest = { status: 'success', latency, error: null }
      }
    } catch (e: any) {
      supabaseConnectionTest = { status: 'exception', latency: -1, error: e?.message || String(e) }
    }

    // ===== 1. Service Worker 状态 =====
    let serviceWorkerStatus: any = { supported: false, controller: null, state: null, scope: null }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      serviceWorkerStatus.supported = true
      const controller = navigator.serviceWorker.controller
      if (controller) {
        serviceWorkerStatus.controller = true
        serviceWorkerStatus.state = controller.state
        serviceWorkerStatus.scope = controller.scriptURL
      } else {
        serviceWorkerStatus.controller = false
      }
      // 尝试获取注册信息
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        serviceWorkerStatus.registrations = registrations.map(r => ({
          scope: r.scope,
          active: !!r.active,
          installing: !!r.installing,
          waiting: !!r.waiting,
          updateViaCache: r.updateViaCache
        }))
      } catch (e) {
        serviceWorkerStatus.registrationsError = String(e)
      }
    }

    // ===== 2. 环境信息 =====
    const environment = {
      userAgent: navigator.userAgent,
      browser: {
        language: navigator.language,
        languages: navigator.languages,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        pdfViewerEnabled: navigator.pdfViewerEnabled
      },
      deviceType: /mobile|tablet|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        orientation: window.screen.orientation?.type || 'unknown'
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        visualViewport: {
          width: window.visualViewport?.width,
          height: window.visualViewport?.height,
          scale: window.visualViewport?.scale
        }
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      exportTime: new Date().toISOString(),
      appVersion: '1.0.1'
    }

    // ===== 2. 网络状态 =====
    const networkInfo = {
      onLine: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
        saveData: (navigator as any).connection.saveData
      } : 'Not supported'
    }

    // ⭐ 2.5 Supabase 连接测试
    const supabaseConnection = {
      testStatus: supabaseConnectionTest.status,
      latency: supabaseConnectionTest.latency,
      error: supabaseConnectionTest.error,
      timestamp: new Date().toISOString()
    }

    // ===== 3. 认证状态 =====
    const authState = {
      isLoggedIn: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      lastSignInAt: user?.last_sign_in_at || null,
      createdAt: user?.created_at || null,
      appMetadata: user?.app_metadata || null,
      userMetadata: user?.user_metadata || null
    }

    // ===== 4. 同步状态 =====
    const syncState = {
      syncStatus,
      lastSyncTime,
      failedSyncIds: failedSyncIds || [],
      failedSyncCount: failedSyncIds?.length || 0,
      conflictLocalCount,
      conflictRemoteCount,
      showDataConflict
    }

    // ===== 5. 应用数据状态 =====
    const nonDraftRecords = practiceHistory.filter(r => r.type !== '草稿')
    const appState = {
      records: {
        totalCount: nonDraftRecords.length,
        withPhotos: nonDraftRecords.filter(r => r.photos?.length > 0).length,
        withNotes: nonDraftRecords.filter(r => r.notes?.trim()).length,
        withBreakthrough: nonDraftRecords.filter(r => r.breakthrough).length,
        totalDuration: nonDraftRecords.reduce((sum, r) => sum + (r.duration || 0), 0),
        averageDuration: nonDraftRecords.length > 0
          ? Math.round(nonDraftRecords.reduce((sum, r) => sum + (r.duration || 0), 0) / nonDraftRecords.length)
          : 0,
        dateRange: nonDraftRecords.length > 0 ? {
          earliest: nonDraftRecords[nonDraftRecords.length - 1]?.date,
          latest: nonDraftRecords[0]?.date
        } : null,
        colorLevelDistribution: {
          level1: nonDraftRecords.filter(r => r.color_level === 1).length,
          level2: nonDraftRecords.filter(r => r.color_level === 2).length,
          level3: nonDraftRecords.filter(r => r.color_level === 3 || r.color_level === undefined).length,
          level4: nonDraftRecords.filter(r => r.color_level === 4).length,
        }
      },
      options: {
        totalCount: practiceOptions.length,
        customCount: practiceOptions.filter(o => o.is_custom).length,
        systemCount: practiceOptions.filter(o => !o.is_custom).length,
        list: practiceOptions.map(o => ({
          id: o.id,
          label: o.label.substring(0, 50),
          hasNotes: !!o.notes,
          isCustom: o.is_custom,
          colorLevel: (o as any).color_level ?? 3
        }))
      },
      profile: {
        name: userProfile?.name || '未设置',
        hasSignature: !!userProfile?.signature,
        hasAvatar: !!userProfile?.avatar,
        isPro: membershipIsPro
      }
    }

    // ===== 6. LocalStorage 完整分析 =====
    const allKeys = Object.keys(localStorage)
    const storageState = {
      totalKeys: allKeys.length,
      appKeys: allKeys.filter(key => key.startsWith('ashtanga_') || key.includes('practice')),
      otherKeys: allKeys.filter(key => !key.startsWith('ashtanga_') && !key.includes('practice')).slice(0, 20),
      keyDetails: allKeys
        .filter(key => key.startsWith('ashtanga_') || key.includes('practice'))
        .map(key => {
          try {
            const value = localStorage.getItem(key)
            return {
              key,
              size: value ? new Blob([value]).size : 0,
              type: value?.startsWith('{') || value?.startsWith('[') ? 'json' : 'string'
            }
          } catch (e) {
            return { key, size: 0, type: 'error', error: String(e) }
          }
        }),
      estimatedTotalSize: new Blob(Object.values(localStorage)).size
    }

    // ===== 7. 所有练习记录（含完整觉察内容、照片URL用于排查） =====
    const recentRecords = practiceHistory.map(r => ({
      id: r.id,
      date: r.date,
      type: r.type?.substring(0, 30),
      duration: r.duration,
      notes: r.notes || '',
      breakthrough: r.breakthrough || '',
      photos: r.photos || [],
      hasPhotos: !!r.photos?.length,
      photosCount: r.photos?.length || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))

    // ===== 8. 导出历史（最近10条） =====
    const recentExportLogs = (exportLogs || []).slice(-10).map(log => ({
      timestamp: log.timestamp,
      success: log.success,
      error: log.error,
      recordDate: log.recordDate,
      deviceType: log.userAgent ?
        (/mobile|tablet|android|iphone/i.test(log.userAgent) ? 'mobile' : 'desktop') : 'unknown'
    }))

    // ===== 9. 错误历史（从 localStorage 读取） =====
    let errorHistory: any[] = []
    try {
      const storedErrors = localStorage.getItem('__errorHistory')
      if (storedErrors) {
        errorHistory = JSON.parse(storedErrors)
      }
    } catch (e) {
      errorHistory = [{ error: '读取错误历史失败', details: String(e) }]
    }

    // ===== 10. 性能指标 =====
    const performanceInfo = {
      navigation: performance.getEntriesByType('navigation')[0] ? {
        domComplete: Math.round((performance.getEntriesByType('navigation')[0] as any).domComplete),
        loadEventEnd: Math.round((performance.getEntriesByType('navigation')[0] as any).loadEventEnd),
        domInteractive: Math.round((performance.getEntriesByType('navigation')[0] as any).domInteractive)
      } : 'Not available',
      memory: (performance as any).memory ? {
        usedJSHeapSize: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        totalJSHeapSize: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + ' MB'
      } : 'Not available'
    }

    // ===== 11. 当前应用状态 =====
    const currentAppState = {
      activeTab,
      isPracticing: false,
      showSettings,
      showAccountSync,
      showAuthModal,
      authMode,
      showDataConflict,
      showClearDataConfirm,
      clearDataStep,
      currentPath: window.location.pathname,
      currentHash: window.location.hash,
      // 练习状态
      selectedOption,
      isPaused,
      elapsedTime,
      totalPausedTime,
      // 选项状态（用于诊断新增选项问题）
      optionsStatus: {
        totalCount: practiceOptions.length,
        customCount: practiceOptions.filter(o => o.is_custom).length,
        systemCount: practiceOptions.filter(o => !o.is_custom).length,
        isFull: practiceOptions.filter(o => o.id !== "custom").length >= 8,
        canDelete: practiceOptions.filter(o => o.id !== "custom").length > 2,
        selectedOptionId: selectedOption,
        customPracticeName: customPracticeName || null
      },
      // 弹窗状态
      modals: {
        showImportModal: showImportModal,
        showExportModal: showExportModal,
        showDebugLogModal: showDebugLogModal,
        showCompletion: showCompletion,
        showFakeDoor: showFakeDoor.isOpen
      },
      // 数据存储状态
      storage: {
        hasLocalData: practiceHistory.length > 0,
        localStorageKeysCount: Object.keys(localStorage).length,
        sessionStorageKeysCount: Object.keys(sessionStorage).length
      }
    }

    // ===== 12. 同步日志（从 localStorage 读取） =====
    let syncLogs: any = { entries: [], summary: {} }
    try {
      const storedLogs = localStorage.getItem('sync_logs')
      if (storedLogs) {
        const rawLogs = JSON.parse(storedLogs)
        // ⭐ 提取同步摘要：统计各触发原因下的本地/云端数量
        const triggers = rawLogs.filter((l: any) => l.triggerReason && l.triggerReason !== '未知触发原因')
        const conflictLogs = rawLogs.filter((l: any) => l.action.includes('冲突') || l.status === 'warning')
        const uploadLogs = rawLogs.filter((l: any) => l.action.includes('上传') || l.action.includes('仅本地'))
        const downloadLogs = rawLogs.filter((l: any) => l.action.includes('云端') || l.action.includes('下载'))
        syncLogs = {
          entries: rawLogs,
          summary: {
            total: rawLogs.length,
            conflicts: conflictLogs.length,
            uploadCount: uploadLogs.length,
            downloadCount: downloadLogs.length,
            lastTriggerReason: triggers[0]?.triggerReason || '未知',
            lastLocalCount: triggers[0]?.localCount,
            lastRemoteCount: triggers[0]?.remoteCount,
            lastSyncTime: rawLogs[0]?.timestamp,
          }
        }
      }
    } catch (e) {
      syncLogs = { entries: [{ action: '读取同步日志失败', error: String(e), timestamp: new Date().toISOString() }], summary: {} }
    }

    // ===== 13. 照片操作日志 =====
    let photoLogs: any = []
    try {
      const { getPhotoLogs, getPhotoErrorLogs } = await import('@/lib/photo-logger')
      photoLogs = {
        all: getPhotoLogs().slice(0, 50),
        errors: getPhotoErrorLogs().slice(0, 20),
        summary: {
          total: getPhotoLogs().length,
          errors: getPhotoErrorLogs().length,
        }
      }
    } catch (e) {
      photoLogs = { error: '读取照片日志失败', details: String(e) }
    }

    // ===== 14. 会员状态日志 =====
    let membershipLogs: any = { source: 'local_only' }
    try {
      // 14a. 本地 hook 状态
      membershipLogs.localState = {
        membership: membership ? {
          is_active: membership.is_active,
          type: membership.type,
          expires_at: membership.expires_at,
          expires_at_formatted: membership.expires_at_formatted,
          days_remaining: membership.days_remaining,
        } : null,
        isPro: membershipIsPro,
        loading: membershipLoading,
      }

      // 14b. 从 Supabase session 获取 token，调 API 查询后端会员状态
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        membershipLogs.hasSession = true
        membershipLogs.authUserId = user?.id || null
        membershipLogs.authEmail = user?.email || null

        try {
          const resp = await fetch('/api/membership/status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          })
          membershipLogs.apiStatus = resp.status
          const apiResult = await resp.json()
          membershipLogs.apiResponse = apiResult
        } catch (e: any) {
          membershipLogs.apiError = e?.message || String(e)
        }

        // 14c. 调 debug API 获取全链路数据
        try {
          const debugResp = await fetch('/api/debug/membership', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          })
          const debugResult = await debugResp.json()
          // 只取关键信息，避免日志过大
          if (debugResult.success && debugResult.data) {
            const d = debugResult.data
            membershipLogs.debugOverview = {
              envOk: d.env?.hasUrl && d.env?.hasKey,
              membershipCount: d.tables?.user_memberships?.count || 0,
              membershipRecords: d.tables?.user_memberships?.records || [],
              viewRecords: d.tables?.user_membership_status?.records || [],
              userSpecific: d.user_specific || null,
            }
          }
        } catch (e: any) {
          membershipLogs.debugApiError = e?.message || String(e)
        }
      } else {
        membershipLogs.hasSession = false
        membershipLogs.note = '用户未登录，无法查询后端会员状态'
      }

      // 14d. 唱诵相关状态
      membershipLogs.chantState = {
        enabled: chantEnabled,
        delay: chantDelaySeconds,
      }
    } catch (e: any) {
      membershipLogs.error = '收集会员日志失败: ' + (e?.message || String(e))
    }

    // ===== 15. 色阶同步诊断 =====
    let colorSyncDiag: any = {}
    try {
      // 15a. 本地 localStorage 原始数据
      const localOptsStr = localStorage.getItem('ashtanga_options')
      const localOpts = localOptsStr ? JSON.parse(localOptsStr) : []
      colorSyncDiag.localStorageOptions = localOpts.map((o: any) => ({
        id: o.id?.substring(0, 8),
        label: o.label,
        color_level: o.color_level,
        is_custom: o.is_custom,
      }))

      // 15b. 本地记录的 color_level 情况（最近10条）
      const localRecsStr = localStorage.getItem('ashtanga_records')
      const localRecs = localRecsStr ? JSON.parse(localRecsStr) : []
      colorSyncDiag.recentRecordColors = localRecs.slice(0, 10).map((r: any) => ({
        id: r.id?.substring(0, 8),
        date: r.date,
        type: r.type?.substring(0, 10),
        color_level: r.color_level,
        updated_at: r.updated_at,
      }))

      // 15c. 云端选项（直接查 Supabase）
      const userId = user?.id
      if (userId) {
        try {
          // 先查一次不带 color_level 的列，检测列是否存在
          const { data: testOpts, error: testError } = await supabase
            .from('practice_options')
            .select('id, label, color_level, is_custom, user_id')
            .eq('user_id', userId)
            .limit(1)
          if (testError) {
            colorSyncDiag.cloudQueryError = `practice_options.color_level 列可能不存在: ${testError.message}`
            colorSyncDiag.cloudQueryErrorCode = testError.code
          }
          const { data: cloudOpts } = await supabase
            .from('practice_options')
            .select('id, label, color_level, is_custom, user_id')
            .eq('user_id', userId)
          colorSyncDiag.cloudOptions = (cloudOpts || []).map((o: any) => ({
            id: o.id?.substring(0, 8),
            label: o.label,
            color_level: o.color_level,
            is_custom: o.is_custom,
          }))

          // 云端记录的 color_level（最近10条）
          const { data: cloudRecs } = await supabase
            .from('practice_records')
            .select('id, date, type, color_level, updated_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('date', { ascending: false })
            .limit(10)
          colorSyncDiag.cloudRecordColors = (cloudRecs || []).map((r: any) => ({
            id: r.id?.substring(0, 8),
            date: r.date,
            type: r.type?.substring(0, 10),
            color_level: r.color_level,
            updated_at: r.updated_at,
          }))
        } catch (e: any) {
          colorSyncDiag.cloudQueryError = e?.message || String(e)
        }
      } else {
        colorSyncDiag.cloudNote = '未登录，无法查询云端色阶数据'
      }

      // 15d. 同步日志中与选项相关的条目
      const storedLogs = localStorage.getItem('sync_logs')
      if (storedLogs) {
        const rawLogs = JSON.parse(storedLogs)
        colorSyncDiag.optionRelatedLogs = rawLogs
          .filter((l: any) => l.action?.includes('选项') || l.action?.includes('option'))
          .slice(0, 10)
      }
    } catch (e: any) {
      colorSyncDiag.error = '收集色阶诊断失败: ' + (e?.message || String(e))
    }

    // 生成完整日志
    const debugLog = {
      _meta: {
        version: '2.5',
        exportTime: new Date().toISOString(),
        description: '熬汤日记调试日志 - 用于问题排查',
        gitVersion: getVersionInfo()
      },
      serviceWorkerStatus,
      environment,
      networkInfo,
      supabaseConnection,
      authState,
      syncState,
      appState,
      storageState,
      recentRecords,
      recentExportLogs,
      errorHistory,
      performanceInfo,
      currentAppState,
      syncLogs,
      photoLogs,
      membershipLogs,
      colorSyncDiag
    }

    // 转换为JSON字符串并显示在弹窗中
    const jsonString = JSON.stringify(debugLog, null, 2)
    setDebugLogContent(jsonString)
    setShowDebugLogModal(true)
  }

  const canDeleteOption = useMemo(() => {
    const userOptions = practiceOptions.filter(o => !o.is_fixed && o.id !== "custom")
    return userOptions.length > 1
  }, [practiceOptions])

  const isOptionsFull = useMemo(() => {
    const maxSlots = membershipIsPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE
    // 只计算用户自定义选项（排除固定按钮和自定义添加按钮）
    const userOptions = practiceOptions.filter(o => !o.is_fixed && o.id !== "custom")
    return userOptions.length >= maxSlots
  }, [practiceOptions, membershipIsPro])

  const lockedOptionIds = useMemo(() => {
    if (membershipIsPro) return new Set<string>()
    const maxSlots = MAX_SLOTS_FREE
    // 只计算用户自定义选项
    const userOptions = practiceOptions.filter(o => !o.is_fixed && o.id !== "custom")
    return new Set(userOptions.slice(maxSlots).map(o => o.id))
  }, [practiceOptions, membershipIsPro])

  // 唱诵倒计时结束 → 播放唱诵音频
  const playChantAudio = useCallback(() => {
    setIsChantCountdown(false)
    setIsChantPlaying(true)
    const audio = new Audio('/audio/opening-chant.mp3')
    chantAudioRef.current = audio
    audio.addEventListener('ended', () => {
      // 唱诵结束，重置起始时间，从0开始练习计时
      chantAudioRef.current = null
      setIsChantPlaying(false)
      const now = Date.now()
      restartPracticeTimer(now)
    })
    audio.addEventListener('error', () => {
      chantAudioRef.current = null
      setIsChantPlaying(false)
      const now = Date.now()
      restartPracticeTimer(now)
      toast.error('唱诵音频加载失败')
    })
    audio.play().catch(() => {
      chantAudioRef.current = null
      setIsChantPlaying(false)
      const now = Date.now()
      restartPracticeTimer(now)
    })
  }, [restartPracticeTimer])

  // 跳过倒计时，直接播放唱诵
  const skipChantCountdown = useCallback(() => {
    if (chantCountdownRef.current) {
      clearInterval(chantCountdownRef.current)
      chantCountdownRef.current = null
    }
    playChantAudio()
  }, [playChantAudio])

  // 启动唱诵倒计时
  const startChantCountdown = useCallback((context: ActivePracticeContext) => {
    // 先进入练习界面
    const now = Date.now()
    startPracticeSession(true, now, context)

    // 启动倒计时
    let remaining = chantDelaySeconds
    setChantCountdown(remaining)
    setIsChantCountdown(true)

    chantCountdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (chantCountdownRef.current) {
          clearInterval(chantCountdownRef.current)
          chantCountdownRef.current = null
        }
        playChantAudio()
      } else {
        setChantCountdown(remaining)
      }
    }, 1000)
  }, [chantDelaySeconds, playChantAudio, startPracticeSession])

  // 统一设置 Audio 事件监听（DRY）
  const setupAudioEvents = (audio: HTMLAudioElement, onError: (e: Event) => void) => {
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration)
      setIsAudioLoaded(true)
      setIsAudioLoading(false)
      resumePracticeSession()
      audio.play()
    })

    audio.addEventListener('timeupdate', () => {
      setAudioCurrentTime(audio.currentTime)
      setAudioProgress((audio.currentTime / audio.duration) * 100)
    })

    audio.addEventListener('ended', () => {
      handleEndRequest()
    })

    audio.addEventListener('error', onError)
  }

  // 口令跟练音频加载（可独立调用，重试按钮复用）
  const loadGuidedAudio = async () => {
    setIsAudioLoading(true)
    setAudioError(null)
    setAudioDownloadProgress(0)
    setIsBackgroundCaching(false)
    pausePracticeSession()

    // 释放旧的 Blob URL
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = null
    }

    try {
      const hasCache = await audioCache.isCacheValid()

      if (hasCache) {
        // 缓存命中：IndexedDB → Blob URL → Audio
        console.log('[音频] 使用本地缓存')
        setIsUsingCache(true)
        const audioBuffer = await audioCache.getAudioBuffer()

        if (audioBuffer) {
          const blob = new Blob([audioBuffer], { type: 'audio/mp4' })
          const url = URL.createObjectURL(blob)
          audioBlobUrlRef.current = url // 追踪 Blob URL

          const audio = new Audio()
          audio.src = url

          setupAudioEvents(audio, (e) => {
            console.error('[音频] 缓存播放失败:', e)
            audioCache.clearCache()
            setAudioError('音频播放失败，请重试')
            setIsAudioLoading(false)
          })

          setAudioElement(audio)
        } else {
          throw new Error('缓存数据无效')
        }
      } else {
        // 缓存未命中：直接流式播放 + 后台缓存
        console.log('[音频] 流式播放 + 后台缓存')
        setIsUsingCache(false)

        const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

        setupAudioEvents(audio, (e) => {
          console.error('[音频] 流式播放失败:', e)
          setIsAudioLoading(false)
          setAudioError('音频播放失败，请检查网络连接')
        })

        setAudioElement(audio)

        // 后台缓存到 IndexedDB（不阻塞播放，静默进行）
        setIsBackgroundCaching(true)
        audioCache.downloadAndCache(
          GUIDED_AUDIO_OPTION.audio_src || '',
          undefined, // 不显示进度——流式播放不需要
          { priority: 'low' }
        ).then(() => {
          console.log('[音频] 后台缓存完成')
          setIsBackgroundCaching(false)
        }).catch((err) => {
          console.error('[音频] 后台缓存失败（不影响播放）:', err)
          setIsBackgroundCaching(false)
        })
      }
    } catch (err) {
      console.error('[音频] 加载失败:', err)
      setAudioError('音频加载失败')
      setIsAudioLoading(false)
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
      startPracticeSession(false, now, {
        optionId: selectedOption,
        label: getSelectedLabel(),
        notes: getSelectedNotes(),
      })

      // 口令跟练模式：加载音频
      if (selectedOption === 'guided_audio') {
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
      if (audioElement && selectedOption === 'guided_audio') {
        audioElement.pause()
      }
    } else {
      resumePracticeSession(now)
      // 音频同步继续
      if (audioElement && selectedOption === 'guided_audio') {
        audioElement.play()
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

  // 音频时间格式化
  const formatAudioTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 快进/后退功能
  const handleAudioSeek = (direction: 'forward' | 'backward') => {
    if (audioElement && isAudioLoaded) {
      const seconds = direction === 'forward' ? seekStep : -seekStep
      const newTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + seconds))
      audioElement.currentTime = newTime
      setAudioCurrentTime(newTime)
    }
  }

  // 步长选项
  const SEEK_STEP_OPTIONS = [10, 15, 30]

  const handleEndRequest = () => {
    requestPracticeEnd()
  }

  const handleConfirmEnd = () => {
    confirmPracticeEnd()

    // 清理唱诵资源
    if (chantCountdownRef.current) {
      clearInterval(chantCountdownRef.current)
      chantCountdownRef.current = null
    }
    if (chantAudioRef.current) {
      chantAudioRef.current.pause()
      chantAudioRef.current.src = ''
      chantAudioRef.current = null
    }
    setIsChantCountdown(false)
    setChantCountdown(0)
    setIsChantPlaying(false)

    // 清理音频资源
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      setAudioElement(null)
      setIsAudioLoaded(false)
      setAudioProgress(0)
      setAudioCurrentTime(0)
      setAudioDuration(0)
      // 释放 Blob URL（防内存泄漏）
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current)
        audioBlobUrlRef.current = null
      }
    }
  }

  // 不保存结束：丢弃记录，直接回到初始状态
  const handleDiscardEnd = () => {
    discardPracticeEnd()

    // 清理唱诵资源
    if (chantCountdownRef.current) {
      clearInterval(chantCountdownRef.current)
      chantCountdownRef.current = null
    }
    if (chantAudioRef.current) {
      chantAudioRef.current.pause()
      chantAudioRef.current.src = ''
      chantAudioRef.current = null
    }
    setIsChantCountdown(false)
    setChantCountdown(0)
    setIsChantPlaying(false)

    // 清理音频资源
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      setAudioElement(null)
      setIsAudioLoaded(false)
      setAudioProgress(0)
      setAudioCurrentTime(0)
      setAudioDuration(0)
      // 释放 Blob URL（防内存泄漏）
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current)
        audioBlobUrlRef.current = null
      }
    }
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background flex flex-col relative"
      >
        {/* 唱诵倒计时全屏覆盖 */}
        <AnimatePresence>
          {isChantCountdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/30 backdrop-blur-[8px] z-50 flex flex-col items-center border border-white/30"
            >
              <main className="flex-1 flex items-center justify-center px-6">
                <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-5xl sm:text-6xl font-light text-foreground font-serif">
                    {chantCountdown}
                  </span>
                </div>
              </main>
              <div className="px-6 pb-32 flex justify-center">
                <button
                  onClick={skipChantCountdown}
                  className="flex items-center gap-2 px-8 py-4 rounded-full bg-card/80 backdrop-blur-md border border-white/10 text-foreground font-serif shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-card transition-colors"
                >
                  跳过
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* 唱诵播放中提示 */}
        {isChantPlaying && (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
            <span className="text-xs text-foreground/70 font-serif bg-white/30 backdrop-blur-[8px] border border-white/30 px-4 py-1.5 rounded-full">
              唱诵中...
            </span>
          </div>
        )}
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="relative"
          >
            {/* Breathing Ripples - paused when timer is paused */}
            <div className="absolute inset-[-20px]">
              <BreathingRipples isPaused={isPaused ?? false} />
            </div>
            
            {/* Main circle with glassmorphism gradient border - scaled down 30% */}
            <div className={`w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full green-gradient p-[2px] shadow-[0_12px_48px_rgba(45,90,39,0.45)] ${!isPaused ? 'animate-breathe' : ''}`}>
              <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-[16px] flex flex-col items-center justify-center border border-white/30 relative">
                {/* Timer display - Minutes large, unit below */}
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-6xl font-light text-foreground tracking-wider font-serif">
                    {formatMinutes(elapsedTime)}
                  </span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-foreground text-lg font-serif">
                      分
                    </span>
                    {formatSeconds(elapsedTime) !== '00' && (
                      <span className="text-muted-foreground text-sm font-serif">
                        {formatSeconds(elapsedTime)}秒
                      </span>
                    )}
                  </div>
                </div>

                {/* Practice type and notes below */}
                <div className="flex flex-col items-center mt-2">
                  <span className="text-[14px] leading-snug text-center text-foreground font-serif">
                    {getSelectedLabel()}
                  </span>
                  {getSelectedNotes() && (
                    <span className="text-[11px] leading-snug text-center text-muted-foreground/70 font-serif mt-0.5">
                      {getSelectedNotes()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* 音频播放器进度条 - 仅在口令跟练模式显示，放在大圆圈和按钮之间 */}
        {selectedOption === 'guided_audio' && isAudioLoaded && !isAudioLoading && !audioError && (
          <motion.div
            className="w-full max-w-sm mx-auto px-6 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 进度条 */}
            <div className="relative h-1.5 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/10">
              <div
                className="absolute inset-y-0 left-0 bg-primary/80 rounded-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>

            {/* 时间显示 */}
            <div className="flex justify-between text-xs text-foreground/50 mt-2 font-serif">
              <span>{formatAudioTime(audioCurrentTime)}</span>
              <span>{formatAudioTime(audioDuration)}</span>
            </div>
          </motion.div>
        )}

        {/* Control buttons - moved up 30% to avoid clipping on mobile */}
        <div className="px-6 pb-32">
          {/* 音频加载状态 - 仅在口令跟练模式显示 */}
          {selectedOption === 'guided_audio' && isAudioLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-3 bg-white/20 backdrop-blur-[8px] rounded-2xl border border-white/30"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-foreground/70 mt-4 font-serif">
                {isUsingCache ? '从缓存读取...' : '加载音频中...'}
              </p>
            </motion.div>
          )}

          {/* 音频错误状态 - 仅在口令跟练模式显示 */}
          {selectedOption === 'guided_audio' && audioError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-6 bg-white/20 backdrop-blur-[8px] rounded-2xl border border-white/30"
            >
              <AlertCircle className="w-12 h-12 text-destructive mb-3" />
              <p className="text-sm text-destructive font-serif text-center">
                {audioError}
              </p>
              <button
                onClick={() => {
                  setAudioError(null)
                  loadGuidedAudio()
                }}
                className="mt-4 px-6 py-2 rounded-full green-gradient text-white text-sm font-serif"
              >
                重试
              </button>
            </motion.div>
          )}

          {/* 暂停/结束按钮 - 音频加载完成后显示 */}
          {(!selectedOption || selectedOption !== 'guided_audio' || (isAudioLoaded && !isAudioLoading && !audioError)) && (
          <>
          {/* 暂停/结束按钮 - 恢复原始样式 */}
          <div className="flex gap-4 justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-card/80 backdrop-blur-md border border-white/10 text-foreground font-serif shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-card transition-colors"
            >
              {isPaused ? (
                <>
                  <Play className="w-5 h-5" />
                  继续
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  暂停
                </>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEndRequest}
              className="px-8 py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif shadow-[0_4px_20px_rgba(45,90,39,0.2)] hover:opacity-90 transition-opacity"
            >
              结束
            </motion.button>
          </div>

          {/* 步长选择器 + 前进/后退按钮 - 仅在口令跟练模式显示 */}
          {selectedOption === 'guided_audio' && isAudioLoaded && !isAudioLoading && !audioError && (
            <div className="flex items-center justify-center gap-3 mt-4 bg-white/20 backdrop-blur-[8px] rounded-full px-3 py-1.5 border border-white/30">
              {/* 后退按钮 */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAudioSeek('backward')}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-foreground/50 hover:text-foreground transition-all"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </motion.button>

              {/* 步长选择器 */}
              <div className="flex items-center gap-1">
                {SEEK_STEP_OPTIONS.map((step) => (
                  <button
                    key={step}
                    onClick={() => setSeekStep(step)}
                    className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${
                      seekStep === step
                        ? 'green-gradient text-white shadow-sm'
                        : 'text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {step}秒
                  </button>
                ))}
              </div>

              {/* 前进按钮 */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAudioSeek('forward')}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-foreground/50 hover:text-foreground transition-all"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
          </>
          )}
        </div>

        <ConfirmEndDialog isOpen={showConfirmEnd} onClose={cancelPracticeEnd} onConfirm={handleConfirmEnd} onDiscard={handleDiscardEnd} />

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
      </motion.div>
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
        <main className="flex-1 px-6 flex flex-col pb-32 overflow-y-auto">
          {/* Header - scrolls with content, can be clipped */}
          <header className="pt-12 pb-4 flex items-center justify-center">
            <div className="flex flex-row items-center gap-3">
              <img src="/icon.png" alt="熬汤日记" className="w-[34px] h-[34px] rounded-lg shadow-sm" />
              <div className="flex flex-col">
                <h1 className="text-lg font-serif text-foreground tracking-wide font-semibold">
                  熬汤日记
                  <span className="text-muted-foreground/50 font-normal">·呼吸</span>
                  <span className="text-muted-foreground/70 font-normal">·觉察</span>
                </h1>
                <p className="text-[9px] text-muted-foreground/50 font-serif tracking-wide leading-tight">
                  Practice, practice, and all is coming.
                </p>
              </div>
            </div>
          </header>
          {/* Selection Grid - Glassmorphism on selected */}
          <div className="grid grid-cols-3 gap-2 p-4">
            {practiceOptions.map((option) => {
              const isSelected = selectedOption === option.id
              const isCustomButton = option.id === "custom"
              const isLocked = !isCustomButton && lockedOptionIds.has(option.id)
              const isChantOn = option.id === 'chant_switch' && chantEnabled

              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOptionTap(option)}
                  className={`
                    py-[6px] px-1 rounded-[20px] text-center font-serif transition-all duration-300
                    min-h-[72px] w-full flex flex-col items-center justify-center relative
                    ${
                      (isSelected || isChantOn) && !isLocked
                        ? "green-gradient text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                        : isLocked
                          ? "bg-muted/50 text-muted-foreground/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-100/30 opacity-50"
                          : isCustomButton
                            ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                            : "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
                    }
                  `}
                >
                  {isLocked && (
                    <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground/40" />
                  )}
                  {option.id === 'today_count' ? (
                    <>
                      <span className="text-[14px] leading-snug flex items-center justify-center">
                        <span className="text-[#C5975C] font-bold">{option.label}</span>
                      </span>
                      <span className={`text-[11px] mt-0.5 leading-snug ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {option.notes}
                      </span>
                    </>
                  ) : (
                  <>
                  <span className={`text-[14px] leading-snug break-words w-full line-clamp-2 flex items-center justify-center gap-1`}>
                    {isCustomButton ? "+ 自定义" : (
                      <>
                        <span>{option.label}</span>
                        {option.is_preset && <Volume className="w-4 h-4" style={{ color: isSelected && !isLocked ? 'white' : 'rgba(74, 122, 68)' }} />}
                      </>
                    )}
                  </span>
                  {!isCustomButton && option.notes && (
                    <span className={`text-[11px] mt-0.5 leading-snug break-words w-full line-clamp-2 ${(isSelected || isChantOn) && !isLocked ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {option.notes}
                    </span>
                  )}
                  </>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Hint text */}
          <p className="text-center text-xs text-muted-foreground font-serif mt-[-4px]">
            单击选择·双击编辑
          </p>

          {/* Spacer - takes up remaining space to center the button */}
          <div className="flex-1" />

          {/* Start Practice Button - vertically centered between grid and nav */}
          <div className="flex flex-col items-center justify-center py-6">
            <motion.div
              layout={false}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "loop"
              }}
              className={`
                w-36 h-36 rounded-full flex items-center justify-center relative overflow-hidden
                transition-colors duration-500
                ${selectedOption
                  ? "green-gradient cursor-pointer backdrop-blur-[16px] border border-white/30 shadow-[0_12px_48px_rgba(45,90,39,0.45)]"
                  : "bg-muted/50 backdrop-blur-sm"
                }
              `}
              onClick={selectedOption ? handleStartPractice : undefined}
              whileTap={selectedOption ? { scale: 0.95 } : {}}
            >
              {/* Meditation figure - green on light circle, cream on green circle */}
              <img 
                src={selectedOption ? "/icon-light.png" : "/icon-green.png"} 
                alt="" 
                className="w-24 h-24 transition-all duration-500 opacity-60"
              />
            </motion.div>
            <span className={`
              mt-3 text-sm font-serif text-center
              ${selectedOption ? "text-primary" : "text-muted-foreground"}
            `}>
              {selectedOption ? "开始练习" : "请选择练习类型"}
            </span>
          </div>
        </main>
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
      <AnimatePresence>

        {!hasAnyModalOpen && (
          <motion.nav
            initial={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="bg-white/30 backdrop-blur-[8px] rounded-full px-1 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-white/30">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    console.log('[Tab] 点击今日练习, 当前:', activeTab)
                    setActiveTab('practice')
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all ${activeTab === 'practice' ? 'green-gradient text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-serif whitespace-nowrap">今日练习</span>
                </button>
                <button
                  onClick={() => {
                    console.log('[Tab] 点击觉察日记, 当前:', activeTab)
                    setActiveTab('journal')
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all ${activeTab === 'journal' ? 'green-gradient text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] font-serif whitespace-nowrap">觉察日记</span>
                </button>
                <button
                  onClick={() => {
                    console.log('[Tab] 点击体式库, 当前:', activeTab)
                    setActiveTab('poses')
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all ${activeTab === 'poses' ? 'green-gradient text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <Library className="w-5 h-5" />
                  <span className="text-[10px] font-serif whitespace-nowrap">体式库</span>
                </button>
                <button
                  onClick={() => {
                    console.log('[Tab] 点击我的数据, 当前:', activeTab)
                    setActiveTab('stats')
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all ${activeTab === 'stats' ? 'green-gradient text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-[10px] font-serif whitespace-nowrap">我的数据</span>
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Custom Practice Modal */}
      <CustomPracticeModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onConfirm={handleAddOption}
        isFull={isOptionsFull}
        maxSlots={membershipIsPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE}
        membership={membership}
        onShowMembershipPrompt={() => {
          setMembershipPromptReason('color_level')
          setShowMembershipPrompt(true)
        }}
      />

      {/* Edit Option Modal */}
      <EditOptionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingOption(null)
        }}
        option={editingOption}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        canDelete={canDeleteOption && editingOption?.id !== "custom"}
        membership={membership}
        onShowMembershipPrompt={() => {
          setMembershipPromptReason('color_level')
          setShowMembershipPrompt(true)
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSettingsInitialSection('profile') // 重置初始标签页
        }}
        initialSection={settingsInitialSection}
        profile={userProfile}
        onSave={async (profile) => {
          // 先保存到本地
          updateProfile(profile)
          // 如果已登录，自动同步到云端
          if (user) {
            toast.loading('正在同步到云端...', { id: 'sync-profile' })
            try {
              const result = await autoSync('保存个人资料后同步')
              toast.dismiss('sync-profile')
              if (result) {
                toast.success('✅ 资料已同步到云端')
              } else {
                toast.error('❌ 同步失败，请稍后重试')
              }
            } catch (e) {
              toast.dismiss('sync-profile')
              toast.error('❌ 同步失败')
            }
          }
        }}
        onOpenExport={() => {
          const data = exportData()
          setExportedData(data)
          setShowExportModal(true)
        }}
        onOpenImport={() => setShowImportModal(true)}
        onExportLog={handleExportDebugLog}
        onClearData={clearAllData}
        user={user}
        practiceHistory={practiceHistory}
        practiceOptionsData={practiceOptionsData}
        onShowClearDataConfirm={() => {
          setClearDataStep(1)
          setConfirmPhrase('')
          setShowClearDataConfirm(true)
        }}
        onOpenLoginModal={() => {
          setShowAuthModal(true)
          setAuthMode('login')
        }}
        onOpenRegisterModal={() => {
          setShowAuthModal(true)
          setAuthMode('register')
        }}
        membership={membership}
        onActivateMembership={() => {
          setShowActivateModal(true)
        }}
        onPurchaseMembership={() => setShowPurchaseModal(true)}
        onUpdateProfile={updateProfile}
      />

      {/* Annotation Manager Modal */}
      <AnnotationManagerModal
        isOpen={showAnnotationManager}
        onClose={() => setShowAnnotationManager(false)}
        types={annotationTypes}
        maxTypes={maxAnnotationTypes}
        isPro={membershipIsPro}
        onCreateType={createAnnotationType}
        onUpdateType={updateAnnotationType}
        onDeleteType={deleteAnnotationType}
        onAddAnnotation={addAnnotation}
        onRemoveAnnotation={removeAnnotation}
        onLockedClick={() => {
          setMembershipPromptReason('locked_annotation')
          setShowMembershipPrompt(true)
        }}
        annotationDates={annotationDates}
      />

      {/* Activate Membership Modal */}
      <ActivateModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={async () => {
          // ⭐ 刷新会员状态，等待完成后再关闭弹窗
          console.log('[Practice] 激活成功，准备刷新会员状态')
          await refreshMembership()
          console.log('[Practice] refreshMembership 完成')
        }}
      />

      {/* Membership Prompt Modal - 纯转化弹窗 */}
      <MembershipPromptModal
        isOpen={showMembershipPrompt}
        onClose={() => setShowMembershipPrompt(false)}
        reason={membershipPromptReason}
        onActivate={() => setShowActivateModal(true)}
      />

      {/* Purchase Guide Modal */}
      <PurchaseGuideModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />

      {/* Account & Sync Modal */}
      <AccountSyncModal
        isOpen={showAccountSync}
        onClose={() => setShowAccountSync(false)}
        profile={userProfile}
        practiceHistory={practiceHistory}
        practiceOptionsData={practiceOptionsData}
        onOpenLoginModal={() => {
          setShowAuthModal(true)
          setAuthMode('login')
        }}
        onOpenRegisterModal={() => {
          setShowAuthModal(true)
          setAuthMode('register')
        }}
        onShowClearDataConfirm={() => {
          setShowClearDataConfirm(true)
          setClearDataStep(2) // 直接从 Step 2（输入确认词）开始
        }}
        onUpdateProfile={updateProfile}
        user={user}
      />

      {/* 清空数据确认弹窗 - 居中显示 */}
      {showClearDataConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setShowClearDataConfirm(false)}
          />
          {/* Modal - 居中显示 */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto">
              <div className="p-6 pb-10">
              {/* 第一层：警告 */}
              {clearDataStep === 1 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">⚠️ 危险操作警告</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      您正在尝试清空本地数据胶囊。
                    </p>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm font-serif text-red-700 font-medium mb-2">此操作将永久删除：</p>
                      <ul className="text-sm font-serif text-red-600 space-y-1 pl-4">
                        <li>• 所有练习记录</li>
                        <li>• 练习选项</li>
                        <li>• 个人信息</li>
                        <li>• 同步日志</li>
                      </ul>
                    </div>

                    <p className="text-sm font-serif text-red-600 text-center font-medium">
                      ⚠️ 此操作不可撤销！
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowClearDataConfirm(false)}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => setClearDataStep(2)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif"
                      >
                        继续操作
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 第二层：输入确认词 */}
              {clearDataStep === 2 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">⚠️ 二次确认</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      为防止误操作，请输入确认词。
                    </p>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm font-serif text-red-700 text-center mb-2">确认词：</p>
                      <p className="text-lg font-serif text-red-800 text-center font-bold">确认删除</p>
                    </div>

                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder="请输入确认词（不含引号）"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-secondary font-serif"
                      autoFocus
                    />

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setClearDataStep(1)}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => {
                          if (confirmPhrase === '确认删除') {
                            setClearDataStep(3)
                          } else {
                            toast.error('确认词输入错误，请重新输入')
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 第三层：完成 */}
              {clearDataStep === 3 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">✅ 数据已清空</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      所有本地数据已成功删除。
                    </p>

                    <p className="text-sm font-serif text-muted-foreground text-center">
                      点击完成后将退出登录并返回首页。
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={async () => {
                          localStorage.clear()
                          if (user && clearAllData) {
                            await clearAllData()
                          }
                          setShowClearDataConfirm(false)
                          setClearDataStep(1)
                          await supabase.auth.signOut() // 确保退出登录
                          router.push('/')
                        }}
                        className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all font-serif"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(json) => {
          const result = importData(json)

          if (result) {
            toast.success('✅ 数据导入成功！', {
              duration: 3000,
              position: 'top-center'
            })
            trackEvent('import_data')
            setTimeout(() => {
              setShowImportModal(false)
              setShowSettings(false)
            }, 500)
          } else {
            toast.error('❌ 数据导入失败，请检查格式', {
              duration: 3000,
              position: 'top-center'
            })
          }
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={exportedData}
      />

      {/* Debug Log Modal */}
      <DebugLogModal
        isOpen={showDebugLogModal}
        onClose={() => setShowDebugLogModal(false)}
        logContent={debugLogContent}
      />

      {/* Completion Sheet */}
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

      {/* Fake Door Modal */}
      <FakeDoorModal
        type={showFakeDoor.type}
        isOpen={showFakeDoor.isOpen}
        onClose={() => setShowFakeDoor({ ...showFakeDoor, isOpen: false })}
        onVote={handleVoteCloud}
      />

      {/* 小红书群邀请弹窗 */}
      <XiaohongshuInviteModal
        isOpen={showXiaohongshuModal}
        onClose={() => {
          setShowXiaohongshuModal(false)
          // 关闭时再次确保标记为已读（双重保险）
          setReadInviteVersion(INVITE_VERSION)
        }}
      />

      {/* Auth Modal - 登录/注册/忘记密码 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onAuthSuccess={() => { setShowAuthModal(false); refreshMembership() }}
        onModeChange={(newMode) => setAuthMode(newMode)}
      />

      {/* 唱诵设置 Sheet */}
      <AnimatePresence>
        {showChantSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[100]"
              onClick={() => setShowChantSettings(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
              onAnimationComplete={() => {
                // 动画完成（保留 ref 以备后用）
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif text-foreground">唱诵设置</h2>
                <button onClick={() => {
                  // 关闭时同步到 chantDelay
                  const total = chantMins * 60 + chantSecs
                  if (total >= 5) setChantDelay(total)
                  setShowChantSettings(false)
                }} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {membershipIsPro ? (
                <div className="space-y-5">
                  <label className="block text-sm font-serif text-foreground">
                    倒计时时长
                  </label>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          const v = Math.min(180, chantMins + 1)
                          setChantMins(v)
                          const total = v * 60 + chantSecs
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={chantMins}
                        onChange={(e) => {
                          const v = Math.min(180, Math.max(0, parseInt(e.target.value) || 0))
                          setChantMins(v)
                          const total = v * 60 + chantSecs
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-16 text-center text-3xl font-light text-foreground bg-secondary/60 rounded-2xl border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-secondary appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => {
                          const v = Math.max(0, chantMins - 1)
                          setChantMins(v)
                          const total = v * 60 + chantSecs
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="text-base font-serif text-muted-foreground mt-1">分</span>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          const v = Math.min(59, chantSecs + 1)
                          setChantSecs(v)
                          const total = chantMins * 60 + v
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={chantSecs}
                        onChange={(e) => {
                          const v = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                          setChantSecs(v)
                          const total = chantMins * 60 + v
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-16 text-center text-3xl font-light text-foreground bg-secondary/60 rounded-2xl border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-secondary appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => {
                          const v = Math.max(0, chantSecs - 1)
                          setChantSecs(v)
                          const total = chantMins * 60 + v
                          if (total >= 5) setChantDelay(total)
                        }}
                        className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="text-base font-serif text-muted-foreground mt-1">秒</span>
                  </div>
                  <p className="text-center text-xs text-muted-foreground/60 font-serif">
                    当前：{Math.floor(chantDelaySeconds / 60)}分{String(chantDelaySeconds % 60).padStart(2, '0')}秒（最少5秒，最长3小时）
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground/60 font-serif">Pro 功能</span>
                  </div>
                  <label className="block text-sm font-serif text-foreground">
                    倒计时时长
                  </label>
                  {/* 灰色滚轮预览（静态展示当前值） */}
                  <div className="flex items-center justify-center gap-3 opacity-40 pointer-events-none">
                    <div className="w-20 h-[160px] flex items-center justify-center">
                      <span className="text-4xl font-serif text-foreground">{Math.floor(chantDelaySeconds / 60)}</span>
                    </div>
                    <span className="text-sm font-serif text-muted-foreground">分</span>
                    <div className="w-20 h-[160px] flex items-center justify-center">
                      <span className="text-4xl font-serif text-foreground">{String(chantDelaySeconds % 60).padStart(2, '0')}</span>
                    </div>
                    <span className="text-sm font-serif text-muted-foreground">秒</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                    开启后，开始练习前会先全屏倒计时，然后播放开篇唱诵音频，结束后自动开始练习计时。
                  </p>
                  <button
                    onClick={() => {
                      setShowChantSettings(false)
                      setMembershipPromptReason('options_full')
                      setShowMembershipPrompt(true)
                    }}
                    className="w-full mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-serif shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
                  >
                    <Crown className="w-4 h-4 inline mr-1" />
                    升级 Pro 解锁自定义时长
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Data Conflict Modal - 数据冲突处理 */}
      <DataConflictModal
        isOpen={showDataConflict}
        localCount={conflictLocalCount}
        remoteCount={conflictRemoteCount}
        onSelect={handleResolveConflict}
      />
    </div>
  )
}
