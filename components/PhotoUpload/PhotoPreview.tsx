'use client'

import React from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/supabase'

interface PhotoPreviewProps {
  photo: Photo
  onDelete?: (photoId: string) => void
  className?: string
}

/**
 * 照片预览组件
 * 显示单张照片，支持删除
 * 设计规范：与觉察文字同宽，圆角 20px
 */
export function PhotoPreview({
  photo,
  onDelete,
  className,
}: PhotoPreviewProps) {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(photo.id)
    }
  }

  const handleImageClick = () => {
    // 打开大图预览（Lightbox）
    // TODO: 实现 Lightbox 功能
    window.open(photo.oss_url, '_blank')
  }

  return (
    <div
      className={cn(
        'relative group',
        'w-full',
        'rounded-[20px]',
        'overflow-hidden',
        'shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
        'border border-white/20',
        className
      )}
    >
      {/* 删除按钮 */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            'absolute top-2 right-2 z-10',
            'w-8 h-8 rounded-full',
            'flex items-center justify-center',
            'bg-black/50 hover:bg-black/70',
            'text-white',
            'transition-opacity duration-200',
            'opacity-0 group-hover:opacity-100',
            'focus:opacity-100'
          )}
          aria-label="删除照片"
          title="删除照片"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      {/* 照片 */}
      <div
        className="relative w-full cursor-pointer"
        style={{ maxHeight: '400px' }}
        onClick={handleImageClick}
      >
        <Image
          src={photo.oss_url}
          alt="练习照片"
          width={800}
          height={400}
          className="w-full h-auto object-cover"
          style={{ maxHeight: '400px' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}

/**
 * 照片预览容器（用于编辑弹窗）
 * 显示照片列表（MVP 阶段只显示 1 张）
 */
interface PhotoPreviewListProps {
  photos: Photo[]
  onDelete?: (photoId: string) => void
  className?: string
}

export function PhotoPreviewList({
  photos,
  onDelete,
  className,
}: PhotoPreviewListProps) {
  if (!photos || photos.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {photos.map((photo) => (
        <PhotoPreview
          key={photo.id}
          photo={photo}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
