'use client'

import React, { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
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
    toast.loading('上传中...', { id: 'photo-upload' })

    try {
      const result = await uploadPhoto(file, recordId)

      if (result.success && result.photo) {
        const newPhotos = [...photos, result.photo]
        setPhotos(newPhotos)
        onPhotosChange?.(newPhotos)
        toast.success('记录了你的练习瞬间 ✓', { id: 'photo-upload' })
      } else {
        // 处理错误
        toast.error(ERROR_MESSAGES[result.error || ''] || '上传失败，请重试', { id: 'photo-upload' })
      }
    } catch (error) {
      console.error('[PhotoUploader] 上传失败:', error)
      toast.error('上传失败，请重试', { id: 'photo-upload' })
    } finally {
      setIsUploading(false)
      // 清空 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [recordId, photos, maxPhotos, onPhotosChange, checkCanUpload])

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
          <span className="text-sm text-gray-500 font-serif">
            记录你的练习瞬间
          </span>
        </div>
      )}
    </div>
  )
}
