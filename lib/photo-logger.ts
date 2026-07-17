/**
 * 照片操作日志收集器
 * 用于收集照片上传、删除等操作日志，便于问题排查
 */

export interface PhotoLogEntry {
  id: string
  timestamp: string
  action: 'upload_start' | 'upload_stage' | 'upload_success' | 'upload_error' | 'delete_start' | 'delete_success' | 'delete_error' | 'query_start' | 'query_success' | 'query_error' | 'preview_open'
  attemptId?: string
  stage?: 'selected' | 'materialized' | 'presigned' | 'oss_put' | 'oss_verify' | 'metadata'
  outcome?: 'started' | 'success' | 'error'
  recordId?: string
  photoId?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  expectedSize?: number
  actualSize?: number | null
  httpStatus?: number | null
  requestId?: string | null
  diagnosisCode?: string
  error?: string
  errorCode?: string
  duration?: number // 操作耗时(ms)
  details?: Record<string, unknown> // 额外详情
}

const MAX_LOG_ENTRIES = 100 // 最多保留100条日志
const STORAGE_KEY = 'ashtanga_photo_logs'

/**
 * 添加照片操作日志
 */
export function addPhotoLog(entry: Omit<PhotoLogEntry, 'id' | 'timestamp'>): void {
  try {
    const logs = getPhotoLogs()
    const newEntry: PhotoLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    // 添加到开头，保持最新的在前面
    logs.unshift(newEntry)

    // 限制日志数量
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(MAX_LOG_ENTRIES)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    console.error('[PhotoLogger] 保存日志失败:', e)
  }
}

/**
 * 获取所有照片操作日志
 */
export function getPhotoLogs(): PhotoLogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[PhotoLogger] 读取日志失败:', e)
  }
  return []
}

/**
 * 清空照片操作日志
 */
export function clearPhotoLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('[PhotoLogger] 清空日志失败:', e)
  }
}

/**
 * 获取最近的N条日志
 */
export function getRecentPhotoLogs(count: number = 20): PhotoLogEntry[] {
  return getPhotoLogs().slice(0, count)
}

/**
 * 获取指定记录的照片日志
 */
export function getPhotoLogsByRecord(recordId: string): PhotoLogEntry[] {
  return getPhotoLogs().filter(log => log.recordId === recordId)
}

/**
 * 获取错误日志
 */
export function getPhotoErrorLogs(): PhotoLogEntry[] {
  return getPhotoLogs().filter(log =>
    log.action.endsWith('_error') || log.error
  )
}
