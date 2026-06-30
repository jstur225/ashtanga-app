"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { AccountSyncSection } from "@/components/settings/AccountSyncSection"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"

interface AccountSyncModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  practiceHistory: PracticeRecord[]
  practiceOptionsData: PracticeOption[]
  onOpenLoginModal: () => void
  onOpenRegisterModal: () => void
  onShowClearDataConfirm?: () => void
  onUpdateProfile?: (profile: UserProfile) => void
  user?: unknown
}

export function AccountSyncModal({
  isOpen,
  onClose,
  profile,
  practiceHistory,
  practiceOptionsData,
  onOpenLoginModal,
  onOpenRegisterModal,
  onShowClearDataConfirm,
  onUpdateProfile,
  user,
}: AccountSyncModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-serif text-foreground">账户同步</h2>
              <button
                type="button"
                aria-label="关闭账户同步"
                onClick={onClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AccountSyncSection
              profile={profile}
              practiceHistory={practiceHistory}
              practiceOptionsData={practiceOptionsData}
              onClose={onClose}
              onOpenLoginModal={onOpenLoginModal}
              onOpenRegisterModal={onOpenRegisterModal}
              onShowClearDataConfirm={onShowClearDataConfirm}
              onUpdateProfile={onUpdateProfile}
              user={user}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
