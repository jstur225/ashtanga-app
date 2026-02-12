"use client"

import React, { useState, useCallback } from 'react'
import { Mic } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useVoiceInput } from "@/hooks/useVoiceInput"
import { toast } from "sonner"

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      onTranscript(text)
    }
  }, [onTranscript])

  const handleError = useCallback((error: string) => {
    toast.error(error)
  }, [])

  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening
  } = useVoiceInput({
    onResult: handleResult,
    onError: handleError
  })

  const handleMouseDown = useCallback(() => {
    if (disabled || !isSupported) return
    startListening()
  }, [disabled, isSupported, startListening])

  const handleMouseUp = useCallback(() => {
    if (isListening) {
      stopListening()
    }
  }, [isListening, stopListening])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (disabled || !isSupported) return
    startListening()
  }, [disabled, isSupported, startListening])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (isListening) {
      stopListening()
    }
  }, [isListening, stopListening])

  const handleClick = useCallback(() => {
    if (!isSupported) {
      toast.error('当前浏览器不支持语音输入，请使用 Chrome 或 Safari 浏览器')
      return
    }
  }, [isSupported])

  if (!isSupported) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground transition-all"
        title="语音输入不支持当前浏览器"
      >
        <Mic className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-full whitespace-nowrap"
          >
            按住说话
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onMouseUp={handleMouseUp}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              className="bg-card rounded-3xl p-8 flex flex-col items-center gap-4"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
            >
              {/* Animated mic */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-primary/20 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 bg-primary/30 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                />
                <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <Mic className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">正在聆听...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {transcript || "请说话"}
                </p>
              </div>

              {/* Hint */}
              <p className="text-xs text-muted-foreground">松开结束录音</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={(e) => {
          setShowTooltip(false)
          handleMouseUp()
        }}
        disabled={disabled}
        className={`
          flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
          ${isListening
            ? 'bg-primary text-white scale-110'
            : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="按住说话"
      >
        <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  )
}
