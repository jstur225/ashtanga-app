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
  isPracticing: boolean
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

type ConnectionProbeStatus = 'success' | 'http_error' | 'network_error' | 'timeout' | 'not_configured'

interface ConnectionProbeResult {
  target: string
  url: string | null
  status: ConnectionProbeStatus
  reachable: boolean | null
  httpStatus: number | null
  latency: number
  errorName: string | null
  error: string | null
}

type ConnectionProbeFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const CONNECTION_PROBE_TIMEOUT_MS = 5000
const RECENT_AUTH_FAILURE_WINDOW_MS = 30 * 60 * 1000

export async function collectPracticeDebugLog(input: PracticeDebugLogInput) {
  const nonDraftRecords = input.practiceHistory.filter((record) => record.type !== '草稿')
  const runtimeDiagnostics = readJsonStorage('ashtanga_runtime_diagnostics', [], '读取启动诊断失败')
  const [
    connection,
    connectionProbes,
    serviceWorkerStatus,
    photoLogs,
    photoHealth,
    membershipLogs,
    colorSyncDiag,
  ] = await Promise.all([
    withDiagnosticTimeout('Supabase 连接测试', testSupabaseConnection(), {
      testStatus: 'timeout',
      latency: -1,
      error: 'Supabase 连接测试超过 5 秒',
      errorName: 'TimeoutError',
      errorCode: null,
      httpStatus: null,
      statusText: null,
      details: null,
      hint: null,
    }),
    withDiagnosticTimeout('连接端点探测', collectConnectionProbes(), {
      sameOrigin: timeoutProbe('本站源站'),
      supabaseAuth: timeoutProbe('Supabase Auth'),
    }, 7000),
    withDiagnosticTimeout('Service Worker 状态', collectServiceWorkerStatus(), {
      supported: 'unknown',
      error: 'Service Worker 状态收集超过 5 秒',
    }),
    withDiagnosticTimeout('照片日志', collectPhotoLogs(), {
      error: '照片日志收集超过 5 秒',
      details: 'timeout',
    }),
    withDiagnosticTimeout('照片健康检查', collectPhotoHealthDiagnostics(input.practiceHistory), {
      summary: {
        primaryDiagnosis: 'PHOTO_HEALTH_CHECK_TIMEOUT',
        checked: 0,
        healthy: 0,
        zeroByte: 0,
        missing: 0,
        accessDenied: 0,
        loadFailedWithHealthyObject: 0,
        otherErrors: 0,
      },
      objects: [],
    }, 10000),
    withDiagnosticTimeout('会员日志', collectMembershipLogs(input), {
      error: '会员日志收集超过 5 秒',
    }),
    withDiagnosticTimeout('色阶同步诊断', collectColorSyncDiagnostics(input.user), {
      error: '色阶同步诊断超过 5 秒',
    }),
  ])

  const connectionDiagnostics = buildConnectionDiagnostics({
    probes: connectionProbes,
    supabaseData: connection,
    serviceWorkerStatus,
    runtimeDiagnostics,
  })

  return {
    _meta: {
      version: '2.7',
      exportTime: new Date().toISOString(),
      description: '熬汤日记调试日志 - 用于问题排查',
      gitVersion: getVersionInfo(),
    },
    serviceWorkerStatus,
    environment: collectEnvironment(),
    networkInfo: collectNetworkInfo(),
    connectionDiagnostics,
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
    runtimeDiagnostics,
    startupSession: readJsonStorage('ashtanga_runtime_session', null, '读取启动会话失败'),
    performanceInfo: collectPerformanceInfo(),
    currentAppState: collectCurrentAppState(input),
    syncLogs: collectSyncLogs(),
    photoLogs,
    photoHealth,
    membershipLogs,
    colorSyncDiag,
  }
}

function timeoutProbe(target: string): ConnectionProbeResult {
  return {
    target,
    url: null,
    status: 'timeout',
    reachable: false,
    httpStatus: null,
    latency: -1,
    errorName: 'TimeoutError',
    error: `${target}探测超过 7 秒`,
  }
}

async function collectConnectionProbes(fetcher: ConnectionProbeFetcher = fetch) {
  const cacheBuster = `ashtanga_diag=${Date.now()}`
  const sameOriginUrl = new URL(`/sw.js?${cacheBuster}`, window.location.origin).toString()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const sameOriginProbe = runConnectionProbe('本站源站', sameOriginUrl, fetcher)
  const supabaseAuthProbe = supabaseUrl
    ? runConnectionProbe('Supabase Auth', `${supabaseUrl}/auth/v1/health?${cacheBuster}`, fetcher, {
        headers: supabaseKey ? { apikey: supabaseKey } : undefined,
      })
    : Promise.resolve({
        target: 'Supabase Auth',
        url: null,
        status: 'not_configured' as const,
        reachable: null,
        httpStatus: null,
        latency: -1,
        errorName: null,
        error: 'NEXT_PUBLIC_SUPABASE_URL 未配置',
      })

  const [sameOrigin, supabaseAuth] = await Promise.all([sameOriginProbe, supabaseAuthProbe])

  return { sameOrigin, supabaseAuth }
}

async function runConnectionProbe(
  target: string,
  url: string,
  fetcher: ConnectionProbeFetcher,
  init: RequestInit = {},
): Promise<ConnectionProbeResult> {
  const controller = new AbortController()
  let timedOut = false
  const startedAt = Date.now()
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, CONNECTION_PROBE_TIMEOUT_MS)

  try {
    const response = await fetcher(url, {
      ...init,
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    return {
      target,
      url,
      status: response.ok ? 'success' : 'http_error',
      reachable: true,
      httpStatus: response.status,
      latency: Date.now() - startedAt,
      errorName: null,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      target,
      url,
      status: timedOut ? 'timeout' : 'network_error',
      reachable: false,
      httpStatus: null,
      latency: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : null,
      error: toErrorMessage(error),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

function buildConnectionDiagnostics({
  probes,
  supabaseData,
  serviceWorkerStatus,
  runtimeDiagnostics,
}: {
  probes: { sameOrigin: ConnectionProbeResult; supabaseAuth: ConnectionProbeResult }
  supabaseData: { testStatus: string; latency: number; error: string | null }
  serviceWorkerStatus: Record<string, unknown>
  runtimeDiagnostics: unknown
}) {
  const recentAuthAttempts = Array.isArray(runtimeDiagnostics)
    ? runtimeDiagnostics.filter((entry) => (
        typeof entry?.type === 'string' && entry.type.startsWith('auth_sign_in_')
      )).slice(0, 20)
    : []
  const hasRecentNetworkFailure = hasRecentAuthNetworkFailure(recentAuthAttempts)
  const diagnosis = deriveConnectionDiagnosis({
    online: navigator.onLine,
    sameOriginReachable: probes.sameOrigin.reachable,
    sameOriginStatus: probes.sameOrigin.status,
    supabaseAuthReachable: probes.supabaseAuth.reachable,
    supabaseAuthStatus: probes.supabaseAuth.status,
    supabaseDataStatus: supabaseData.testStatus,
    hasRecentNetworkFailure,
  })

  return {
    collectedAt: new Date().toISOString(),
    diagnosis,
    browserState: {
      online: navigator.onLine,
      visibilityState: document.visibilityState,
      displayMode: typeof window.matchMedia === 'function'
        && window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
      pageOrigin: window.location.origin,
      path: window.location.pathname,
    },
    probes: {
      sameOrigin: probes.sameOrigin,
      supabaseAuth: probes.supabaseAuth,
      supabaseData,
    },
    pwa: {
      serviceWorkerSupported: serviceWorkerStatus.supported ?? null,
      controlledByServiceWorker: serviceWorkerStatus.controller ?? null,
      controllerState: serviceWorkerStatus.state ?? null,
      controllerScript: serviceWorkerStatus.scope ?? null,
      registrations: serviceWorkerStatus.registrations ?? null,
      caches: serviceWorkerStatus.caches ?? null,
    },
    recentAuthAttempts,
    recentAuthFailureWindowMinutes: RECENT_AUTH_FAILURE_WINDOW_MS / 60000,
  }
}

export function hasRecentAuthNetworkFailure(runtimeDiagnostics: unknown, now = Date.now()) {
  if (!Array.isArray(runtimeDiagnostics)) return false

  const latestCompletedAttempt = runtimeDiagnostics.find((entry) => (
    entry?.type === 'auth_sign_in_failed' || entry?.type === 'auth_sign_in_succeeded'
  ))
  if (latestCompletedAttempt?.type !== 'auth_sign_in_failed'
    || latestCompletedAttempt?.details?.networkError !== true) return false

  const failedAt = Date.parse(latestCompletedAttempt.timestamp)
  const ageMs = now - failedAt
  return Number.isFinite(failedAt) && ageMs >= 0 && ageMs <= RECENT_AUTH_FAILURE_WINDOW_MS
}

export function deriveConnectionDiagnosis({
  online,
  sameOriginReachable,
  sameOriginStatus,
  supabaseAuthReachable,
  supabaseAuthStatus,
  supabaseDataStatus,
  hasRecentNetworkFailure,
}: {
  online: boolean
  sameOriginReachable: boolean | null
  sameOriginStatus: ConnectionProbeStatus
  supabaseAuthReachable: boolean | null
  supabaseAuthStatus: ConnectionProbeStatus
  supabaseDataStatus: string
  hasRecentNetworkFailure: boolean
}) {
  if (!online) return { code: 'BROWSER_OFFLINE', message: '浏览器报告当前处于离线状态' }
  if (sameOriginStatus === 'http_error') {
    return { code: 'SAME_ORIGIN_HTTP_ERROR', message: '本站源站可以建立连接，但实时资源返回了 HTTP 错误' }
  }
  if (supabaseAuthStatus === 'http_error') {
    return { code: 'SUPABASE_AUTH_HTTP_ERROR', message: 'Supabase 登录服务可以建立连接，但健康检查返回了 HTTP 错误' }
  }
  if (sameOriginReachable === false && supabaseAuthReachable === false) {
    return { code: 'GENERAL_NETWORK_OR_WEBVIEW_FAILURE', message: '本站源站与登录服务均无法连接，优先排查设备网络或 WebView/PWA 网络进程' }
  }
  if (sameOriginReachable === true && supabaseAuthReachable === false) {
    return { code: 'SUPABASE_AUTH_UNREACHABLE', message: '本站可连接，但 Supabase 登录服务不可达，属于单域名、DNS、代理或跨域链路问题' }
  }
  if (sameOriginReachable === false && supabaseAuthReachable === true) {
    return { code: 'SAME_ORIGIN_UNREACHABLE', message: '登录服务可连接，但本站实时源站不可达；PWA 可能正在使用缓存页面' }
  }
  if (supabaseAuthReachable === true && supabaseDataStatus !== 'success') {
    return { code: 'SUPABASE_DATA_API_FAILURE', message: 'Supabase Auth 可连接，但数据接口探测失败' }
  }
  if (sameOriginStatus === 'success' && supabaseAuthStatus === 'success' && supabaseDataStatus === 'success') {
    return hasRecentNetworkFailure
      ? { code: 'RECOVERED_TRANSIENT_NETWORK_FAILURE', message: '当前连接已恢复，但日志记录到最近一次登录网络失败' }
      : { code: 'ALL_CONNECTIONS_HEALTHY', message: '本站、登录服务与数据接口当前均可连接' }
  }
  if (supabaseAuthReachable === null) {
    return { code: 'SUPABASE_CONFIGURATION_UNAVAILABLE', message: '当前构建未提供 Supabase 公共地址，无法完成 Auth 端点探测' }
  }
  return { code: 'PARTIAL_OR_UNKNOWN_CONNECTIVITY', message: '连接探测结果不完整，请结合各端点状态和最近登录记录判断' }
}

async function testSupabaseConnection() {
  try {
    const startedAt = Date.now()
    const { error, status, statusText } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    const latency = Date.now() - startedAt
    return error
      ? {
          testStatus: 'error',
          latency,
          error: error.message,
          errorName: 'PostgrestError',
          errorCode: error.code || null,
          httpStatus: typeof status === 'number' ? status : null,
          statusText: statusText || null,
          details: error.details || null,
          hint: error.hint || null,
        }
      : {
          testStatus: 'success',
          latency,
          error: null,
          errorName: null,
          errorCode: null,
          httpStatus: typeof status === 'number' ? status : null,
          statusText: statusText || null,
          details: null,
          hint: null,
        }
  } catch (error) {
    const connectionError = error as { name?: string; code?: string; status?: number; details?: string; hint?: string }
    return {
      testStatus: 'exception',
      latency: -1,
      error: toErrorMessage(error),
      errorName: connectionError?.name || null,
      errorCode: connectionError?.code || null,
      httpStatus: connectionError?.status || null,
      statusText: null,
      details: connectionError?.details || null,
      hint: connectionError?.hint || null,
    }
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
      activeScript: registration.active?.scriptURL || null,
      installing: !!registration.installing,
      installingScript: registration.installing?.scriptURL || null,
      waiting: !!registration.waiting,
      waitingScript: registration.waiting?.scriptURL || null,
      updateViaCache: registration.updateViaCache,
    }))
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      status.caches = await Promise.all(cacheNames.map(async (name) => ({
        name,
        entryCount: (await caches.open(name).then((cache) => cache.keys())).length,
      })))
    }
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
      type: navigation.type,
      duration: Math.round(navigation.duration),
      responseStart: Math.round(navigation.responseStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
      domComplete: Math.round(navigation.domComplete),
      loadEventEnd: Math.round(navigation.loadEventEnd),
      domInteractive: Math.round(navigation.domInteractive),
      transferSize: navigation.transferSize,
      encodedBodySize: navigation.encodedBodySize,
      decodedBodySize: navigation.decodedBodySize,
    } : 'Not available',
    resourceSummary: {
      count: performance.getEntriesByType('resource').length,
      slowest: (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map((entry) => ({
          name: entry.name.slice(0, 300),
          type: entry.initiatorType,
          duration: Math.round(entry.duration),
          transferSize: entry.transferSize,
        })),
    },
    memory: memory ? {
      usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
    } : 'Not available',
  }
}

function collectCurrentAppState(input: PracticeDebugLogInput) {
  return {
    activeTab: input.activeTab,
    isPracticing: input.isPracticing,
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
    const uploadErrors = all.filter((log) => log.action === 'upload_error')
    const uploadSuccesses = all.filter((log) => log.action === 'upload_success')
    const uploadAttempts = new Set(all.map((log) => log.attemptId).filter(Boolean))
    const errorsByCode = uploadErrors.reduce<Record<string, number>>((summary, log) => {
      const code = log.diagnosisCode || log.errorCode || 'UNKNOWN_UPLOAD_ERROR'
      summary[code] = (summary[code] || 0) + 1
      return summary
    }, {})
    const stageErrors = all
      .filter((log) => log.action === 'upload_stage' && log.outcome === 'error')
      .reduce<Record<string, number>>((summary, log) => {
        const stage = log.stage || 'unknown'
        summary[stage] = (summary[stage] || 0) + 1
        return summary
      }, {})
    const latestUploadError = uploadErrors[0]

    return {
      all: all.slice(0, 50),
      errors: errors.slice(0, 20),
      summary: {
        total: all.length,
        errors: errors.length,
        uploadAttempts: uploadAttempts.size,
        uploadSuccesses: uploadSuccesses.length,
        uploadFailures: uploadErrors.length,
        errorsByCode,
        stageErrors,
        primaryUploadDiagnosis: latestUploadError?.diagnosisCode
          || latestUploadError?.errorCode
          || (uploadSuccesses.length > 0 ? 'RECENT_UPLOADS_VERIFIED' : 'NO_RECENT_UPLOAD_ATTEMPT'),
      },
    }
  } catch (error) {
    return { error: '读取照片日志失败', details: String(error) }
  }
}

type PhotoHeadFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'headers'>>

type PhotoObjectCandidate = {
  recordId: string
  recordDate: string
  url: string
}

const PHOTO_HEALTH_LIMIT = 12
const PHOTO_HEALTH_CONCURRENCY = 4
const PHOTO_HEAD_TIMEOUT_MS = 3000

export async function collectPhotoHealthDiagnostics(
  practiceHistory: PracticeRecord[],
  fetcher: PhotoHeadFetcher = fetch,
) {
  const runtimeDiagnostics = readJsonStorage('ashtanga_runtime_diagnostics', [], '读取启动诊断失败')
  const resourceErrorCounts = Array.isArray(runtimeDiagnostics)
    ? runtimeDiagnostics.reduce<Record<string, number>>((counts, entry) => {
        const url = entry?.type === 'resource_error' && typeof entry?.details?.url === 'string'
          ? entry.details.url
          : null
        if (url) counts[url] = (counts[url] || 0) + 1
        return counts
      }, {})
    : {}

  const seen = new Set<string>()
  const candidates: PhotoObjectCandidate[] = []
  const recordsByRecency = [...practiceHistory].sort((left, right) =>
    String(right.date || '').localeCompare(String(left.date || ''))
  )

  for (const record of recordsByRecency) {
    for (const url of Array.isArray(record.photos) ? record.photos : []) {
      if (typeof url !== 'string' || !url.startsWith('https://') || seen.has(url)) continue
      seen.add(url)
      candidates.push({ recordId: record.id, recordDate: record.date, url })
      if (candidates.length >= PHOTO_HEALTH_LIMIT) break
    }
    if (candidates.length >= PHOTO_HEALTH_LIMIT) break
  }

  if (candidates.length === 0) {
    return {
      summary: {
        primaryDiagnosis: 'NO_RECENT_PHOTOS',
        checked: 0,
        healthy: 0,
        zeroByte: 0,
        missing: 0,
        accessDenied: 0,
        loadFailedWithHealthyObject: 0,
        otherErrors: 0,
      },
      objects: [],
    }
  }

  const objects = await mapWithConcurrency(
    candidates,
    PHOTO_HEALTH_CONCURRENCY,
    async (candidate) => checkPhotoObject(candidate, resourceErrorCounts[candidate.url] || 0, fetcher),
  )

  const count = (diagnosis: string) => objects.filter((item) => item.diagnosis === diagnosis).length
  const zeroByte = count('OSS_ZERO_BYTE_OBJECT')
  const missing = count('OSS_OBJECT_MISSING')
  const accessDenied = count('OSS_ACCESS_DENIED')
  const loadFailedWithHealthyObject = count('IMAGE_LOAD_FAILED_WITH_HEALTHY_OBJECT')
  const healthy = count('OSS_OBJECT_HEALTHY')
  const otherErrors = objects.length - zeroByte - missing - accessDenied - loadFailedWithHealthyObject - healthy

  const primaryDiagnosis = zeroByte > 0
    ? 'OSS_ZERO_BYTE_OBJECT'
    : missing > 0
      ? 'OSS_OBJECT_MISSING'
      : accessDenied > 0
        ? 'OSS_ACCESS_DENIED'
        : loadFailedWithHealthyObject > 0
          ? 'IMAGE_LOAD_FAILED_WITH_HEALTHY_OBJECT'
          : otherErrors > 0
            ? 'OSS_HEALTH_CHECK_FAILED'
            : 'ALL_CHECKED_PHOTOS_HEALTHY'

  return {
    summary: {
      primaryDiagnosis,
      checked: objects.length,
      healthy,
      zeroByte,
      missing,
      accessDenied,
      loadFailedWithHealthyObject,
      otherErrors,
    },
    objects,
  }
}

async function checkPhotoObject(
  candidate: PhotoObjectCandidate,
  resourceErrorCount: number,
  fetcher: PhotoHeadFetcher,
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PHOTO_HEAD_TIMEOUT_MS)
  const startedAt = Date.now()

  try {
    const response = await fetcher(candidate.url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    const rawContentLength = response.headers.get('content-length')
    const parsedContentLength = rawContentLength === null ? NaN : Number(rawContentLength)
    const contentLength = Number.isSafeInteger(parsedContentLength) && parsedContentLength >= 0
      ? parsedContentLength
      : null
    const contentType = response.headers.get('content-type')

    let diagnosis = 'OSS_OBJECT_HEALTHY'
    if (!response.ok) {
      diagnosis = response.status === 403
        ? 'OSS_ACCESS_DENIED'
        : response.status === 404
          ? 'OSS_OBJECT_MISSING'
          : `OSS_HTTP_${response.status}`
    } else if (contentLength === 0) {
      diagnosis = 'OSS_ZERO_BYTE_OBJECT'
    } else if (contentLength === null) {
      diagnosis = 'OSS_INVALID_CONTENT_LENGTH'
    } else if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      diagnosis = 'OSS_INVALID_CONTENT_TYPE'
    } else if (resourceErrorCount > 0) {
      diagnosis = 'IMAGE_LOAD_FAILED_WITH_HEALTHY_OBJECT'
    }

    return {
      ...candidate,
      diagnosis,
      httpStatus: response.status,
      contentLength,
      contentType,
      etag: response.headers.get('etag'),
      resourceErrorCount,
      durationMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      ...candidate,
      diagnosis: error instanceof Error && error.name === 'AbortError'
        ? 'OSS_HEAD_TIMEOUT'
        : 'OSS_HEAD_NETWORK_OR_CORS_ERROR',
      httpStatus: null,
      contentLength: null,
      contentType: null,
      etag: null,
      resourceErrorCount,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(error),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workerCount = Math.min(concurrency, items.length)

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }))

  return results
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

export async function withDiagnosticTimeout<T extends Record<string, unknown>>(
  label: string,
  task: Promise<T>,
  fallback: T,
  timeoutMs = 5000,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve({
          ...fallback,
          diagnosticTimeout: label,
        }), timeoutMs)
      }),
    ])
  } catch (error) {
    return {
      ...fallback,
      diagnosticError: `${label}: ${toErrorMessage(error)}`,
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
