"use client"

import { AnimatePresence, motion } from "framer-motion"

export function BreathingRipples({ isPaused }: { isPaused: boolean }) {
  if (isPaused) return null

  return (
    <>
      <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ripple" />
      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ripple-delayed" />
    </>
  )
}

export function ConfirmEndDialog({
  isOpen,
  onClose,
  onConfirm,
  onDiscard,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onDiscard: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={onClose}
            data-testid="confirm-end-backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-3xl z-[70] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] w-[calc(100%-48px)] max-w-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-end-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="关闭结束确认"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <h2 id="confirm-end-title" className="text-lg font-serif text-foreground text-center mb-2">结束练习？</h2>
            <p className="text-muted-foreground text-center text-sm mb-6 font-serif">选择保存或丢弃这次记录</p>

            <div className="flex gap-3">
              <button type="button" onClick={onDiscard} className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]">
                不保存退出
              </button>
              <button type="button" onClick={onConfirm} className="flex-1 py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]">
                保存并退出
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
