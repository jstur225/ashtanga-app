'use client'

import React, { useState, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoPreview } from './PhotoPreview'
import { deletePhoto, validatePhotoFile, ERROR_MESSAGES } from '@/lib/oss'
import type { Photo } from '@/lib/supabase'

interface PhotoUploaderProps {
  recordId: string
  initialPhotos?: Photo[]
  maxPhotos?: number
  disabled?: boolean
  onPhotosChange?: (photos: Photo[]) => void
}

/**
 * 上传中的项目（用于显示占位进度条）
 * 支持多照片上传架构
 */
interface UploadingItem {
  id: string
  progress: number
  fileName: string
}

/**
 * 照片上传容器组件
 * 包含上传逻辑、限额检查、预览显示
 * 支持多照片并发上传（预留架构）
 */
export function PhotoUploader({
  recordId,
  initialPhotos = [],
  maxPhotos = 9,
  disabled = false,
  onPhotosChange,
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 清理指定上传项的定时器
  const clearUploadTimer = useCallback((id: string) => {
    const timer = uploadTimersRef.current.get(id)
    if (timer) {
      clearInterval(timer)
      uploadTimersRef.current.delete(id)
    }
  }, [])

  // 模拟进度增长
  const startProgressSimulation = useCallback((id: string) => {
    const timer = setInterval(() => {
      setUploadingItems(prev => prev.map(item => {
        if (item.id !== id) return item
        // 渐进增长：开始快，后面慢，到90%暂停等待真实完成
        const increment = item.progress < 30 ? 15 :
                         item.progress < 60 ? 8 :
                         item.progress < 80 ? 3 :
                         item.progress < 90 ? 1 : 0
        return { ...item, progress: Math.min(item.progress + increment, 90) }
      }))
    }, 200)
    uploadTimersRef.current.set(id, timer)
  }, [])

  // 完成上传，进度跳到100%
  const completeUpload = useCallback((id: string) => {
    clearUploadTimer(id)
    setUploadingItems(prev => prev.map(item =>
      item.id === id ? { ...item, progress: 100 } : item
    ))
    // 100ms 后移除占位图
    setTimeout(() => {
      setUploadingItems(prev => prev.filter(item => item.id !== id))
    }, 100)
  }, [clearUploadTimer])

  // 上传失败，移除占位图并显示真实错误
  const failUpload = useCallback((id: string, errorMessage: string) => {
    clearUploadTimer(id)
    setUploadingItems(prev => prev.filter(item => item.id !== id))
    toast.error(errorMessage, { id: `photo-upload-${id}` })
  }, [clearUploadTimer])

  // 单文件上传（支持传入 uploadId）- 完全延后执行
  const uploadSingleFile = useCallback(async (file: File, existingUploadId?: string) => {
    // 使用传入的 uploadId 或创建新的
    const uploadId = existingUploadId || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // 如果没有传入 uploadId，需要创建占位项
    if (!existingUploadId) {
      const newItem: UploadingItem = {
        id: uploadId,
        progress: 0,
        fileName: file.name,
      }
      setUploadingItems(prev => [...prev, newItem])
    }

    // 把实际上传逻辑完全延后到宏任务，不阻塞当前渲染
    setTimeout(() => {
      // 开始模拟进度
      startProgressSimulation(uploadId)

      // 验证文件
      const validation = validatePhotoFile(file)
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`)
        return
      }

      // 执行实际上传
      doUpload(file, uploadId)
    }, 0)
  }, [startProgressSimulation])

  // 实际的上传逻辑（从原 uploadSingleFile 提取）
  const doUpload = useCallback(async (file: File, uploadId: string) => {
    try {
      // 步骤 1: 准备上传（获取预签名 URL）
      const { getPresignedUrl } = await import('@/lib/oss')
      const fileExt = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `${timestamp}-${random}.${fileExt}`

      const presignedResult = await getPresignedUrl(fileName, file.type)
      if (!presignedResult.success) {
        failUpload(uploadId, ERROR_MESSAGES[presignedResult.error || ''] || '准备上传失败，请重试')
        return
      }

      // 步骤 2: 上传到 OSS
      const { presignedUrl, ossKey, ossUrl } = presignedResult.data!

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`上传失败: ${uploadResponse.status}`)
      }

      // 步骤 3: 保存元数据
      const { savePhotoMetadata } = await import('@/lib/oss')
      const metadataResult = await savePhotoMetadata({
        practice_record_id: recordId,
        oss_url: ossUrl,
        oss_key: ossKey,
        file_size: file.size,
        mime_type: file.type,
      })

      if (metadataResult.success && metadataResult.photo) {
        // 立即完成：跳到100%，占位图消失，显示真实照片
        completeUpload(uploadId)
        setPhotos(prev => {
          const newPhotos = [...prev, metadataResult.photo!]
          onPhotosChange?.(newPhotos)
          return newPhotos
        })
      } else {
        failUpload(uploadId, ERROR_MESSAGES[metadataResult.error || ''] || '保存失败，请重试')
      }
    } catch (error) {
      console.error('[PhotoUploader] 上传失败:', error)
      const errorMsg = error instanceof Error ? error.message : '上传失败，请重试'
      failUpload(uploadId, errorMsg)
    }
  }, [recordId, startProgressSimulation, completeUpload, failUpload, onPhotosChange])

  // 处理文件选择 - 测试版本：完全同步
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const filesToUpload = Array.from(files).slice(0, maxPhotos - photos.length).slice(0, 9)

    // 完全同步：先显示所有占位图
    filesToUpload.forEach((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      // 显示占位图
      setUploadingItems(prev => [...prev, {
        id: uploadId,
        progress: 0,
        fileName: file.name,
      }])
    })

    // 再开始上传（不用setTimeout）
    filesToUpload.forEach((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      uploadSingleFile(file, uploadId)
    })

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [maxPhotos, photos.length, uploadSingleFile])

  // 处理上传按钮点击
  const handleUploadClick = useCallback(() => {
    // 检查是否还可以上传（已上传 + 上传中 < 上限）
    const totalCount = photos.length + uploadingItems.length
    if (totalCount >= maxPhotos) {
      toast.info(`最多上传 ${maxPhotos} 张照片`)
      return
    }

    // 打开文件选择器
    fileInputRef.current?.click()
  }, [photos.length, uploadingItems.length, maxPhotos])

  // 处理删除照片 - 乐观删除，即时反馈
  const handleDelete = useCallback(async (photoId: string) => {
    // 立即本地移除，提供即时视觉反馈
    const photoToDelete = photos.find(p => p.id === photoId)
    if (!photoToDelete) return

    const newPhotos = photos.filter(p => p.id !== photoId)
    setPhotos(newPhotos)
    onPhotosChange?.(newPhotos)
    toast.success('照片已删除 ✓')

    // 后台异步发送删除请求（不阻塞 UI）
    deletePhoto(photoId, recordId, photoToDelete.oss_url).then(result => {
      if (!result.success) {
        // 如果是 PHOTO_NOT_FOUND，说明照片已经被删除，视为成功
        if (result.error === 'PHOTO_NOT_FOUND') {
          console.log('[PhotoUploader] 照片已不存在，视为删除成功')
          return
        }
        console.error('[PhotoUploader] 删除失败:', result.error)
        // 删除失败，回滚状态
        setPhotos(prev => {
          if (prev.some(p => p.id === photoId)) return prev
          return photoToDelete ? [...prev, photoToDelete].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ) : prev
        })
        toast.error('删除失败，请重试')
      }
    }).catch(error => {
      console.error('[PhotoUploader] 删除请求异常:', error)
      // 网络错误等情况，回滚状态
      setPhotos(prev => {
        if (prev.some(p => p.id === photoId)) return prev
        return photoToDelete ? [...prev, photoToDelete].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ) : prev
      })
      toast.error('删除失败，请重试')
    })
  }, [photos, onPhotosChange])

  // 是否显示上传按钮
  const totalCount = photos.length + uploadingItems.length
  const showUploadButton = totalCount < maxPhotos && !disabled
  const isUploading = uploadingItems.length > 0

  return (
    <div className="space-y-3">
      {/* 隐藏的文件输入框 - 直接使用内联 onChange */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/*"
        multiple
        {...{ webkitdirectory: undefined, directory: undefined }}
        onChange={(e) => {
          const files = e.target.files
          if (!files || files.length === 0) return

          // 超简单：只取第一个文件，只添加一个占位图
          const file = files[0]
          setUploadingItems(prev => [...prev, {
            id: `test-${Date.now()}`,
            progress: 50,
            fileName: '上传中...',
          }])
        }}
        className="hidden"
        aria-label="选择照片"
      />

      {/* 照片预览区：已上传照片 + 上传中占位图 */}
      {(photos.length > 0 || uploadingItems.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {/* 已上传的照片 - 使用memo缓存 */}
          <PhotoGrid photos={photos} onDelete={handleDelete} />

          {/* 上传中的占位图（带进度条） */}
          {uploadingItems.map((item) => (
            <UploadingPlaceholder key={item.id} progress={item.progress} />
          ))}
        </div>
      )}

      {/* 测试按钮：始终显示，直接添加占位符 */}
      <button
        onClick={() => {
          setUploadingItems(prev => [...prev, {
            id: `test-${Date.now()}`,
            progress: 50,
            fileName: '测试',
          }])
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium mb-3 block"
      >
        测试占位符（点击立即显示）
      </button>

      {/* 上传按钮 */}
      {showUploadButton && (
        <div className="flex items-center gap-3">
          <PhotoUploadButton
            onClick={handleUploadClick}
            loading={isUploading}
          />
          <span className="text-sm text-gray-500 font-serif">
            记录你的练习瞬间
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * 照片网格 - 使用memo缓存避免重复渲染
 */
const PhotoGrid = React.memo(function PhotoGrid({
  photos,
  onDelete,
}: {
  photos: Photo[]
  onDelete?: (photoId: string) => void
}) {
  return (
    <>
      {photos.map((photo) => (
        <PhotoPreviewItem
          key={photo.id}
          photo={photo}
          onDelete={onDelete}
        />
      ))}
    </>
  )
})

/**
 * 单张照片预览项（三等分网格用）
 */
function PhotoPreviewItem({
  photo,
  onDelete,
}: {
  photo: Photo
  onDelete?: (photoId: string) => void
}) {
  return (
    <div className="relative aspect-square">
      <PhotoPreview
        photo={photo}
        onDelete={onDelete}
        aspectRatio="1/1"
      />
    </div>
  )
}

/**
 * 上传中占位图组件
 * 中间显示进度条，无数字
 */
function UploadingPlaceholder({ progress }: { progress: number }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
      {/* 背景图片占位 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* 进度条 */}
      <div className="absolute inset-x-4 bottom-4">
        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className="h-full bg-white rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
