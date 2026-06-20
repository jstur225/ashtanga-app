"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { formatAudioTime, shouldShowPracticeControls } from "@/hooks/useGuidedAudio"
import { formatMinutes, formatSeconds } from "@/lib/practice-utils"
import { BreathingRipples, ConfirmEndDialog } from "@/components/practice/PracticeSessionControls"

interface PracticeSessionViewProps {
  elapsedTime: number
  isPaused: boolean
  practiceLabel: string
  practiceNotes: string
  activeOptionId: string | null
  isChantCountdown: boolean
  chantCountdown: number
  onSkipChantCountdown: () => void
  isChantPlaying: boolean
  isAudioLoaded: boolean
  isAudioLoading: boolean
  audioError: string | null
  isUsingCache: boolean
  audioProgress: number
  audioCurrentTime: number
  audioDuration: number
  onRetryAudio: () => void
  onPauseResume: () => void
  onRequestEnd: () => void
  seekStepOptions: readonly number[]
  seekStep: number
  onSeekStepChange: (step: number) => void
  onAudioSeek: (direction: "backward" | "forward") => void
  showConfirmEnd: boolean
  onCancelEnd: () => void
  onConfirmEnd: () => void
  onDiscardEnd: () => void
}

export function PracticeSessionView({
  elapsedTime,
  isPaused,
  practiceLabel,
  practiceNotes,
  activeOptionId,
  isChantCountdown,
  chantCountdown,
  onSkipChantCountdown,
  isChantPlaying,
  isAudioLoaded,
  isAudioLoading,
  audioError,
  isUsingCache,
  audioProgress,
  audioCurrentTime,
  audioDuration,
  onRetryAudio,
  onPauseResume,
  onRequestEnd,
  seekStepOptions,
  seekStep,
  onSeekStepChange,
  onAudioSeek,
  showConfirmEnd,
  onCancelEnd,
  onConfirmEnd,
  onDiscardEnd,
}: PracticeSessionViewProps) {
  const showGuidedAudioProgress = activeOptionId === "guided_audio" && isAudioLoaded && !isAudioLoading && !audioError

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col relative"
    >
      <AnimatePresence>
        {isChantCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/30 backdrop-blur-[8px] z-50 flex flex-col items-center border border-white/30"
          >
            <main className="flex-1 flex items-center justify-center px-6">
              <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-5xl sm:text-6xl font-light text-foreground font-serif">{chantCountdown}</span>
              </div>
            </main>
            <div className="px-6 pb-32 flex justify-center">
              <button
                type="button"
                onClick={onSkipChantCountdown}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-card/80 backdrop-blur-md border border-white/10 text-foreground font-serif shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-card transition-colors"
              >
                跳过
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isChantPlaying && (
        <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
          <span className="text-xs text-foreground/70 font-serif bg-white/30 backdrop-blur-[8px] border border-white/30 px-4 py-1.5 rounded-full">
            唱诵中...
          </span>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="relative"
        >
          <div className="absolute inset-[-20px]">
            <BreathingRipples isPaused={isPaused} />
          </div>
          <div className={`w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full green-gradient p-[2px] shadow-[0_12px_48px_rgba(45,90,39,0.45)] ${!isPaused ? "animate-breathe" : ""}`}>
            <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-[16px] flex flex-col items-center justify-center border border-white/30 relative">
              <div className="flex flex-col items-center">
                <span className="text-5xl sm:text-6xl font-light text-foreground tracking-wider font-serif">
                  {formatMinutes(elapsedTime)}
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-foreground text-lg font-serif">分</span>
                  {formatSeconds(elapsedTime) !== "00" && (
                    <span className="text-muted-foreground text-sm font-serif">{formatSeconds(elapsedTime)}秒</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center mt-2">
                <span className="text-[14px] leading-snug text-center text-foreground font-serif">{practiceLabel}</span>
                {practiceNotes && (
                  <span className="text-[11px] leading-snug text-center text-muted-foreground/70 font-serif mt-0.5">
                    {practiceNotes}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {showGuidedAudioProgress && (
        <motion.div className="w-full max-w-sm mx-auto px-6 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative h-1.5 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/10">
            <div
              aria-label="口令播放进度"
              className="absolute inset-y-0 left-0 bg-primary/80 rounded-full transition-all duration-300"
              style={{ width: `${audioProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-foreground/50 mt-2 font-serif">
            <span>{formatAudioTime(audioCurrentTime)}</span>
            <span>{formatAudioTime(audioDuration)}</span>
          </div>
        </motion.div>
      )}

      <div className="px-6 pb-32">
        {activeOptionId === "guided_audio" && isAudioLoading && (
          <motion.div
            role="status"
            aria-label="正在加载口令音频"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-3 bg-white/20 backdrop-blur-[8px] rounded-2xl border border-white/30"
          >
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-foreground/70 mt-4 font-serif">{isUsingCache ? "从缓存读取..." : "加载音频中..."}</p>
          </motion.div>
        )}

        {activeOptionId === "guided_audio" && audioError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-6 bg-white/20 backdrop-blur-[8px] rounded-2xl border border-white/30"
          >
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <p className="text-sm text-destructive font-serif text-center">{audioError}</p>
            <button type="button" onClick={onRetryAudio} className="mt-4 px-6 py-2 rounded-full green-gradient text-white text-sm font-serif">
              重试
            </button>
          </motion.div>
        )}

        {shouldShowPracticeControls(activeOptionId, isAudioLoaded, isAudioLoading, audioError) && (
          <>
            <div className="flex gap-4 justify-center">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onPauseResume}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-card/80 backdrop-blur-md border border-white/10 text-foreground font-serif shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-card transition-colors"
              >
                {isPaused ? <><Play className="w-5 h-5" />继续</> : <><Pause className="w-5 h-5" />暂停</>}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onRequestEnd}
                className="px-8 py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif shadow-[0_4px_20px_rgba(45,90,39,0.2)] hover:opacity-90 transition-opacity"
              >
                结束
              </motion.button>
            </div>

            {showGuidedAudioProgress && (
              <div className="flex items-center justify-center gap-3 mt-4 bg-white/20 backdrop-blur-[8px] rounded-full px-3 py-1.5 border border-white/30">
                <motion.button type="button" aria-label="后退口令音频" whileTap={{ scale: 0.9 }} onClick={() => onAudioSeek("backward")} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-foreground/50 hover:text-foreground transition-all">
                  <SkipBack className="w-3.5 h-3.5" />
                </motion.button>
                <div className="flex items-center gap-1">
                  {seekStepOptions.map((step) => (
                    <button
                      type="button"
                      key={step}
                      aria-pressed={seekStep === step}
                      onClick={() => onSeekStepChange(step)}
                      className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${seekStep === step ? "green-gradient text-white shadow-sm" : "text-foreground/50 hover:text-foreground"}`}
                    >
                      {step}秒
                    </button>
                  ))}
                </div>
                <motion.button type="button" aria-label="前进口令音频" whileTap={{ scale: 0.9 }} onClick={() => onAudioSeek("forward")} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-foreground/50 hover:text-foreground transition-all">
                  <SkipForward className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmEndDialog isOpen={showConfirmEnd} onClose={onCancelEnd} onConfirm={onConfirmEnd} onDiscard={onDiscardEnd} />
    </motion.div>
  )
}
