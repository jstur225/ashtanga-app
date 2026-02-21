'use client'

import React from 'react'
import { Camera } from "lucide-react"

interface PhotoUploadButtonProps {
  onClick?: () => void
}

export function PhotoUploadButton({ onClick }: PhotoUploadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center z-10 transition-all hover:scale-105 active:scale-95"
      title="上传照片"
    >
      <Camera className="w-5 h-5 text-white" />
    </button>
  )
}
