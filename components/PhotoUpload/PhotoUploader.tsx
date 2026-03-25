'use client'

import React, { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoPreviewList } from './PhotoPreview'
import { uploadPhoto, deletePhoto, validatePhotoFile, ERROR_MESSAGES } from '@/lib/oss'
import type { Photo } from '@/lib/supabase'

interface PhotoUploaderProps {
  recordId: string
  initialPhotos?: Photo[]
  maxPhotos?: number
  disabled?: boolean
  onPhotosChange?: (photos: Photo[]) => void
}

/**
 * 照片上传容器组件
 * 包含上传逻辑、限额检查、预览显示
 */
export function PhotoUploader({
  recordId,
  initialPhotos = [],
  maxPhotos = 1,
  disabled = false,
  onPhotosChange,
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'idle' | 'preparing' | 'uploading' | 'processing'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当 initialPhotos 变化时同步状态
  React.useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  // 处理文件选择
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // 验证文件
    const validation = validatePhotoFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    // 开始上传
    setIsUploading(true)
    setUploadStep('preparing')

    try {
      // 步骤 1: 准备上传（获取预签名 URL）
      setUploadStep('preparing')
      const { getPresignedUrl } = await import('@/lib/oss')
      const fileExt = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `${timestamp}-${random}.${fileExt}`

      const presignedResult = await getPresignedUrl(fileName, file.type)
      if (!presignedResult.success) {
        toast.error(ERROR_MESSAGES[presignedResult.error || ''] || '准备上传失败', { id: 'photo-upload' })
        return
      }

      // 步骤 2: 上传到 OSS
      setUploadStep('uploading')
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
      setUploadStep('processing')
      const { savePhotoMetadata } = await import('@/lib/oss')
      const metadataResult = await savePhotoMetadata({
        practice_record_id: recordId,
        oss_url: ossUrl,
        oss_key: ossKey,
        file_size: file.size,
        mime_type: file.type,
      })

      if (metadataResult.success && metadataResult.photo) {
        const newPhotos = [...photos, metadataResult.photo]
        setPhotos(newPhotos)
        onPhotosChange?.(newPhotos)
        toast.success('记录了你的练习瞬间 ✓', { id: 'photo-upload' })
      } else {
        toast.error(ERROR_MESSAGES[metadataResult.error || ''] || '保存失败，请重试', { id: 'photo-upload' })
      }
    } catch (error) {
      console.error('[PhotoUploader] 上传失败:', error)
      toast.error('上传失败，请重试', { id: 'photo-upload' })
    } finally {
      setIsUploading(false)
      setUploadStep('idle')
      // 清空 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [recordId, photos, maxPhotos, onPhotosChange])

  // 处理上传按钮点击
  const handleUploadClick = useCallback(() => {
    // 检查是否还可以上传
    if (photos.length >= maxPhotos) {
      toast.info('当前版本只能上传1张照片')
      return
    }

    // 打开文件选择器
    fileInputRef.current?.click()
  }, [photos.length, maxPhotos])

  // 处理删除照片
  const handleDelete = useCallback(async (photoId: string) => {
    const result = await deletePhoto(photoId)

    if (result.success) {
      const newPhotos = photos.filter(p => p.id !== photoId)
      setPhotos(newPhotos)
      onPhotosChange?.(newPhotos)
      toast.success('照片已删除 ✓')
    } else {
      toast.error('删除失败，请重试')
    }
  }, [photos, onPhotosChange])

  // 是否显示上传按钮
  const showUploadButton = photos.length < maxPhotos && !disabled

  return (
    <div className="space-y-3">
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="选择照片"
      />

      {/* 照片预览 - 编辑页面使用三等分网格 */}
      {photos.length > 0 && (
        <PhotoPreviewList
          photos={photos}
          onDelete={handleDelete}
          layout="grid"
        />
      )}

      {/* 上传按钮 */}
      {showUploadButton && (
        <div className="flex items-center gap-3">
          <PhotoUploadButton
            onClick={handleUploadClick}
            loading={isUploading}
          />
          <div className="flex flex-col">
            {isUploading ? (
              <>
                <span className="text-sm font-serif text-primary">
                  {uploadStep === 'preparing' && '准备上传...'}
                  {uploadStep === 'uploading' && '上传中...'}
                  {uploadStep === 'processing' && '处理中...'}
                </span>
                {/* 步骤进度条 */}
                <div className="flex items-center gap-1 mt-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    uploadStep === 'preparing' ? "bg-primary animate-pulse" : "bg-primary"
                  )} />
                  <div className="w-4 h-[2px] bg-border" />
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    uploadStep === 'uploading' ? "bg-primary animate-pulse" :
                    uploadStep === 'processing' || uploadStep === 'idle' ? "bg-primary" : "bg-gray-300"
                  )} />
                  <div className="w-4 h-[2px] bg-border" />
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    uploadStep === 'processing' ? "bg-primary animate-pulse" :
                    uploadStep === 'idle' ? "bg-primary" : "bg-gray-300"
                  )} />
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500 font-serif">
                记录你的练习瞬间
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
