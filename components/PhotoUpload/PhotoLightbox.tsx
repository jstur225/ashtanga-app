'use client'

import React, { useEffect, useCallback } from 'react'
import Image from 'next/image'
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
          'bg-white/20 hover:bg-white/30 backdrop-blur-md',
          'text-white',
          'transition-colors'
        )}
        aria-label="关闭"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 照片容器 - 带边框和圆角 */}
      <div className="relative w-[90vw] h-[80vh] max-w-4xl">
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/20 shadow-2xl">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes="90vw"
            priority
          />
        </div>
      </div>
    </div>
  )
}
