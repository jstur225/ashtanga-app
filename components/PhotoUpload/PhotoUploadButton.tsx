'use client'

import React, { useState, useCallback } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadButtonProps {
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

/**
 * 照片上传按钮
 * 设计规范：绿色渐变圆形，Camera 图标
 */
export function PhotoUploadButton({
  disabled = false,
  loading = false,
  onClick,
  className,
}: PhotoUploadButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true)
    }
  }, [disabled, loading])

  const handleMouseUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false)
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={cn(
        // 基础样式
        'w-10 h-10 rounded-full',
        'flex items-center justify-center',
        'transition-all duration-200',
        'z-10',
        // 绿色渐变背景
        'bg-gradient-to-br from-[#3d7a35] to-[#2d5a27]',
        // 边框和阴影
        'border border-white/20',
        'shadow-[0_4px_16px_rgba(45,90,39,0.25)]',
        // Hover 效果
        !disabled && !loading && 'hover:scale-105 hover:shadow-[0_6px_20px_rgba(45,90,39,0.35)]',
        // Active/点击效果
        isPressed && 'scale-[0.98]',
        // Disabled 样式
        disabled && 'opacity-50 cursor-not-allowed bg-gray-400',
        // Loading 样式
        loading && 'cursor-wait',
        className
      )}
      aria-label={loading ? '上传中' : '上传照片'}
      title={disabled ? '当前版本只能上传1张照片' : '上传照片'}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 text-white animate-spin" aria-hidden="true" />
      ) : (
        <Camera className="w-5 h-5 text-white" aria-hidden="true" />
      )}
    </button>
  )
}
