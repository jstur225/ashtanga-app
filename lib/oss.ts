/**
 * OSS 上传工具 - 阿里云 OSS 预签名 URL 上传
 * 替换原有的 Supabase Storage 实现
 */

import { supabase, type Photo } from './supabase'
import { addPhotoLog } from './photo-logger'
import { verifyOssObjectSize } from './oss-integrity'

const OSS_BUCKET = process.env.NEXT_PUBLIC_OSS_BUCKET || ''
const OSS_ENDPOINT = process.env.NEXT_PUBLIC_OSS_ENDPOINT || ''
const OSS_REGION = process.env.NEXT_PUBLIC_OSS_REGION || ''

// 文件大小限制：免费 5MB，Pro 30MB。
export const FREE_MAX_FILE_SIZE = 5 * 1024 * 1024
export const PRO_MAX_FILE_SIZE = 30 * 1024 * 1024
// 兼容旧测试/旧调用方：默认导出免费上限。
export const MAX_FILE_SIZE = FREE_MAX_FILE_SIZE

export function getPhotoFileSizeLimit(isPro = false) {
  return isPro ? PRO_MAX_FILE_SIZE : FREE_MAX_FILE_SIZE
}

export function formatFileSizeMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

export async function materializePhotoFile(file: File): Promise<File> {
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength <= 0 || bytes.byteLength !== file.size) {
    throw new Error(`FILE_SIZE_MISMATCH:${file.size}:${bytes.byteLength}`)
  }

  return new File([bytes], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  })
}

export const ERROR_MESSAGES: Record<string, string> = {
  'RECORD_PHOTO_LIMIT_EXCEEDED': '当前版本只能上传1张照片',
  'NOT_AUTHENTICATED': '请先登录后上传照片',
  'EMAIL_REQUIRED': '绑定邮箱后可使用照片功能',
  'UPLOAD_FAILED_403': '上传失败，请重试',
  'UPLOAD_FAILED_400': '上传失败，请检查文件',
  'UPLOAD_SOURCE_READ_FAILED': '照片读取失败，请重新选择后上传',
  'UPLOAD_INTEGRITY_FAILED': '照片上传不完整，请重新上传',
  'OSS_OBJECT_SIZE_MISMATCH': '照片上传不完整，请重新上传',
  'NETWORK_ERROR': '网络错误，请重试',
  'UNKNOWN_ERROR': '上传失败，请重试',
}

export interface PresignedUrlResponse {
  success: boolean
  data?: {
    presignedUrl: string
    ossKey: string
    ossUrl: string
    mimeType: string
    expiresAt: number
  }
  error?: string
}

export interface OssUploadDiagnostics {
  putStatus: number | null
  putDurationMs: number
  requestId: string | null
  expectedSize: number
  actualSize: number | null
  verificationReason?: string
  verificationStatus?: number
}

export interface PhotoMetadataDiagnostics {
  httpStatus: number | null
  serverError?: string
}

// 使用 supabase.ts 中定义的 Photo 类型
export type { Photo }

/**
 * 获取认证头
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

/**
 * 获取预签名 URL（用于上传）
 */
export async function getPresignedUrl(fileName: string, mimeType: string): Promise<PresignedUrlResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/oss-signature', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileName, mimeType }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('[OSS] 获取预签名 URL 失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
    }
  }
}

/**
 * 使用预签名 URL 上传文件到 OSS
 */
export async function uploadToOSS(
  file: File,
  presignedUrl: string,
  mimeType: string,
  ossUrl: string
): Promise<{
  success: boolean
  error?: string
  details?: string
  diagnostics: OssUploadDiagnostics
}> {
  const putStartedAt = Date.now()
  const diagnostics: OssUploadDiagnostics = {
    putStatus: null,
    putDurationMs: 0,
    requestId: null,
    expectedSize: file.size,
    actualSize: null,
  }

  try {
    console.log('[OSS Upload] 开始上传:', { fileName: file.name, mimeType, size: file.size })
    console.log('[OSS Upload] Presigned URL:', presignedUrl.slice(0, 80) + '...')

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
      },
    })

    diagnostics.putStatus = response.status
    diagnostics.putDurationMs = Date.now() - putStartedAt
    diagnostics.requestId = response.headers.get('x-oss-request-id')

    console.log('[OSS Upload] 响应状态:', response.status, response.statusText)
    console.log('[OSS Upload] 响应头:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      // 尝试读取 OSS 返回的错误详情
      const errorText = await response.text()
      console.error('[OSS Upload] 错误响应体:', errorText)
      return {
        success: false,
        error: `UPLOAD_FAILED_${response.status}`,
        details: errorText,
        diagnostics,
      }
    }

    const verification = await verifyOssObjectSize(ossUrl, file.size)
    diagnostics.actualSize = verification.actualSize
    diagnostics.verificationReason = verification.reason
    diagnostics.verificationStatus = verification.status
      ?? (verification.reason === 'HEAD_REQUEST_FAILED' ? undefined : 200)
    if (!verification.valid) {
      console.error('[OSS Upload] 对象完整性校验失败:', {
        fileName: file.name,
        expectedSize: file.size,
        actualSize: verification.actualSize,
        reason: verification.reason,
        status: verification.status,
      })
      return {
        success: false,
        error: 'UPLOAD_INTEGRITY_FAILED',
        details: JSON.stringify({
          expectedSize: file.size,
          actualSize: verification.actualSize,
          reason: verification.reason,
          status: verification.status,
        }),
        diagnostics,
      }
    }

    return { success: true, diagnostics }
  } catch (error) {
    diagnostics.putDurationMs = Date.now() - putStartedAt
    console.error('[OSS Upload] 请求异常:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
      details: String(error),
      diagnostics,
    }
  }
}

/**
 * 完整的上传流程：获取预签名 URL + 上传到 OSS + 保存元数据
 */
export async function uploadPhoto(
  file: File,
  recordId: string,
  options: { isPro?: boolean } = {}
): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  const startTime = Date.now()
  const attemptId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  const logDetails = {
    attemptId,
    recordId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  }

  addPhotoLog({
    action: 'upload_start',
    stage: 'selected',
    outcome: 'started',
    ...logDetails,
    expectedSize: file.size,
  })

  try {
    // 1. 验证文件
    const validation = validatePhotoFile(file, { isPro: options.isPro })
    if (!validation.valid) {
      addPhotoLog({
        action: 'upload_error',
        stage: 'selected',
        outcome: 'error',
        ...logDetails,
        error: validation.error,
        errorCode: 'VALIDATION_FAILED',
        duration: Date.now() - startTime,
      })
      return { success: false, error: validation.error }
    }

    // iOS WebKit 偶尔会在多步异步之后丢失 input File 的底层句柄。
    // 上传前先把字节读入一个新的 File，避免 PUT 实际发送 0 字节。
    let stableFile: File
    try {
      stableFile = await materializePhotoFile(file)
    } catch (error) {
      addPhotoLog({
        action: 'upload_error',
        stage: 'materialized',
        outcome: 'error',
        ...logDetails,
        expectedSize: file.size,
        actualSize: null,
        error: String(error),
        errorCode: 'UPLOAD_SOURCE_READ_FAILED',
        duration: Date.now() - startTime,
      })
      return { success: false, error: 'UPLOAD_SOURCE_READ_FAILED' }
    }

    addPhotoLog({
      action: 'upload_stage',
      stage: 'materialized',
      outcome: 'success',
      ...logDetails,
      expectedSize: file.size,
      actualSize: stableFile.size,
      duration: Date.now() - startTime,
    })

    // 2. 获取预签名 URL
    const fileExt = stableFile.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${random}.${fileExt}`

    const presignedResult = await getPresignedUrl(fileName, stableFile.type)
    if (!presignedResult.success) {
      addPhotoLog({
        action: 'upload_error',
        stage: 'presigned',
        outcome: 'error',
        ...logDetails,
        error: presignedResult.error,
        errorCode: 'PRESIGNED_URL_FAILED',
        duration: Date.now() - startTime,
      })
      return { success: false, error: presignedResult.error }
    }

    const { presignedUrl, ossKey, ossUrl, mimeType } = presignedResult.data!
    const objectKeySuffix = ossKey.split('/').slice(-2).join('/')
    addPhotoLog({
      action: 'upload_stage',
      stage: 'presigned',
      outcome: 'success',
      ...logDetails,
      expectedSize: stableFile.size,
      details: { objectKeySuffix, signedMimeType: mimeType },
      duration: Date.now() - startTime,
    })
    console.log('[uploadPhoto] 后端返回的 MIME 类型:', mimeType)
    console.log('[uploadPhoto] 前端文件的 MIME 类型:', stableFile.type)

    // 3. 上传到 OSS（使用后端返回的 MIME 类型确保签名匹配）
    const uploadResult = await uploadToOSS(stableFile, presignedUrl, mimeType, ossUrl)
    const putSucceeded = uploadResult.diagnostics.putStatus !== null
      && uploadResult.diagnostics.putStatus >= 200
      && uploadResult.diagnostics.putStatus < 300

    addPhotoLog({
      action: 'upload_stage',
      stage: 'oss_put',
      outcome: putSucceeded ? 'success' : 'error',
      ...logDetails,
      expectedSize: stableFile.size,
      httpStatus: uploadResult.diagnostics.putStatus,
      requestId: uploadResult.diagnostics.requestId,
      errorCode: putSucceeded ? undefined : uploadResult.error,
      duration: uploadResult.diagnostics.putDurationMs,
    })

    if (putSucceeded) {
      addPhotoLog({
        action: 'upload_stage',
        stage: 'oss_verify',
        outcome: uploadResult.success ? 'success' : 'error',
        ...logDetails,
        expectedSize: uploadResult.diagnostics.expectedSize,
        actualSize: uploadResult.diagnostics.actualSize,
        httpStatus: uploadResult.diagnostics.verificationStatus ?? null,
        diagnosisCode: uploadResult.success ? 'OSS_OBJECT_SIZE_VERIFIED' : 'OSS_OBJECT_SIZE_MISMATCH',
        errorCode: uploadResult.success ? undefined : uploadResult.error,
        details: {
          verificationReason: uploadResult.diagnostics.verificationReason,
          objectKeySuffix,
        },
        duration: Date.now() - startTime,
      })
    }

    if (!uploadResult.success) {
      console.error('[uploadPhoto] 上传失败:', uploadResult.error, uploadResult.details)
      addPhotoLog({
        action: 'upload_error',
        stage: putSucceeded ? 'oss_verify' : 'oss_put',
        outcome: 'error',
        ...logDetails,
        expectedSize: uploadResult.diagnostics.expectedSize,
        actualSize: uploadResult.diagnostics.actualSize,
        httpStatus: putSucceeded
          ? uploadResult.diagnostics.verificationStatus ?? null
          : uploadResult.diagnostics.putStatus,
        requestId: uploadResult.diagnostics.requestId,
        diagnosisCode: putSucceeded ? 'OSS_OBJECT_SIZE_MISMATCH' : 'OSS_PUT_FAILED',
        error: uploadResult.error,
        errorCode: uploadResult.error,
        details: {
          ossErrorDetails: uploadResult.details,
          verificationReason: uploadResult.diagnostics.verificationReason,
          objectKeySuffix,
        },
        duration: Date.now() - startTime,
      })
      return { success: false, error: uploadResult.error }
    }

    // 4. 保存元数据到数据库
    const metadataResult = await savePhotoMetadata({
      practice_record_id: recordId,
      oss_url: ossUrl,
      oss_key: ossKey,
      file_size: stableFile.size,
      mime_type: stableFile.type,
    })

    if (!metadataResult.success) {
      addPhotoLog({
        action: 'upload_error',
        stage: 'metadata',
        outcome: 'error',
        ...logDetails,
        expectedSize: stableFile.size,
        actualSize: uploadResult.diagnostics.actualSize,
        httpStatus: metadataResult.diagnostics.httpStatus,
        diagnosisCode: metadataResult.error === 'OSS_OBJECT_SIZE_MISMATCH'
          ? 'SERVER_OSS_OBJECT_SIZE_MISMATCH'
          : 'METADATA_SAVE_FAILED',
        error: metadataResult.error,
        errorCode: 'METADATA_SAVE_FAILED',
        details: {
          serverError: metadataResult.diagnostics.serverError,
          objectKeySuffix,
        },
        duration: Date.now() - startTime,
      })
      return { success: false, error: metadataResult.error }
    }

    addPhotoLog({
      action: 'upload_stage',
      stage: 'metadata',
      outcome: 'success',
      ...logDetails,
      expectedSize: stableFile.size,
      actualSize: uploadResult.diagnostics.actualSize,
      httpStatus: metadataResult.diagnostics.httpStatus,
      details: { objectKeySuffix },
      duration: Date.now() - startTime,
    })

    // 记录成功日志
    addPhotoLog({
      action: 'upload_success',
      stage: 'metadata',
      outcome: 'success',
      ...logDetails,
      photoId: metadataResult.photo?.id,
      expectedSize: stableFile.size,
      actualSize: uploadResult.diagnostics.actualSize,
      httpStatus: metadataResult.diagnostics.httpStatus,
      diagnosisCode: 'UPLOAD_VERIFIED',
      details: { objectKeySuffix },
      duration: Date.now() - startTime,
    })

    return {
      success: true,
      photo: metadataResult.photo,
    }
  } catch (error) {
    console.error('[OSS] 上传流程失败:', error)
    addPhotoLog({
      action: 'upload_error',
      outcome: 'error',
      ...logDetails,
      error: String(error),
      errorCode: 'UNKNOWN_ERROR',
      duration: Date.now() - startTime,
    })
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
    }
  }
}

/**
 * 保存照片元数据到数据库
 */
export async function savePhotoMetadata(data: {
  practice_record_id: string
  oss_url: string
  oss_key: string
  file_size: number
  mime_type: string
}): Promise<{
  success: boolean
  photo?: Photo
  error?: string
  diagnostics: PhotoMetadataDiagnostics
}> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/photos', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    const result = await response.json()
    const diagnostics: PhotoMetadataDiagnostics = {
      httpStatus: response.status ?? null,
      serverError: result.error,
    }
    // API 返回 { success: true, data: photo }
    if (result.success && result.data) {
      return { success: true, photo: result.data, diagnostics }
    }
    return {
      success: false,
      error: result.error || `HTTP_${response.status}`,
      diagnostics,
    }
  } catch (error) {
    console.error('[OSS] 保存元数据失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
      diagnostics: {
        httpStatus: null,
        serverError: String(error),
      },
    }
  }
}

/**
 * 获取练习记录的照片
 */
export async function getRecordPhotos(recordId: string): Promise<{
  success: boolean
  photos?: Photo[]
  error?: string
}> {
  const startTime = Date.now()

  try {
    addPhotoLog({
      action: 'query_start',
      recordId,
    })

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/practice-records/${recordId}/photos`, {
      method: 'GET',
      headers,
    })

    const result = await response.json()
    // API 返回 { success: true, data: { photos: [...] } }
    // 转换为 { success: true, photos: [...] }

    if (result.success) {
      addPhotoLog({
        action: 'query_success',
        recordId,
        details: { photoCount: result.data?.photos?.length || 0 },
        duration: Date.now() - startTime,
      })
    } else {
      addPhotoLog({
        action: 'query_error',
        recordId,
        error: result.error,
        errorCode: result.error,
        duration: Date.now() - startTime,
      })
    }

    return {
      success: result.success,
      photos: result.data?.photos,
      error: result.error,
    }
  } catch (error) {
    console.error('[OSS] 获取照片失败:', error)
    addPhotoLog({
      action: 'query_error',
      recordId,
      error: String(error),
      errorCode: 'NETWORK_ERROR',
      duration: Date.now() - startTime,
    })
    return {
      success: false,
      error: 'NETWORK_ERROR',
    }
  }
}

/**
 * 软删除照片
 * 支持两种方式：
 * 1. 通过 photoId 直接删除
 * 2. 本地生成的 ID（photo-${index}）：通过 practice_record_id 和 oss_url 查找真实 ID 后删除
 */
export async function deletePhoto(
  photoId: string,
  practiceRecordId?: string,
  ossUrl?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const startTime = Date.now()
  const logDetails = {
    photoId,
    recordId: practiceRecordId,
  }

  try {
    addPhotoLog({
      action: 'delete_start',
      ...logDetails,
    })

    const headers = await getAuthHeaders()
    let realPhotoId = photoId

    // 如果是本地生成的 ID，先查询数据库找到真实 ID
    if (photoId.startsWith('photo-') && practiceRecordId && ossUrl) {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const userId = session?.user?.id
      if (!token || !userId) {
        addPhotoLog({
          action: 'delete_error',
          ...logDetails,
          error: 'NOT_AUTHENTICATED',
          errorCode: 'NOT_AUTHENTICATED',
          duration: Date.now() - startTime,
        })
        return { success: false, error: 'NOT_AUTHENTICATED' }
      }

      // 通过 Supabase REST API 查询
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/photos?select=id&practice_record_id=eq.${practiceRecordId}&user_id=eq.${userId}&oss_url=eq.${encodeURIComponent(ossUrl)}&deleted_at=is.null`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        console.error('[Delete Photo] 查询照片失败:', await response.text())
        addPhotoLog({
          action: 'delete_error',
          ...logDetails,
          error: 'PHOTO_NOT_FOUND',
          errorCode: 'QUERY_FAILED',
          duration: Date.now() - startTime,
        })
        return { success: false, error: 'PHOTO_NOT_FOUND' }
      }

      const photos = await response.json()
      if (!photos || photos.length === 0) {
        addPhotoLog({
          action: 'delete_error',
          ...logDetails,
          error: 'PHOTO_NOT_FOUND',
          errorCode: 'PHOTO_NOT_FOUND',
          duration: Date.now() - startTime,
        })
        return { success: false, error: 'PHOTO_NOT_FOUND' }
      }

      realPhotoId = photos[0].id
    }

    // 使用真实 ID 软删除
    const response = await fetch(`/api/photos/${realPhotoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    })

    const result = await response.json()

    if (result.success) {
      addPhotoLog({
        action: 'delete_success',
        ...logDetails,
        duration: Date.now() - startTime,
      })
    } else {
      addPhotoLog({
        action: 'delete_error',
        ...logDetails,
        error: result.error,
        errorCode: result.error,
        duration: Date.now() - startTime,
      })
    }

    return result
  } catch (error) {
    console.error('[OSS] 删除照片失败:', error)
    addPhotoLog({
      action: 'delete_error',
      ...logDetails,
      error: String(error),
      errorCode: 'NETWORK_ERROR',
      duration: Date.now() - startTime,
    })
    return {
      success: false,
      error: 'NETWORK_ERROR',
    }
  }
}

/**
 * 验证文件是否符合要求
 */
export function validatePhotoFile(
  file: File,
  options: { isPro?: boolean } = {}
): { valid: boolean; error?: string } {
  console.log('[validatePhotoFile] 检查文件:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`)

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    console.error('[validatePhotoFile] ❌ 不是图片')
    return { valid: false, error: '只能上传图片文件（jpg, png, webp等）' }
  }

  if (file.size <= 0) {
    console.error('[validatePhotoFile] ❌ 文件为空')
    return { valid: false, error: '照片文件为空，请重新选择' }
  }

  // 检查文件大小
  const maxFileSize = getPhotoFileSizeLimit(options.isPro)
  const maxSizeMB = options.isPro ? 30 : 5
  if (file.size > maxFileSize) {
    const sizeMB = formatFileSizeMB(file.size)
    console.error('[validatePhotoFile] ❌ 文件太大:', sizeMB, 'MB')
    return {
      valid: false,
      error: options.isPro
        ? `照片超过 ${maxSizeMB}MB（当前 ${sizeMB}MB），请换一张更小的照片`
        : `照片超过 ${maxSizeMB}MB（当前 ${sizeMB}MB），免费版单张照片上限为 5MB`,
    }
  }

  console.log('[validatePhotoFile] ✅ 验证通过')
  return { valid: true }
}
