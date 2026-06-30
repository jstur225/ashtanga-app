"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react"
import { MonthlyHeatmap } from "@/components/journal/MonthlyHeatmap"
import { MonthlyStatsCard } from "@/components/journal/MonthlyStatsCard"
import { MonthlyStatsShareModal } from "@/components/MonthlyStatsShareModal"
import { AddPracticeModal, EditRecordModal } from "@/components/practice-record/RecordModals"
import { ShareCardModal } from "@/components/ShareCardModal"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"
import { MOON_DAYS_2026 } from "@/lib/moon-phase-data"
import { cn } from "@/lib/utils"

type SyncStatus = "idle" | "syncing" | "success" | "error"

interface JournalTabProps {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  profile: UserProfile
  onEditRecord: (id: string, data: Partial<PracticeRecord>) => void
  onDeleteRecord: (id: string) => void
  onAddRecord: (record: Omit<PracticeRecord, "id" | "created_at" | "updated_at" | "photos">) => PracticeRecord
  onOpenFakeDoor: () => void
  onOpenVoiceFakeDoor?: () => void
  onOpenPhotoFakeDoor?: () => void
  onAddOption?: (name: string, notes: string) => void
  votedCloud: boolean
  onLogExport: (log: any) => void
  editingRecord: PracticeRecord | null
  onSetEditingRecord: (record: PracticeRecord | null) => void
  showAddModal: boolean
  onSetShowAddModal: (show: boolean) => void
  syncStatus: SyncStatus
  user: { email?: string | null } | null
  annotationMap?: Record<string, { label: string; color: string }[]>
  onOpenAnnotationManager?: () => void
  onJournalMonthChange?: (date: Date) => void
  onOpenXiaohongshuModal: () => void
  hasNewXhsMessage: boolean
  onReadInvite: () => void
  onShowMembershipPrompt?: () => void
  isPro?: boolean
}

const NEW_MOON_ICON = "/moon-phase/new-moon.png"
const FULL_MOON_ICON = "/moon-phase/full-moon.png"

function getMoonPhaseMap() {
  const map: Record<string, { type: "new" | "full"; icon: string; name: string }> = {}
  MOON_DAYS_2026.forEach((moonDay) => {
    map[moonDay.date] = {
      type: moonDay.type,
      icon: moonDay.type === "new" ? NEW_MOON_ICON : FULL_MOON_ICON,
      name: moonDay.type === "new" ? "新月" : "满月",
    }
  })
  return map
}

function formatTimelineDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatTimelineMinutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}`
}

function getTypeDisplayName(type: string) {
  return type.split(/\s+|-\s*/)[0]
}

export function JournalTab({
  practiceHistory,
  practiceOptions,
  profile,
  onEditRecord,
  onOpenFakeDoor,
  votedCloud,
  onLogExport,
  editingRecord,
  onSetEditingRecord,
  showAddModal,
  onSetShowAddModal,
  syncStatus,
  user,
  annotationMap,
  onOpenAnnotationManager,
  onJournalMonthChange,
  onOpenXiaohongshuModal,
  hasNewXhsMessage,
  onReadInvite,
  onDeleteRecord,
  onAddRecord,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  onShowMembershipPrompt,
  isPro,
}: JournalTabProps) {
  const [sharingRecordId, setSharingRecordId] = useState<string | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showStatsShare, setShowStatsShare] = useState(false)
  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [loadedMonths, setLoadedMonths] = useState<Date[]>([new Date()])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const earliestRecordMonth = useMemo(() => {
    const validRecords = practiceHistory.filter((record) => record.type !== "草稿" && record.duration > 0)
    if (validRecords.length === 0) return null

    const earliestDate = validRecords.reduce((earliest, record) => (
      new Date(record.date) < new Date(earliest.date) ? record : earliest
    ), validRecords[0])

    const date = new Date(earliestDate.date)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }, [practiceHistory])

  const hasReachedEarliest = earliestRecordMonth && loadedMonths.some((month) => (
    month.getFullYear() === earliestRecordMonth.getFullYear() &&
    month.getMonth() === earliestRecordMonth.getMonth()
  ))

  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])
  const dateToIdMap = useMemo(() => {
    const map: Record<string, string> = {}
    practiceHistory.forEach((record) => {
      map[record.date] = record.id
    })
    return map
  }, [practiceHistory])

  const sharingRecord = useMemo(() => (
    sharingRecordId ? practiceHistory.find((record) => record.id === sharingRecordId) || null : null
  ), [sharingRecordId, practiceHistory])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400)

      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      if (!isNearBottom || isLoadingMore) return

      const lastMonth = loadedMonths[loadedMonths.length - 1]
      const prevMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)
      const hasRecordsInPrevMonth = practiceHistory.some((record) => {
        const date = new Date(record.date)
        return date.getFullYear() === prevMonth.getFullYear() &&
          date.getMonth() === prevMonth.getMonth() &&
          record.type !== "草稿" &&
          record.duration > 0
      })

      if (hasRecordsInPrevMonth) {
        setIsLoadingMore(true)
        setLoadedMonths((prev) => [...prev, prevMonth])
        setTimeout(() => setIsLoadingMore(false), 300)
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [loadedMonths, isLoadingMore, practiceHistory])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const totalPracticeCount = practiceHistory.length + (profile.historical_days || 0)
  const today = new Date()
  const thisMonthDays = useMemo(() => {
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    return practiceHistory.filter((record) => {
      const date = new Date(record.date)
      return date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        record.duration > 0 &&
        record.type !== "草稿"
    }).length
  }, [practiceHistory, today])
  const totalHours = useMemo(() => {
    const localSeconds = practiceHistory.reduce((acc, record) => acc + record.duration, 0)
    const historicalMinutes = (profile.historical_days || 0) * (profile.historical_avg_minutes || 0)
    return Math.round((localSeconds / 60 + historicalMinutes) / 60)
  }, [practiceHistory, profile])

  const handleDayClick = (dateStr: string) => {
    const recordId = dateToIdMap[dateStr]
    const ref = recordId ? recordRefs.current[recordId] : null
    if (!ref) return

    setHighlightedDate(dateStr)
    ref.scrollIntoView({ behavior: "smooth", block: "center" })
    setTimeout(() => setHighlightedDate(null), 1000)
  }

  const handleShareCardEdit = (id: string, notes: string, photos: string[], breakthrough?: string) => {
    onEditRecord(id, {
      notes,
      photos,
      ...(breakthrough !== undefined && { breakthrough }),
    })
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24 pt-12 relative">
      <div className="px-6">
        {!user && (
          <p
            className="text-[11px] pl-4 mb-1.5 cursor-pointer"
            style={{ color: "#C1A268" }}
            onClick={onOpenFakeDoor}
          >
            👇绑定邮箱，免费领 31 天 Pro 会员（绑定后自动发放）
          </p>
        )}
        <MonthlyHeatmap
          practiceHistory={practiceHistory}
          practiceOptions={practiceOptions}
          onDayClick={handleDayClick}
          onOpenFakeDoor={onOpenFakeDoor}
          onAddRecord={() => onSetShowAddModal(true)}
          votedCloud={votedCloud}
          syncStatus={syncStatus}
          user={user}
          annotationMap={annotationMap}
          onOpenAnnotationManager={onOpenAnnotationManager}
          onOpenXiaohongshuModal={onOpenXiaohongshuModal}
          hasNewXhsMessage={hasNewXhsMessage}
          onReadInvite={onReadInvite}
          isPro={isPro}
          onMonthChange={(date) => {
            setLoadedMonths([date])
            onJournalMonthChange?.(date)
          }}
        />
      </div>

      <div className="px-6 mt-3">
        <MonthlyStatsCard
          practiceHistory={practiceHistory}
          year={loadedMonths[0].getFullYear()}
          month={loadedMonths[0].getMonth()}
          onClick={() => setShowStatsShare(true)}
        />
      </div>

      <div className="px-2 pb-10 mt-3">
        {practiceHistory
          .filter((practice) => {
            if (practice.type === "草稿") return false
            const date = new Date(practice.date)
            return loadedMonths.some((month) => (
              date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
            ))
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((practice, index) => (
            <motion.div
              key={practice.id}
              ref={(el) => { recordRefs.current[practice.id] = el }}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: highlightedDate === practice.date ? [
                  "0 0 0 rgba(230, 126, 34, 0)",
                  "0 0 30px rgba(230, 126, 34, 0.6)",
                  "0 0 0 rgba(230, 126, 34, 0)",
                ] : "0 0 0 rgba(45, 90, 39, 0)",
              }}
              transition={{
                opacity: { duration: 0.3, delay: index * 0.05 },
                y: { duration: 0.3, delay: index * 0.05 },
                boxShadow: {
                  duration: highlightedDate === practice.date ? 1.0 : 0,
                  delay: 0,
                  times: highlightedDate === practice.date ? [0, 0.5, 1] : undefined,
                },
              }}
              className="flex flex-col rounded-lg"
            >
              <div className="flex items-start rounded-lg">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSetEditingRecord(practice)
                  }}
                  className="w-[70px] flex-shrink-0 pr-3 pt-1 pb-1 text-right hover:bg-secondary/30 rounded-l-lg transition-colors"
                  style={{ borderRadius: "0.5rem 0 0 0.5rem" }}
                >
                  <div className="text-sm font-serif italic text-foreground leading-none">{formatTimelineDate(practice.date)}</div>
                  {practice.duration > 0 && (
                    <div className="flex items-center justify-end mt-1">
                      <span className="text-xs font-serif italic text-muted-foreground leading-none">{formatTimelineMinutes(practice.duration)}</span>
                      <span className="text-xs font-serif italic text-muted-foreground ml-0.5">分钟</span>
                    </div>
                  )}
                  <div className="text-[10px] font-serif italic text-muted-foreground mt-0.5">{getTypeDisplayName(practice.type)}</div>
                </button>

                <div className="w-[1px] bg-border flex-shrink-0 self-stretch relative">
                  <div className={`absolute mt-[10px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${moonPhaseMap[practice.date] ? "bg-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.8)]" : practice.breakthrough ? "bg-gradient-to-br from-[#e67e22] to-[#f39c12]" : "green-gradient-deep"}`} />
                </div>

                <div className="flex-1 pl-3 pr-8 pb-1">
                  {practice.breakthrough ? (
                    <div className="flex items-start gap-1 leading-snug mb-1 mt-[3px]">
                      <Sparkles className="w-3 h-3 text-[#e67e22] flex-shrink-0 mt-[2px]" />
                      <span className="text-sm font-serif font-bold text-[#e67e22] leading-snug">{practice.breakthrough}</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`打开 ${practice.date} 分享卡`}
                    data-testid="journal-record-share-trigger"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSharingRecordId(practice.id)
                    }}
                    className="w-full text-left hover:bg-secondary/30 rounded-lg transition-colors overflow-hidden"
                    style={{ borderRadius: "0 0.5rem 0.5rem 0" }}
                  >
                    <p className="text-sm text-foreground font-serif leading-snug whitespace-pre-wrap break-words w-full text-justify">
                      {practice.notes}
                    </p>
                    {practice.photos && practice.photos.length > 0 && (
                      <div className={cn("mt-2", practice.photos.length === 1 ? "w-[90%]" : "grid grid-cols-3 gap-1")}>
                        {practice.photos.map((url, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-md overflow-hidden border border-border/50 cursor-pointer",
                              practice.photos.length === 1 ? "w-full" : "aspect-square w-full"
                            )}
                            onClick={(event) => {
                              event.stopPropagation()
                              setPreviewImage(url)
                            }}
                          >
                            <img
                              src={url}
                              alt={`照片 ${idx + 1}`}
                              className={cn("w-full", practice.photos.length === 1 ? "h-auto" : "h-full object-cover")}
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground font-serif">加载中...</span>
          </div>
        )}

        {!isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            {hasReachedEarliest ? (
              <span className="text-sm text-muted-foreground font-serif">已经到底啦~</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const lastMonth = loadedMonths[loadedMonths.length - 1]
                  const prevMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)
                  setLoadedMonths((prev) => [...prev, prevMonth])
                }}
                className="text-sm text-muted-foreground font-serif hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span>查看更多</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => onSetEditingRecord(null)}
        record={editingRecord}
        onSave={onEditRecord}
        onDelete={onDeleteRecord}
        practiceOptions={practiceOptions}
        practiceHistory={practiceHistory}
        onChildModalOpen={() => {}}
        onOpenVoiceFakeDoor={onOpenVoiceFakeDoor}
        onOpenPhotoFakeDoor={onOpenPhotoFakeDoor}
        onShowMembershipPrompt={onShowMembershipPrompt}
        user={user}
        userProfile={profile}
        isPro={isPro}
      />

      <ShareCardModal
        isOpen={!!sharingRecord}
        onClose={() => setSharingRecordId(null)}
        record={sharingRecord}
        profile={profile}
        totalPracticeCount={totalPracticeCount}
        thisMonthDays={thisMonthDays}
        totalHours={totalHours}
        onEditRecord={handleShareCardEdit}
        onLogExport={onLogExport}
        syncStatus={syncStatus}
      />

      <AddPracticeModal
        isOpen={showAddModal}
        onClose={() => onSetShowAddModal(false)}
        onSave={onAddRecord}
        addRecord={onAddRecord}
        updateRecord={onEditRecord}
        deleteRecord={onDeleteRecord}
        onDeleteDraft={onDeleteRecord}
        practiceOptions={practiceOptions}
        practiceHistory={practiceHistory}
        onChildModalOpen={() => {}}
        onOpenVoiceFakeDoor={onOpenVoiceFakeDoor}
        onOpenPhotoFakeDoor={onOpenPhotoFakeDoor}
        onShowMembershipPrompt={onShowMembershipPrompt}
        user={user}
        userProfile={profile}
        isPro={isPro}
      />

      <MonthlyStatsShareModal
        isOpen={showStatsShare}
        onClose={() => setShowStatsShare(false)}
        practiceHistory={practiceHistory}
        year={loadedMonths[0]?.getFullYear() || new Date().getFullYear()}
        month={loadedMonths[0]?.getMonth() || new Date().getMonth()}
        profile={profile}
      />

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onClick={scrollToTop}
            className="fixed bottom-32 right-10 z-40 w-14 h-14 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(45,90,39,0.4)] flex items-center justify-center text-white hover:shadow-[0_8px_40px_rgba(45,90,39,0.5)] transition-shadow active:scale-95"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setPreviewImage(null)}
            />
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 right-4 z-[80] w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white transition-colors shadow-lg"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </motion.button>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setPreviewImage(null)}
            >
              <img
                src={previewImage}
                alt="预览"
                className="w-[90%] max-w-[900px] h-auto object-contain rounded-2xl my-auto"
                onClick={(event) => event.stopPropagation()}
                draggable={false}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
