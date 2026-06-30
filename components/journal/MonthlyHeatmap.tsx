"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Cloud, MessageCircle, Pencil, Plus } from "lucide-react"
import { MoonDayButton } from "@/components/journal/MoonDayButton"
import type { PracticeOption, PracticeRecord } from "@/hooks/usePracticeData"
import { MOON_DAYS_2026 } from "@/lib/moon-phase-data"
import { getEffectiveOptionColor } from "@/lib/sync-utils"
import { getLocalDateStr } from "@/lib/stats-utils"

const NEW_MOON_ICON = "/moon-phase/new-moon.png"
const FULL_MOON_ICON = "/moon-phase/full-moon.png"

type SyncStatus = "idle" | "syncing" | "success" | "error"

interface MonthlyHeatmapProps {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  onDayClick: (dateStr: string) => void
  onOpenFakeDoor: () => void
  onAddRecord: () => void
  votedCloud: boolean
  syncStatus: SyncStatus
  user: unknown
  onMonthChange?: (date: Date) => void
  annotationMap?: Record<string, { label: string; color: string }[]>
  onOpenAnnotationManager?: () => void
  onOpenXiaohongshuModal: () => void
  hasNewXhsMessage: boolean
  onReadInvite: () => void
  onShowMembershipPrompt?: () => void
  isPro?: boolean
}

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

function SyncButton({
  onOpenFakeDoor,
  syncStatus,
  hasVoted,
}: {
  onOpenFakeDoor: () => void
  syncStatus: SyncStatus
  hasVoted: boolean
}) {
  const [isClickSpinning, setIsClickSpinning] = useState(false)

  const handleClick = () => {
    setIsClickSpinning(true)
    setTimeout(() => setIsClickSpinning(false), 1000)
    setTimeout(() => {
      onOpenFakeDoor()
    }, 100)
  }

  const getStatusColor = () => {
    if (!hasVoted) return "bg-red-400"
    if (syncStatus === "syncing") return "bg-blue-400"
    if (syncStatus === "success") return "bg-green-400"
    if (syncStatus === "error") return "bg-red-400"
    return "bg-stone-400"
  }

  const shouldSpin = syncStatus === "syncing" || isClickSpinning

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative w-7 h-7 rounded-full backdrop-blur-md border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center transition-all ${
        hasVoted ? "green-gradient" : "bg-stone-400"
      }`}
    >
      <motion.div
        animate={shouldSpin ? { rotate: 360 } : { rotate: 0 }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
          repeat: syncStatus === "syncing" ? Infinity : isClickSpinning ? 1 : 0,
        }}
      >
        <Cloud className={`w-3.5 h-3.5 ${hasVoted ? "text-[#FAF7F2]" : "text-stone-200"}`} />
      </motion.div>
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 ${getStatusColor()}`} />
    </button>
  )
}

export function MonthlyHeatmap({
  practiceHistory,
  practiceOptions,
  onDayClick,
  onOpenFakeDoor,
  onAddRecord,
  syncStatus,
  user,
  onMonthChange,
  annotationMap,
  onOpenAnnotationManager,
  onOpenXiaohongshuModal,
  hasNewXhsMessage,
  onReadInvite,
  isPro,
}: MonthlyHeatmapProps) {
  const today = new Date()
  const todayStr = getLocalDateStr()
  const [viewDate, setViewDate] = useState(today)
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  const typeColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    practiceOptions.forEach((option) => {
      map[option.label] = getEffectiveOptionColor(practiceOptions, option.label, !!isPro)
    })
    return map
  }, [practiceOptions, isPro])

  const practiceMap = useMemo(() => {
    const map: Record<string, { practiced: boolean; colorLevel: number }> = {}
    practiceHistory.forEach((practice) => {
      const existing = map[practice.date]
      const level = practice.color_level ?? typeColorMap[practice.type] ?? 3
      if (!existing || level > existing.colorLevel) {
        map[practice.date] = { practiced: true, colorLevel: level }
      }
    })
    return map
  }, [practiceHistory, typeColorMap])

  const breakthroughMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((practice) => {
      if (practice.breakthrough) {
        map[practice.date] = true
      }
    })
    return map
  }, [practiceHistory])

  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])
  const [moonDayDialog, setMoonDayDialog] = useState<{
    open: boolean
    type: "new" | "full" | null
  }>({ open: false, type: null })

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let index = 0; index < startDayOfWeek; index++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [startDayOfWeek, daysInMonth])

  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1)
    setViewDate(newDate)
    onMonthChange?.(newDate)
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    setViewDate(nextMonth)
    onMonthChange?.(nextMonth)
  }

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    if (moonPhaseMap[dateStr] && !practiceMap[dateStr]?.practiced) {
      setMoonDayDialog({
        open: true,
        type: moonPhaseMap[dateStr].type,
      })
      return
    }

    if (practiceMap[dateStr]?.practiced) {
      onDayClick(dateStr)
    }
  }

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]

  return (
    <div className="bg-white rounded-[20px] mb-3 shadow-md border border-stone-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-stone-100 bg-lime-50">
        <div className="flex items-center gap-1.5">
          <SyncButton onOpenFakeDoor={onOpenFakeDoor} syncStatus={syncStatus} hasVoted={!!user} />
          <button
            type="button"
            onClick={() => {
              onReadInvite()
              onOpenXiaohongshuModal()
            }}
            className="relative w-7 h-7 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
            aria-label="小红书群邀请"
          >
            <MessageCircle className="w-[11px] h-[11px] -translate-y-[2px]" />
            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 ${hasNewXhsMessage ? "bg-red-400" : "bg-green-400"}`} />
          </button>
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="w-7 h-7 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <h3 className="font-serif text-foreground font-semibold text-base text-center flex-1">
          {currentYear}年{currentMonth + 1}月
        </h3>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToNextMonth}
            className="w-7 h-7 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {onOpenAnnotationManager && (
            <button
              type="button"
              onClick={onOpenAnnotationManager}
              className="w-7 h-7 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onAddRecord}
            aria-label="补录练习"
            data-testid="journal-add-record"
            className="w-7 h-7 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_6px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[2px] p-4">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[9px] text-muted-foreground font-serif py-0.5">
            {day}
          </div>
        ))}
        {calendarDays.map((day, index) => {
          const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : ""
          const practiced = day ? !!practiceMap[dateStr]?.practiced : false
          const isPast = day ? dateStr <= todayStr : false
          const moonInfo = day ? moonPhaseMap[dateStr] : null
          const hasBreakthrough = day ? breakthroughMap[dateStr] : false
          const annotationColors = day && annotationMap?.[dateStr] ? annotationMap[dateStr].map((annotation) => annotation.color) : []

          return (
            <MoonDayButton
              key={index}
              day={day}
              moonInfo={moonInfo}
              practiced={practiced}
              isPast={isPast}
              hasBreakthrough={hasBreakthrough}
              annotationColors={annotationColors}
              colorLevel={practiceMap[dateStr]?.colorLevel}
              onClick={() => handleDayClick(day)}
              disabled={!moonInfo && !practiced}
              className={!moonInfo && !practiced ? (day === null ? "bg-transparent" : isPast ? "bg-background text-foreground" : "bg-background text-muted-foreground/50") : ""}
            />
          )
        })}
      </div>

      <AnimatePresence>
        {moonDayDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[100]"
              onClick={() => setMoonDayDialog({ open: false, type: null })}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-[20px] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.15)] z-[110] min-w-[280px]"
            >
              <div className="text-center">
                <h3 className="text-lg font-serif text-foreground mb-2">
                  {moonDayDialog.type === "new" ? "新月Moon Day🌑" : "满月Moon Day🌕"}
                </h3>
                <p className="text-sm text-muted-foreground font-serif mb-4 leading-relaxed">
                  建议暂停练习
                  <br />
                  提前安排练习时间
                </p>
                <button
                  type="button"
                  onClick={() => setMoonDayDialog({ open: false, type: null })}
                  className="w-full py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
