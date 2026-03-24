'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/supabase'
import { PhotoLightbox } from './PhotoLightbox'

interface PhotoPreviewProps {
  photo: Photo
  onDelete?: (photoId: string) => void
  className?: string
  aspectRatio?: '1/1' | '16/9'
}

/**
 * 照片预览组件
 * 显示单张照片，支持删除
 */
export function PhotoPreview({
  photo,
  onDelete,
  className,
  aspectRatio = '16/9',
}: PhotoPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleDelete = () => {
    if (onDelete) {
      onDelete(photo.id)
    }
  }

  const handleImageClick = () => {
    setLightboxOpen(true)
  }

  const isSquare = aspectRatio === '1/1'

  return (
    <>
      <div
        className={cn(
          'relative group',
          'w-full',
          'rounded-[12px]',
          'overflow-hidden',
          'shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
          'border border-white/20',
          'bg-transparent',
          className
        )}
        style={{ aspectRatio }}
      >
        {/* 删除按钮 - 始终显示 */}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'absolute top-2 right-2 z-10',
              'w-7 h-7 rounded-full',
              'flex items-center justify-center',
              'bg-black/60 hover:bg-black/80',
              'text-white',
              'transition-colors',
              'shadow-lg'
            )}
            aria-label="删除照片"
            title="删除照片"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* 照片 */}
        <div
          className="relative w-full h-full cursor-pointer"
          onClick={handleImageClick}
        >
          {/* Loading 占位图 */}
          {isLoading && !imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 text-xs gap-2">
              <span>图片加载失败</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setImgError(false)
                  setIsLoading(true)
                }}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                重试
              </button>
            </div>
          ) : (
            <Image
              src={photo.oss_url}
              alt="练习照片"
              fill
              className="object-cover"
              sizes={isSquare ? '33vw' : '100vw'}
              priority
              unoptimized
              onLoad={() => setIsLoading(false)}
              onError={(e) => {
                console.error('[PhotoPreview] 图片加载失败:', {
                  url: photo.oss_url,
                  id: photo.id,
                  recordId: photo.practice_record_id,
                  error: e
                })
                setIsLoading(false)
                setImgError(true)
              }}
            />
          )}
        </div>
      </div>

      {/* Lightbox */}
      <PhotoLightbox
        src={photo.oss_url}
        alt="练习照片"
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}

/**
 * 照片预览容器
 * 支持不同布局模式：
 * - 'single': 单张照片全宽（用于时光轴单张照片）
 * - 'grid': 网格布局（用于编辑页面多照片，三等分）
 * - 'timeline': 时光轴布局（1张全宽，2张以上三等分）
 */
interface PhotoPreviewListProps {
  photos: Photo[]
  onDelete?: (photoId: string) => void
  className?: string
  layout?: 'single' | 'grid' | 'timeline'
  isLoading?: boolean
}

export function PhotoPreviewList({
  photos,
  onDelete,
  className,
  layout = 'single',
  isLoading = false,
}: PhotoPreviewListProps) {
  // 加载中：显示占位符
  if (isLoading) {
    return (
      <div className={cn(
        'grid grid-cols-3 gap-2',
        className
      )}>
        <div className="aspect-square rounded-[12px] bg-secondary/50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // 没有照片：不显示
  if (!photos || photos.length === 0) {
    return null
  }

  // 时光轴布局：1张全宽，多张网格三等分
  if (layout === 'timeline') {
    const isSingle = photos.length === 1
    return (
      <div className={cn(
        'grid gap-2',
        isSingle ? 'grid-cols-1' : 'grid-cols-3',
        className
      )}>
        {photos.map((photo) => (
          <PhotoPreview
            key={photo.id}
            photo={photo}
            onDelete={onDelete}
            aspectRatio={isSingle ? '16/9' : '1/1'}
          />
        ))}
      </div>
    )
  }

  // 网格布局（编辑页面三等分）
  if (layout === 'grid') {
    return (
      <div className={cn('grid grid-cols-3 gap-2', className)}>
        {photos.map((photo) => (
          <PhotoPreview
            key={photo.id}
            photo={photo}
            onDelete={onDelete}
            aspectRatio="1/1"
          />
        ))}
      </div>
    )
  }

  // 单张照片全宽布局
  return (
    <div className={cn('space-y-3', className)}>
      {photos.map((photo) => (
        <PhotoPreview
          key={photo.id}
          photo={photo}
          onDelete={onDelete}
          aspectRatio="16/9"
        />
      ))}
    </div>
  )
}
