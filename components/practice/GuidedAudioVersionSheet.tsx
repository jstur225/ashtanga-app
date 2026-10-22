"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Volume2, X } from "lucide-react"
import type { GuidedAudioVariant } from "@/lib/guided-audio-variants"

interface GuidedAudioVersionSheetProps {
  isOpen: boolean
  variants: readonly GuidedAudioVariant[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function GuidedAudioVersionSheet({
  isOpen,
  variants,
  selectedId,
  onSelect,
  onClose,
}: GuidedAudioVersionSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="关闭口令版本选择"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[100]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-audio-version-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="guided-audio-version-title" className="text-lg font-serif text-foreground">选择口令版本</h2>
                <p className="mt-1 text-xs font-serif text-muted-foreground">一序列完整口令</p>
              </div>
              <button type="button" aria-label="关闭口令版本" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto overscroll-contain space-y-3 pr-1">
              {variants.map((variant) => {
                const selected = variant.id === selectedId
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(variant.id)}
                    className={`w-full min-h-[72px] rounded-2xl border px-4 py-3 flex items-center gap-3 text-left transition-all active:scale-[0.99] ${selected ? "border-primary/40 bg-primary/10 shadow-sm" : "border-border/50 bg-background hover:bg-secondary/60"}`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? "green-gradient text-white" : "bg-secondary text-primary"}`}>
                      <Volume2 className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-serif text-foreground">{variant.teacher}</span>
                      <span className="block mt-0.5 text-xs font-serif text-muted-foreground">{variant.note} · {variant.durationLabel}</span>
                    </span>
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {selected && <Check className="w-4 h-4" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
