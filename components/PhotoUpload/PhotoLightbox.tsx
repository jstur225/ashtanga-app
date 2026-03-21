'use client'

import React, { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoLightboxProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

/**
 * 照片 Lightbox 组件
 * 点击照片放大查看
 * - 宽度固定 90%，最大 900px
 * - 高度自适应原图比例
 * - 超长图支持上下滚动
 * - 圆角直接加在照片上
 */
export function PhotoLightbox({
  src,
  alt = '照片',
  isOpen,
  onClose,
}: PhotoLightboxProps) {
  // 点击背景关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-4 right-4 z-10',
          'w-10 h-10 rounded-full',
          'flex items-center justify-center',
          'bg-black/60 hover:bg-black/80',
          'text-white',
          'transition-colors',
          'shadow-lg'
        )}
        aria-label="关闭"
        title="关闭"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 照片容器 - 固定宽度，高度自适应，超长可滚动 */}
      <div
        className={cn(
          'relative w-[90%] max-w-[900px] mx-auto',
          'max-h-[85vh]',
          'overflow-y-auto overflow-x-hidden',
          'flex items-start justify-center'
        )}
        onClick={(e) => e.stopPropagation()} // 防止点击照片时关闭
      >
        {/* 使用原生 img 保持原图比例，避免 Next.js Image 的约束 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-auto max-w-full',
            'rounded-2xl',
            'block'
          )}
          style={{
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}
