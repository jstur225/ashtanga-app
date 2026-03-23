/**
 * OSS 上传工具 - 阿里云 OSS 预签名 URL 上传
 * 替换原有的 Supabase Storage 实现
 */

import { supabase, type Photo } from './supabase'

const OSS_BUCKET = process.env.NEXT_PUBLIC_OSS_BUCKET || ''
const OSS_ENDPOINT = process.env.NEXT_PUBLIC_OSS_ENDPOINT || ''
const OSS_REGION = process.env.NEXT_PUBLIC_OSS_REGION || ''

// 文件大小限制（10MB）
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

export const ERROR_MESSAGES: Record<string, string> = {
  'RECORD_PHOTO_LIMIT_EXCEEDED': '当前版本只能上传1张照片',
  'NOT_AUTHENTICATED': '上传照片需绑定邮箱',
  'UPLOAD_FAILED_403': '上传失败，请重试',
  'UPLOAD_FAILED_400': '上传失败，请检查文件',
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
  mimeType: string
): Promise<{ success: boolean; error?: string; details?: string }> {
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
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[OSS Upload] 请求异常:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
      details: String(error),
    }
  }
}

/**
 * 完整的上传流程：获取预签名 URL + 上传到 OSS + 保存元数据
 */
export async function uploadPhoto(
  file: File,
  recordId: string
): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  try {
    // 1. 验证文件
    const validation = validatePhotoFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // 2. 获取预签名 URL
    const fileExt = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${random}.${fileExt}`

    const presignedResult = await getPresignedUrl(fileName, file.type)
    if (!presignedResult.success) {
      return { success: false, error: presignedResult.error }
    }

    const { presignedUrl, ossKey, ossUrl, mimeType } = presignedResult.data!
    console.log('[uploadPhoto] 后端返回的 MIME 类型:', mimeType)
    console.log('[uploadPhoto] 前端文件的 MIME 类型:', file.type)

    // 3. 上传到 OSS（使用后端返回的 MIME 类型确保签名匹配）
    const uploadResult = await uploadToOSS(file, presignedUrl, mimeType)
    if (!uploadResult.success) {
      console.error('[uploadPhoto] 上传失败:', uploadResult.error, uploadResult.details)
      return { success: false, error: uploadResult.error }
    }

    // 4. 保存元数据到数据库
    const metadataResult = await savePhotoMetadata({
      practice_record_id: recordId,
      oss_url: ossUrl,
      oss_key: ossKey,
      file_size: file.size,
      mime_type: file.type,
    })

    if (!metadataResult.success) {
      return { success: false, error: metadataResult.error }
    }

    return {
      success: true,
      photo: metadataResult.photo,
    }
  } catch (error) {
    console.error('[OSS] 上传流程失败:', error)
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
}): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/photos', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    const result = await response.json()
    // API 返回 { success: true, data: photo }
    if (result.success && result.data) {
      return { success: true, photo: result.data }
    }
    return result
  } catch (error) {
    console.error('[OSS] 保存元数据失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
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
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`/api/practice-records/${recordId}/photos`, {
      method: 'GET',
      headers,
    })

    const result = await response.json()
    // API 返回 { success: true, data: { photos: [...] } }
    // 转换为 { success: true, photos: [...] }
    return {
      success: result.success,
      photos: result.data?.photos,
      error: result.error,
    }
  } catch (error) {
    console.error('[OSS] 获取照片失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
    }
  }
}

/**
 * 软删除照片
 */
export async function deletePhoto(photoId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`/api/photos/${photoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('[OSS] 删除照片失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
    }
  }
}

/**
 * 验证文件是否符合要求
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  console.log('[validatePhotoFile] 检查文件:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`)

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    console.error('[validatePhotoFile] ❌ 不是图片')
    return { valid: false, error: '只能上传图片文件（jpg, png, webp等）' }
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    console.error('[validatePhotoFile] ❌ 文件太大:', sizeMB, 'MB')
    return { valid: false, error: `上传照片不可大于10m（当前${sizeMB}MB）` }
  }

  console.log('[validatePhotoFile] ✅ 验证通过')
  return { valid: true }
}
