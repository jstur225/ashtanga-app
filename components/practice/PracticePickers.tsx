"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MoonDayButton } from "@/components/journal/MoonDayButton"
import { MOON_DAYS_2026 } from "@/lib/moon-phase-data"

const NEW_MOON_ICON = '/moon-phase/new-moon.png'
const FULL_MOON_ICON = '/moon-phase/full-moon.png'

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getMoonPhaseMap() {
  const map: Record<string, { type: 'new' | 'full'; icon: string; name: string }> = {}
  MOON_DAYS_2026.forEach((moonDay) => {
    map[moonDay.date] = {
      type: moonDay.type,
      icon: moonDay.type === 'new' ? NEW_MOON_ICON : FULL_MOON_ICON,
      name: moonDay.type === 'new' ? '新月' : '满月',
    }
  })
  return map
}

export function ZenDatePicker({
  value,
  onChange,
  maxDate,
}: {
  value: string
  onChange: (date: string) => void
  maxDate?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const date = value ? parseLocalDate(value) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const maxDateValue = maxDate ? parseLocalDate(maxDate) : null
  const nextMonth = new Date(currentYear, currentMonth + 1, 1)
  const canGoNext = !maxDateValue || nextMonth <= new Date(maxDateValue.getFullYear(), maxDateValue.getMonth(), 1)

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = Array.from({ length: startDayOfWeek }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) days.push(day)
    return days
  }, [startDayOfWeek, daysInMonth])
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (maxDate && dateStr > maxDate) return
    onChange(dateStr)
    setIsOpen(false)
  }

  const selectedDate = value ? parseLocalDate(value) : null
  const displayValue = selectedDate ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日` : '选择日期'

  return (
    <div className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif text-left focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">{displayValue}</button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} data-testid="date-picker-backdrop" />
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-card rounded-[20px] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-50" role="dialog" aria-label="选择日期">
              <div className="flex items-center justify-between mb-3">
                <button type="button" aria-label="上个月" onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-sm font-serif text-foreground">{currentYear}年{currentMonth + 1}月</h3>
                <button type="button" aria-label="下个月" disabled={!canGoNext} onClick={() => canGoNext && setViewDate(nextMonth)} className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['日', '一', '二', '三', '四', '五', '六'].map((day) => <div key={day} className="text-center text-xs text-muted-foreground font-serif py-2">{day}</div>)}
                {calendarDays.map((day, index) => {
                  if (day === null) return <div key={`empty-${index}`} />
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const disabled = Boolean(maxDate && dateStr > maxDate)
                  return (
                    <MoonDayButton
                      key={dateStr}
                      day={day}
                      moonInfo={moonPhaseMap[dateStr]}
                      practiced={false}
                      onClick={() => !disabled && handleDayClick(day)}
                      className={`${dateStr === value ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' : 'text-foreground hover:bg-secondary'} ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
                    />
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ZenSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif text-left focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between">
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{selectedLabel || value || placeholder}</span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} data-testid="zen-select-backdrop" />
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-card rounded-[20px] p-2 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-50 max-h-[200px] overflow-y-auto" role="listbox">
              {options.map((option) => (
                <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onChange(option.value); setIsOpen(false) }} className={`w-full px-4 py-2.5 rounded-xl text-left font-serif transition-colors ${value === option.value ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' : 'text-foreground hover:bg-secondary'}`}>{option.label}</button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
