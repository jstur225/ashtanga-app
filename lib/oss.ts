/**
 * OSS 上传工具 - 阿里云 OSS 预签名 URL 上传
 * 替换原有的 Supabase Storage 实现
 */

import { supabase, type Photo } from './supabase'

const OSS_BUCKET = process.env.NEXT_PUBLIC_OSS_BUCKET || ''
const OSS_ENDPOINT = process.env.NEXT_PUBLIC_OSS_ENDPOINT || ''
const OSS_REGION = process.env.NEXT_PUBLIC_OSS_REGION || ''

// 文件大小限制（5MB）
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

export interface PresignedUrlResponse {
  success: boolean
  data?: {
    presignedUrl: string
    ossKey: string
    ossUrl: string
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
export async function getPresignedUrl(fileName: string): Promise<PresignedUrlResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/oss-signature', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileName }),
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
  presignedUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!response.ok) {
      console.error('[OSS] 上传失败:', response.status, response.statusText)
      return {
        success: false,
        error: `UPLOAD_FAILED_${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[OSS] 上传请求失败:', error)
    return {
      success: false,
      error: 'NETWORK_ERROR',
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

    const presignedResult = await getPresignedUrl(fileName)
    if (!presignedResult.success) {
      return { success: false, error: presignedResult.error }
    }

    const { presignedUrl, ossKey, ossUrl } = presignedResult.data!

    // 3. 上传到 OSS
    const uploadResult = await uploadToOSS(file, presignedUrl)
    if (!uploadResult.success) {
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
    return result
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
    return { valid: false, error: `图片大小不能超过5MB（当前${sizeMB}MB）` }
  }

  console.log('[validatePhotoFile] ✅ 验证通过')
  return { valid: true }
}

/**
 * 检查用户今日是否还能上传
 */
export async function canUploadToday(): Promise<{
  success: boolean
  canUpload: boolean
  error?: string
}> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/photos/can-upload', {
      method: 'GET',
      headers,
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('[OSS] 检查上传权限失败:', error)
    return {
      success: false,
      canUpload: false,
      error: 'NETWORK_ERROR',
    }
  }
}
