"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Mic, Square, Pause, Play } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useVoiceInput } from "@/hooks/useVoiceInput"
import { toast } from "sonner"

// 波形组件 - 类似 flomo 风格
function Waveform({ isRecording, isPaused }: { isRecording: boolean; isPaused: boolean }) {
  const [bars, setBars] = useState<number[]>(Array(40).fill(3))

  useEffect(() => {
    if (!isRecording || isPaused) {
      setBars(Array(40).fill(3))
      return
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => {
        return Math.random() > 0.2 ? Math.random() * 40 + 5 : 3
      }))
    }, 80)

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  return (
    <div className="flex items-center justify-center gap-[2px] h-16 w-full px-2">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-primary rounded-full"
          animate={{ height: `${height}px` }}
          transition={{ duration: 0.08 }}
        />
      ))}
    </div>
  )
}

// 录音卡片组件 - 从输入框下方滑出
interface VoiceRecorderInlineProps {
  isRecording: boolean
  onStart: () => void
  onStop: () => void
  onTranscript: (text: string) => void
}

function VoiceRecorderInline({ isRecording, onStart, onStop, onTranscript }: VoiceRecorderInlineProps) {
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef('')

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    // 计算新增文字，避免重复
    const newText = text.slice(transcriptRef.current.length)
    transcriptRef.current = text

    if (newText) {
      console.log('[VoiceRecorder] New transcript:', newText)
      onTranscript(newText)
    }
  }, [onTranscript])

  const handleError = useCallback((error: string) => {
    toast.error(error)
    handleStop()
  }, [])

  const {
    isSupported,
    startListening,
    stopListening,
    pauseListening,
    resumeListening
  } = useVoiceInput({
    onResult: handleResult,
    onError: handleError
  })

  // 计时器
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording, isPaused])

  // 开始录音时重置状态
  useEffect(() => {
    if (isRecording) {
      if (!isSupported) {
        toast.error('当前浏览器不支持语音输入')
        onStop()
        return
      }
      setDuration(0)
      setIsPaused(false)
      transcriptRef.current = ''
      startListening()
      onStart()
    }
  }, [isRecording, isSupported, startListening, onStart, onStop])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    pauseListening?.()
  }, [pauseListening])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    resumeListening?.()
  }, [resumeListening])

  const handleStop = useCallback(async () => {
    await stopListening()
    onStop()
    setDuration(0)
    setIsPaused(false)
    transcriptRef.current = ''
  }, [stopListening, onStop])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isRecording) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: 20 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="mt-3 overflow-hidden"
    >
      {/* 浅色录音卡片 */}
      <div className="bg-card rounded-2xl border border-border p-5">
        {/* 顶部：REC + 日期 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">REC</span>
              <motion.span
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: isPaused ? 0.3 : [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {new Date().toISOString().split('T')[0]}
            </span>
          </div>
        </div>

        {/* 波形 - 居中 */}
        <Waveform isRecording={isRecording} isPaused={isPaused} />

        {/* 底部：大时间 + 按钮 */}
        <div className="flex items-end justify-between mt-4">
          {/* 左侧：大时间显示 */}
          <span className="text-4xl font-light font-mono text-foreground tracking-wider">
            {formatDuration(duration)}
          </span>

          {/* 右侧：控制按钮 */}
          <div className="flex items-center gap-3">
            {/* 暂停/继续 - 浅色圆形 */}
            <button
              onClick={isPaused ? handleResume : handlePause}
              className="w-12 h-12 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-95"
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-foreground ml-0.5" />
              ) : (
                <Pause className="w-5 h-5 text-foreground" />
              )}
            </button>

            {/* 停止 - 绿色主按钮 */}
            <button
              onClick={handleStop}
              className="w-12 h-12 rounded-full green-gradient flex items-center justify-center transition-all active:scale-95 shadow-lg"
            >
              <Square className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// 浮动麦克风按钮 - 应用统一的绿色玻璃风格
interface VoiceFloatButtonProps {
  onTranscript: (text: string) => void
}

export function VoiceFloatButton({ onTranscript }: VoiceFloatButtonProps) {
  const [isRecording, setIsRecording] = useState(false)

  const handleStart = useCallback(async () => {
    // 请求麦克风权限
    try {
      console.log('[VoiceRecorder] Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      console.log('[VoiceRecorder] Microphone permission granted')
    } catch (err) {
      console.error('[VoiceRecorder] Microphone permission denied:', err)
      toast.error('请允许麦克风权限以使用语音输入')
      return
    }
    setIsRecording(true)
  }, [])

  const handleStop = useCallback(() => {
    setIsRecording(false)
  }, [])

  const handleTranscript = useCallback((text: string) => {
    console.log('[VoiceFloatButton] Received transcript:', text)
    onTranscript(text)
  }, [onTranscript])

  return (
    <>
      {/* 浮动按钮 - 绿色玻璃拟态风格 */}
      <AnimatePresence mode="wait">
        {!isRecording && (
          <motion.button
            type="button"
            key="mic-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={handleStart}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center z-10 transition-all"
            title="语音输入"
          >
            <Mic className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 录音卡片 - 从输入框下方滑出 */}
      <AnimatePresence mode="wait">
        {isRecording && (
          <VoiceRecorderInline
            key="recorder"
            isRecording={isRecording}
            onStart={() => {}}
            onStop={handleStop}
            onTranscript={handleTranscript}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// 兼容旧版本的导出
export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  return <VoiceFloatButton onTranscript={onTranscript} />
}
