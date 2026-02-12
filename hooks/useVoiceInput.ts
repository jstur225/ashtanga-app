"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface UseVoiceInputOptions {
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  lang?: string
}

interface UseVoiceInputReturn {
  isListening: boolean
  transcript: string
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  pauseListening?: () => void
  resumeListening?: () => void
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onResult, onError, lang = 'zh-CN' } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const isPausedRef = useRef(false)
  const accumulatedTranscriptRef = useRef('')

  // Check support on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      setError('当前浏览器不支持语音输入，请使用 Chrome 或 Safari')
    }
  }, [])

  // Initialize recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('[useVoiceInput] SpeechRecognition not supported')
      return
    }

    console.log('[useVoiceInput] Initializing SpeechRecognition...')
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      isListeningRef.current = true
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // 如果处于暂停状态，不处理结果
      if (isPausedRef.current) return

      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // 调试：打印识别结果
      console.log('[SpeechRecognition] result:', {
        finalTranscript,
        interimTranscript,
        resultLength: event.results.length,
        resultIndex: event.resultIndex
      })

      // 累加最终结果
      if (finalTranscript) {
        accumulatedTranscriptRef.current += finalTranscript
      }

      const currentTranscript = accumulatedTranscriptRef.current + interimTranscript
      setTranscript(currentTranscript)

      // Call onResult with ONLY the new text, not accumulated
      // 只传递新增的文字，避免重复
      if (onResult) {
        const newText = finalTranscript || interimTranscript
        if (newText) {
          onResult(newText, !!finalTranscript)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)

      let errorMessage = '语音识别出错'
      switch (event.error) {
        case 'no-speech':
          errorMessage = '没有检测到语音，请重试'
          break
        case 'audio-capture':
          errorMessage = '无法访问麦克风'
          break
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝'
          break
        case 'network':
          errorMessage = '网络错误，请检查网络连接'
          break
        case 'aborted':
          // User stopped, not really an error
          return
        default:
          errorMessage = `识别错误: ${event.error}`
      }

      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }

      setIsListening(false)
      isListeningRef.current = false
    }

    recognition.onend = () => {
      // Only update state if we're still supposed to be listening
      // (i.e., not manually stopped)
      if (isListeningRef.current) {
        // Recognition stopped unexpectedly, restart if we want continuous
        try {
          recognition.start()
        } catch {
          setIsListening(false)
          isListeningRef.current = false
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
        // Ignore
      }
    }
  }, [lang, onResult, onError])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('当前浏览器不支持语音输入')
      return
    }

    setTranscript('')
    accumulatedTranscriptRef.current = ''
    isPausedRef.current = false

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start recognition:', error)
      // Try to recreate recognition instance if it failed
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const newRecognition = new SpeechRecognition()
        newRecognition.continuous = true
        newRecognition.interimResults = true
        newRecognition.lang = lang

        // Copy all handlers
        newRecognition.onstart = recognitionRef.current.onstart
        newRecognition.onresult = recognitionRef.current.onresult
        newRecognition.onerror = recognitionRef.current.onerror
        newRecognition.onend = recognitionRef.current.onend

        recognitionRef.current = newRecognition

        try {
          newRecognition.start()
        } catch (e) {
          toast.error('启动语音识别失败，请刷新页面重试')
        }
      }
    }
  }, [lang])

  const stopListening = useCallback(() => {
    return new Promise<void>((resolve) => {
      isListeningRef.current = false
      isPausedRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }
      setIsListening(false)
      accumulatedTranscriptRef.current = ''
      // 给一点时间让 recognition 真正停止
      setTimeout(resolve, 100)
    })
  }, [])

  const pauseListening = useCallback(() => {
    isPausedRef.current = true
    // 停止但不重置累加的文字
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }
    setIsListening(false)
  }, [])

  const resumeListening = useCallback(() => {
    if (!recognitionRef.current || !isPausedRef.current) return

    isPausedRef.current = false
    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to resume recognition:', error)
      toast.error('恢复录音失败')
    }
  }, [])

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening
  }
}

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}
