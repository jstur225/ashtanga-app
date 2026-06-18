"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { MoonDayButton } from "@/components/journal/MoonDayButton"
import type { PracticeOption, PracticeRecord } from "@/hooks/usePracticeData"
import { MOON_DAYS_2026 } from "@/lib/moon-phase-data"

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

export function DatePickerModal({
  isOpen,
  onClose,
  maxDate,
  practiceHistory = [],
}: {
  isOpen: boolean
  onClose: (date: string) => void
  maxDate?: string
  practiceHistory?: PracticeRecord[]
}) {
  const [viewDate, setViewDate] = useState(new Date())
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  const practiceMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((practice) => {
      map[practice.date] = true
    })
    return map
  }, [practiceHistory])

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

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    onClose(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[75]"
            onClick={() => onClose("")}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground font-semibold">选择日期</h2>
              <button
                type="button"
                onClick={() => onClose("")}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-serif text-foreground font-semibold">
                {currentYear}年{currentMonth + 1}月
              </h3>
              <button
                type="button"
                onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-serif py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={index} />
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const hasPractice = practiceMap[dateStr]
                const moonInfo = moonPhaseMap[dateStr]
                const hasBreakthrough = breakthroughMap[dateStr]

                return (
                  <MoonDayButton
                    key={index}
                    day={day}
                    moonInfo={moonInfo}
                    practiced={hasPractice}
                    hasBreakthrough={hasBreakthrough}
                    onClick={() => handleDayClick(day)}
                    className="bg-background text-foreground cursor-pointer hover:bg-secondary"
                  />
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function TypeSelectorModal({
  isOpen,
  onClose,
  practiceOptions,
  selectedType,
}: {
  isOpen: boolean
  onClose: (type: string) => void
  practiceOptions: PracticeOption[]
  selectedType?: string
}) {
  const handleOptionTap = (option: PracticeOption) => {
    const typeValue = option.notes ? `${option.label} ${option.notes}` : option.label
    onClose(typeValue)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[75]"
            onClick={() => onClose("")}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] flex flex-col max-h-[calc(100vh-2rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-serif text-foreground font-semibold">选择练习类型</h2>
              <button
                type="button"
                onClick={() => onClose("")}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-3 gap-3">
                {practiceOptions
                  .filter((option) => option.id !== "custom" && !option.is_fixed)
                  .map((option) => {
                    const displayName = option.label || ""
                    const displayNotes = option.notes || ""
                    const optionTypeValue = displayNotes ? `${displayName} ${displayNotes}` : displayName
                    const isSelected = selectedType === optionTypeValue

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOptionTap(option)}
                        className={`py-3 px-2 rounded-[20px] text-center font-serif transition-all duration-300 min-h-[80px] w-full flex flex-col items-center justify-center ${
                          isSelected
                            ? "green-gradient text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                            : "bg-card text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                        }`}
                      >
                        <span className="text-[14px] leading-snug break-words w-full">{displayName}</span>
                        {displayNotes && (
                          <span className={`text-[11px] mt-1 leading-snug break-words w-full line-clamp-1 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {displayNotes}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
              </div>
              <p className="text-center text-xs text-muted-foreground font-serif mt-6">点击选择练习类型</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
