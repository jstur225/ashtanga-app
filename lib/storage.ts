import { supabase } from './supabase'

// Storage bucket name
const BUCKET_NAME = 'practice-photos'

// 文件大小限制（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

/**
 * 上传照片到Supabase Storage
 * @param file - 要上传的文件
 * @param folderPath - 文件夹路径（如 "2026-01/2026-01-19"）
 * @returns 文件的公开访问URL
 */
export async function uploadPhoto(
  file: File,
  folderPath?: string
): Promise<{ url: string; path: string } | null> {
  try {
    console.log(`[Storage] 开始上传: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件')
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('图片大小不能超过5MB')
    }

    // 生成文件名（使用时间戳 + 随机数避免冲突）
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}-${random}.${fileExt}`

    // 构建完整路径
    const fullPath = folderPath
      ? `${folderPath}/${fileName}`
      : fileName

    console.log(`[Storage] 上传路径: ${fullPath}`)

    // 上传文件
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, file, {
        cacheControl: '3600', // 缓存1小时
        upsert: false // 如果文件已存在则报错
      })

    if (error) {
      console.error('[Storage] 上传失败:', JSON.stringify(error))
      throw error
    }

    console.log('[Storage] 上传成功，获取公开URL...')

    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    console.log('[Storage] ✅ 完成:', urlData.publicUrl)

    return {
      url: urlData.publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('[Storage] ❌ 错误:', error)
    return null
  }
}

/**
 * 批量上传照片
 * @param files - 文件数组
 * @param folderPath - 文件夹路径
 * @returns 上传成功的URL数组
 */
export async function uploadPhotos(
  files: File[],
  folderPath?: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadPhoto(file, folderPath))
  const results = await Promise.all(uploadPromises)

  // 过滤掉上传失败的
  return results
    .filter(result => result !== null)
    .map(result => result!.url)
}

/**
 * 删除照片
 * @param path - 文件路径（相对于bucket）
 */
export async function deletePhoto(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting photo:', error)
    return false
  }
}

/**
 * 验证文件是否符合要求
 * @param file - 文件对象
 * @returns 验证结果和错误信息
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
