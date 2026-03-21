'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getRecordPhotos } from '@/lib/oss'
import type { Photo } from '@/lib/supabase'

interface TimelinePhotoProps {
  recordId: string
  className?: string
}

/**
 * 时光轴照片展示组件
 * 在时光轴卡片中显示照片（觉察文字下方）
 */
export function TimelinePhoto({
  recordId,
  className,
}: TimelinePhotoProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPhotos = async () => {
      setIsLoading(true)
      const result = await getRecordPhotos(recordId)
      if (result.success && result.photos) {
        setPhotos(result.photos)
      }
      setIsLoading(false)
    }

    fetchPhotos()
  }, [recordId])

  // 加载中显示占位
  if (isLoading) {
    return (
      <div
        className={cn(
          'w-full h-[200px]',
          'rounded-lg',
          'bg-gray-100',
          'animate-pulse',
          className
        )}
      />
    )
  }

  // 没有照片不显示任何内容
  if (photos.length === 0) {
    return null
  }

  // MVP 阶段只显示第一张照片
  const photo = photos[0]

  return (
    <div
      className={cn(
        'mt-3',
        className
      )}
    >
      <div
        className={cn(
          'relative w-full',
          'rounded-lg',
          'overflow-hidden',
          'cursor-pointer'
        )}
        style={{ maxHeight: '400px' }}
        onClick={() => window.open(photo.oss_url, '_blank')}
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
 * 时光轴照片展示（多张照片版本，未来支持）
 * 当支持多照片时使用网格布局
 */
interface TimelinePhotoGridProps {
  photos: Photo[]
  maxDisplay?: number
  className?: string
}

export function TimelinePhotoGrid({
  photos,
  maxDisplay = 9,
  className,
}: TimelinePhotoGridProps) {
  const displayPhotos = photos.slice(0, maxDisplay)
  const remainingCount = photos.length - maxDisplay

  if (displayPhotos.length === 0) {
    return null
  }

  // 单张照片：全宽
  if (displayPhotos.length === 1) {
    return (
      <div className={cn('mt-3', className)}>
        <div
          className="relative w-full rounded-lg overflow-hidden cursor-pointer"
          style={{ maxHeight: '400px' }}
          onClick={() => window.open(displayPhotos[0].oss_url, '_blank')}
        >
          <Image
            src={displayPhotos[0].oss_url}
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

  // 多张照片：网格布局（2-9 张）
  const cols = displayPhotos.length <= 2 ? 2 : 3

  return (
    <div className={cn('mt-3', className)}>
      <div className={cn('grid gap-2', cols === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {displayPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={cn(
              'relative rounded-lg overflow-hidden cursor-pointer',
              index === 0 && displayPhotos.length <= 2 && 'col-span-2'
            )}
            style={{ aspectRatio: '1/1' }}
            onClick={() => window.open(photo.oss_url, '_blank')}
          >
            <Image
              src={photo.oss_url}
              alt={`练习照片 ${index + 1}`}
              fill
              className="object-cover"
              loading="lazy"
            />
            {index === displayPhotos.length - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-serif text-lg">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
