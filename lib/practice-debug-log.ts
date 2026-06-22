import type { User } from '@supabase/supabase-js'
import type { MembershipStatus } from '@/hooks/useMembership'
import type { PracticeOption, PracticeRecord, UserProfile } from '@/hooks/usePracticeData'
import { supabase } from '@/lib/supabase'
import { getVersionInfo } from '@/lib/version'

export interface PracticeExportLog {
  timestamp: string
  success: boolean
  error?: string
  userAgent: string
  recordDate?: string
}

export interface PracticeDebugLogInput {
  user: User | null
  syncStatus: unknown
  lastSyncTime: unknown
  failedSyncIds?: string[] | null
  conflictLocalCount: number
  conflictRemoteCount: number
  showDataConflict: boolean
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  userProfile: UserProfile
  membership: MembershipStatus | null
  membershipIsPro: boolean
  membershipLoading: boolean
  exportLogs?: PracticeExportLog[] | null
  activeTab: string
  showSettings: boolean
  showAccountSync: boolean
  showAuthModal: boolean
  authMode: string
  showClearDataConfirm: boolean
  clearDataStep: number
  selectedOption: string | null
  isPaused: boolean
  elapsedTime: number
  totalPausedTime: number
  customPracticeName: string
  showImportModal: boolean
  showExportModal: boolean
  showDebugLogModal: boolean
  showCompletion: boolean
  showFakeDoor: boolean
  chantEnabled: boolean | undefined
  chantDelaySeconds: number
}

export async function collectPracticeDebugLog(input: PracticeDebugLogInput) {
  const connection = await testSupabaseConnection()
  const nonDraftRecords = input.practiceHistory.filter((record) => record.type !== '草稿')

  return {
    _meta: {
      version: '2.5',
      exportTime: new Date().toISOString(),
      description: '熬汤日记调试日志 - 用于问题排查',
      gitVersion: getVersionInfo(),
    },
    serviceWorkerStatus: await collectServiceWorkerStatus(),
    environment: collectEnvironment(),
    networkInfo: collectNetworkInfo(),
    supabaseConnection: { ...connection, timestamp: new Date().toISOString() },
    authState: collectAuthState(input.user),
    syncState: {
      syncStatus: input.syncStatus,
      lastSyncTime: input.lastSyncTime,
      failedSyncIds: input.failedSyncIds || [],
      failedSyncCount: input.failedSyncIds?.length || 0,
      conflictLocalCount: input.conflictLocalCount,
      conflictRemoteCount: input.conflictRemoteCount,
      showDataConflict: input.showDataConflict,
    },
    appState: summarizeAppState(input, nonDraftRecords),
    storageState: collectStorageState(),
    recentRecords: input.practiceHistory.map((record) => ({
      id: record.id,
      date: record.date,
      type: record.type?.substring(0, 30),
      duration: record.duration,
      notes: record.notes || '',
      breakthrough: record.breakthrough || '',
      photos: record.photos || [],
      hasPhotos: !!record.photos?.length,
      photosCount: record.photos?.length || 0,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    })),
    recentExportLogs: (input.exportLogs || []).slice(-10).map((log) => ({
      timestamp: log.timestamp,
      success: log.success,
      error: log.error,
      recordDate: log.recordDate,
      deviceType: log.userAgent
        ? (/mobile|tablet|android|iphone/i.test(log.userAgent) ? 'mobile' : 'desktop')
        : 'unknown',
    })),
    errorHistory: readJsonStorage('__errorHistory', [], '读取错误历史失败'),
    performanceInfo: collectPerformanceInfo(),
    currentAppState: collectCurrentAppState(input),
    syncLogs: collectSyncLogs(),
    photoLogs: await collectPhotoLogs(),
    membershipLogs: await collectMembershipLogs(input),
    colorSyncDiag: await collectColorSyncDiagnostics(input.user),
  }
}

async function testSupabaseConnection() {
  try {
    const startedAt = Date.now()
    const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    const latency = Date.now() - startedAt
    return error
      ? { testStatus: 'error', latency, error: error.message }
      : { testStatus: 'success', latency, error: null }
  } catch (error) {
    return { testStatus: 'exception', latency: -1, error: toErrorMessage(error) }
  }
}

async function collectServiceWorkerStatus() {
  const status: Record<string, unknown> = { supported: false, controller: null, state: null, scope: null }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return status

  status.supported = true
  const controller = navigator.serviceWorker.controller
  status.controller = !!controller
  if (controller) {
    status.state = controller.state
    status.scope = controller.scriptURL
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    status.registrations = registrations.map((registration) => ({
      scope: registration.scope,
      active: !!registration.active,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
      updateViaCache: registration.updateViaCache,
    }))
  } catch (error) {
    status.registrationsError = String(error)
  }
  return status
}

function collectEnvironment() {
  return {
    userAgent: navigator.userAgent,
    browser: {
      language: navigator.language,
      languages: navigator.languages,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
    },
    deviceType: /mobile|tablet|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      orientation: window.screen.orientation?.type || 'unknown',
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      visualViewport: {
        width: window.visualViewport?.width,
        height: window.visualViewport?.height,
        scale: window.visualViewport?.scale,
      },
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    exportTime: new Date().toISOString(),
    appVersion: '1.0.1',
  }
}

function collectNetworkInfo() {
  const connection = (navigator as Navigator & { connection?: Record<string, unknown> }).connection
  return {
    onLine: navigator.onLine,
    connection: connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    } : 'Not supported',
  }
}

function collectAuthState(user: User | null) {
  return {
    isLoggedIn: !!user,
    userId: user?.id || null,
    email: user?.email || null,
    lastSignInAt: user?.last_sign_in_at || null,
    createdAt: user?.created_at || null,
    appMetadata: user?.app_metadata || null,
    userMetadata: user?.user_metadata || null,
  }
}

export function summarizePracticeData(
  input: Pick<PracticeDebugLogInput, 'practiceOptions' | 'userProfile' | 'membershipIsPro'>,
  records: PracticeRecord[],
) {
  const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0)
  return {
    records: {
      totalCount: records.length,
      withPhotos: records.filter((record) => record.photos?.length > 0).length,
      withNotes: records.filter((record) => record.notes?.trim()).length,
      withBreakthrough: records.filter((record) => record.breakthrough).length,
      totalDuration,
      averageDuration: records.length > 0 ? Math.round(totalDuration / records.length) : 0,
      dateRange: records.length > 0 ? { earliest: records[records.length - 1]?.date, latest: records[0]?.date } : null,
      colorLevelDistribution: {
        level1: records.filter((record) => record.color_level === 1).length,
        level2: records.filter((record) => record.color_level === 2).length,
        level3: records.filter((record) => record.color_level === 3 || record.color_level === undefined).length,
        level4: records.filter((record) => record.color_level === 4).length,
      },
    },
    options: {
      totalCount: input.practiceOptions.length,
      customCount: input.practiceOptions.filter((option) => option.is_custom).length,
      systemCount: input.practiceOptions.filter((option) => !option.is_custom).length,
      list: input.practiceOptions.map((option) => ({
        id: option.id,
        label: option.label.substring(0, 50),
        hasNotes: !!option.notes,
        isCustom: option.is_custom,
        colorLevel: option.color_level ?? 3,
      })),
    },
    profile: {
      name: input.userProfile?.name || '未设置',
      hasSignature: !!input.userProfile?.signature,
      hasAvatar: !!input.userProfile?.avatar,
      isPro: input.membershipIsPro,
    },
  }
}

function summarizeAppState(input: PracticeDebugLogInput, records: PracticeRecord[]) {
  return summarizePracticeData(input, records)
}

function collectStorageState() {
  const allKeys = Object.keys(localStorage)
  const isAppKey = (key: string) => key.startsWith('ashtanga_') || key.includes('practice')
  return {
    totalKeys: allKeys.length,
    appKeys: allKeys.filter(isAppKey),
    otherKeys: allKeys.filter((key) => !isAppKey(key)).slice(0, 20),
    keyDetails: allKeys.filter(isAppKey).map((key) => {
      try {
        const value = localStorage.getItem(key)
        return {
          key,
          size: value ? new Blob([value]).size : 0,
          type: value?.startsWith('{') || value?.startsWith('[') ? 'json' : 'string',
        }
      } catch (error) {
        return { key, size: 0, type: 'error', error: String(error) }
      }
    }),
    estimatedTotalSize: new Blob(Object.values(localStorage)).size,
  }
}

function collectPerformanceInfo() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
  return {
    navigation: navigation ? {
      domComplete: Math.round(navigation.domComplete),
      loadEventEnd: Math.round(navigation.loadEventEnd),
      domInteractive: Math.round(navigation.domInteractive),
    } : 'Not available',
    memory: memory ? {
      usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
    } : 'Not available',
  }
}

function collectCurrentAppState(input: PracticeDebugLogInput) {
  return {
    activeTab: input.activeTab,
    isPracticing: false,
    showSettings: input.showSettings,
    showAccountSync: input.showAccountSync,
    showAuthModal: input.showAuthModal,
    authMode: input.authMode,
    showDataConflict: input.showDataConflict,
    showClearDataConfirm: input.showClearDataConfirm,
    clearDataStep: input.clearDataStep,
    currentPath: window.location.pathname,
    currentHash: window.location.hash,
    selectedOption: input.selectedOption,
    isPaused: input.isPaused,
    elapsedTime: input.elapsedTime,
    totalPausedTime: input.totalPausedTime,
    optionsStatus: {
      totalCount: input.practiceOptions.length,
      customCount: input.practiceOptions.filter((option) => option.is_custom).length,
      systemCount: input.practiceOptions.filter((option) => !option.is_custom).length,
      isFull: input.practiceOptions.filter((option) => option.id !== 'custom').length >= 8,
      canDelete: input.practiceOptions.filter((option) => option.id !== 'custom').length > 2,
      selectedOptionId: input.selectedOption,
      customPracticeName: input.customPracticeName || null,
    },
    modals: {
      showImportModal: input.showImportModal,
      showExportModal: input.showExportModal,
      showDebugLogModal: input.showDebugLogModal,
      showCompletion: input.showCompletion,
      showFakeDoor: input.showFakeDoor,
    },
    storage: {
      hasLocalData: input.practiceHistory.length > 0,
      localStorageKeysCount: Object.keys(localStorage).length,
      sessionStorageKeysCount: Object.keys(sessionStorage).length,
    },
  }
}

export function summarizeSyncLogs(rawLogs: unknown) {
  if (!Array.isArray(rawLogs)) return { entries: [], summary: {} }
  const triggers = rawLogs.filter((log) => log?.triggerReason && log.triggerReason !== '未知触发原因')
  return {
    entries: rawLogs,
    summary: {
      total: rawLogs.length,
      conflicts: rawLogs.filter((log) => log?.action?.includes('冲突') || log?.status === 'warning').length,
      uploadCount: rawLogs.filter((log) => log?.action?.includes('上传') || log?.action?.includes('仅本地')).length,
      downloadCount: rawLogs.filter((log) => log?.action?.includes('云端') || log?.action?.includes('下载')).length,
      lastTriggerReason: triggers[0]?.triggerReason || '未知',
      lastLocalCount: triggers[0]?.localCount,
      lastRemoteCount: triggers[0]?.remoteCount,
      lastSyncTime: rawLogs[0]?.timestamp,
    },
  }
}

function collectSyncLogs() {
  try {
    const storedLogs = localStorage.getItem('sync_logs')
    return storedLogs ? summarizeSyncLogs(JSON.parse(storedLogs)) : { entries: [], summary: {} }
  } catch (error) {
    return { entries: [{ action: '读取同步日志失败', error: String(error), timestamp: new Date().toISOString() }], summary: {} }
  }
}

async function collectPhotoLogs() {
  try {
    const { getPhotoLogs, getPhotoErrorLogs } = await import('@/lib/photo-logger')
    const all = getPhotoLogs()
    const errors = getPhotoErrorLogs()
    return { all: all.slice(0, 50), errors: errors.slice(0, 20), summary: { total: all.length, errors: errors.length } }
  } catch (error) {
    return { error: '读取照片日志失败', details: String(error) }
  }
}

async function collectMembershipLogs(input: PracticeDebugLogInput) {
  const logs: Record<string, unknown> = {
    source: 'local_only',
    localState: {
      membership: input.membership ? {
        is_active: input.membership.is_active,
        type: input.membership.type,
        expires_at: input.membership.expires_at,
        expires_at_formatted: input.membership.expires_at_formatted,
        days_remaining: input.membership.days_remaining,
      } : null,
      isPro: input.membershipIsPro,
      loading: input.membershipLoading,
    },
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      logs.hasSession = true
      logs.authUserId = input.user?.id || null
      logs.authEmail = input.user?.email || null
      await collectMembershipApiLogs(logs, session.access_token)
    } else {
      logs.hasSession = false
      logs.note = '用户未登录，无法查询后端会员状态'
    }
    logs.chantState = { enabled: input.chantEnabled, delay: input.chantDelaySeconds }
  } catch (error) {
    logs.error = `收集会员日志失败: ${toErrorMessage(error)}`
  }
  return logs
}

async function collectMembershipApiLogs(logs: Record<string, unknown>, token: string) {
  try {
    const response = await fetch('/api/membership/status', { headers: { Authorization: `Bearer ${token}` } })
    logs.apiStatus = response.status
    logs.apiResponse = await response.json()
  } catch (error) {
    logs.apiError = toErrorMessage(error)
  }

  try {
    const response = await fetch('/api/debug/membership', { headers: { Authorization: `Bearer ${token}` } })
    const result = await response.json()
    if (result.success && result.data) {
      const data = result.data
      logs.debugOverview = {
        envOk: data.env?.hasUrl && data.env?.hasKey,
        membershipCount: data.tables?.user_memberships?.count || 0,
        membershipRecords: data.tables?.user_memberships?.records || [],
        viewRecords: data.tables?.user_membership_status?.records || [],
        userSpecific: data.user_specific || null,
      }
    }
  } catch (error) {
    logs.debugApiError = toErrorMessage(error)
  }
}

async function collectColorSyncDiagnostics(user: User | null) {
  const diagnostics: Record<string, unknown> = {}
  try {
    const localOptions = readJsonStorage('ashtanga_options', [], '读取本地选项失败') as any[]
    diagnostics.localStorageOptions = localOptions.map((option) => ({
      id: option.id?.substring(0, 8), label: option.label, color_level: option.color_level, is_custom: option.is_custom,
    }))
    const localRecords = readJsonStorage('ashtanga_records', [], '读取本地记录失败') as any[]
    diagnostics.recentRecordColors = localRecords.slice(0, 10).map((record) => ({
      id: record.id?.substring(0, 8), date: record.date, type: record.type?.substring(0, 10),
      color_level: record.color_level, updated_at: record.updated_at,
    }))

    if (user?.id) await collectCloudColorDiagnostics(diagnostics, user.id)
    else diagnostics.cloudNote = '未登录，无法查询云端色阶数据'

    const rawLogs = readJsonStorage('sync_logs', [], '读取同步日志失败')
    if (Array.isArray(rawLogs)) {
      diagnostics.optionRelatedLogs = rawLogs
        .filter((log) => log?.action?.includes('选项') || log?.action?.includes('option'))
        .slice(0, 10)
    }
  } catch (error) {
    diagnostics.error = `收集色阶诊断失败: ${toErrorMessage(error)}`
  }
  return diagnostics
}

async function collectCloudColorDiagnostics(diagnostics: Record<string, unknown>, userId: string) {
  try {
    const { error } = await supabase.from('practice_options')
      .select('id, label, color_level, is_custom, user_id').eq('user_id', userId).limit(1)
    if (error) {
      diagnostics.cloudQueryError = `practice_options.color_level 列可能不存在: ${error.message}`
      diagnostics.cloudQueryErrorCode = error.code
    }
    const { data: cloudOptions } = await supabase.from('practice_options')
      .select('id, label, color_level, is_custom, user_id').eq('user_id', userId)
    diagnostics.cloudOptions = (cloudOptions || []).map((option) => ({
      id: option.id?.substring(0, 8), label: option.label, color_level: option.color_level, is_custom: option.is_custom,
    }))
    const { data: cloudRecords } = await supabase.from('practice_records')
      .select('id, date, type, color_level, updated_at').eq('user_id', userId)
      .is('deleted_at', null).order('date', { ascending: false }).limit(10)
    diagnostics.cloudRecordColors = (cloudRecords || []).map((record) => ({
      id: record.id?.substring(0, 8), date: record.date, type: record.type?.substring(0, 10),
      color_level: record.color_level, updated_at: record.updated_at,
    }))
  } catch (error) {
    diagnostics.cloudQueryError = toErrorMessage(error)
  }
}

function readJsonStorage(key: string, fallback: unknown, errorLabel: string) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    return [{ error: errorLabel, details: String(error) }]
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
