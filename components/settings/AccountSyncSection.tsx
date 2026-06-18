"use client"

import { AccountBindingSection } from "@/components/AccountBindingSection"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"

export interface AccountSyncSectionProps {
  profile: UserProfile
  practiceHistory?: PracticeRecord[]
  practiceOptionsData?: PracticeOption[]
  onClose: () => void
  onOpenLoginModal?: () => void
  onOpenRegisterModal?: () => void
  onShowClearDataConfirm?: () => void
  onUpdateProfile?: (profile: UserProfile) => void
  user?: unknown
}

export function AccountSyncSection({
  profile,
  practiceHistory,
  practiceOptionsData,
  onClose,
  onOpenLoginModal,
  onOpenRegisterModal,
  onShowClearDataConfirm,
  onUpdateProfile,
  user,
}: AccountSyncSectionProps) {
  return (
    <AccountBindingSection
      profile={profile}
      localData={{
        records: practiceHistory ?? [],
        options: practiceOptionsData ?? [],
      }}
      onSyncComplete={(data) => {
        if (process.env.NODE_ENV === "development") {
          console.log("Sync completed:", data)
        }
        if (data?.profile) {
          if (process.env.NODE_ENV === "development") {
            console.log("更新本地 profile:", data.profile)
          }
          onUpdateProfile?.(data.profile)
        }
      }}
      onClose={onClose}
      onOpenLoginModal={onOpenLoginModal ?? (() => {})}
      onOpenRegisterModal={onOpenRegisterModal ?? (() => {})}
      onShowClearDataConfirm={onShowClearDataConfirm ?? (() => {})}
      user={user}
    />
  )
}
