import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"
import { getEffectiveOptionColor } from "@/lib/sync-utils"

export interface CurrentMonthStats {
  practiceDays: number
  totalMinutes: number
  avgDuration: number
}

export interface TotalPracticeStats {
  localDays: number
  totalDays: number
  totalHours: number
  avgMinutes: number
}

export interface HeatmapDot {
  date: string
  count: number
  colorLevel: number
}

export interface MonthGroup {
  monthKey: string
  monthLabel: string
  days: HeatmapDot[]
}

export function getLocalDateStr(dateInput?: Date | string): string {
  const now = dateInput ? new Date(dateInput) : new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function maskEmail(email: string): string {
  if (!email) return ""

  const [username, domain] = email.split("@")
  if (!username || !domain) return email

  if (username.length <= 6) {
    return `${username.slice(0, 3)}***@${domain}`
  }

  return `${username.slice(0, 3)}****${username.slice(-3)}@${domain}`
}

export function calculateCurrentMonthStats(records: PracticeRecord[], today: Date): CurrentMonthStats {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const todayStr = getLocalDateStr(today)
  let practiceDays = 0
  let totalSeconds = 0

  records.forEach((record) => {
    const date = new Date(record.date)
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && record.date <= todayStr) {
      if (record.duration > 0) {
        practiceDays++
        totalSeconds += record.duration
      }
    }
  })

  return {
    practiceDays,
    totalMinutes: Math.round(totalSeconds / 60),
    avgDuration: practiceDays > 0 ? Math.round(totalSeconds / practiceDays / 60) : 0,
  }
}

export function calculateTotalStats(records: PracticeRecord[], profile: UserProfile): TotalPracticeStats {
  let localDays = 0
  let localSeconds = 0

  records.forEach((record) => {
    if (record.duration > 0) {
      localDays++
      localSeconds += record.duration
    }
  })

  const historicalDays = profile.historical_days || 0
  const historicalAvgMinutes = profile.historical_avg_minutes || 0
  const totalDays = localDays + historicalDays
  const localMinutes = Math.round(localSeconds / 60)
  const historicalMinutes = historicalDays * historicalAvgMinutes
  const totalMinutes = localMinutes + historicalMinutes

  return {
    localDays,
    totalDays,
    totalHours: Math.round(totalMinutes / 60),
    avgMinutes: totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0,
  }
}

export function buildYearMonthGroups(
  records: PracticeRecord[],
  options: PracticeOption[],
  isPro: boolean,
  year: number
): MonthGroup[] {
  const typeColorMap: Record<string, number> = {}
  options.forEach((option) => {
    typeColorMap[option.label] = getEffectiveOptionColor(options, option.label, isPro)
  })

  const dayDataMap = new Map<string, { totalSeconds: number; maxColorLevel: number }>()
  records.forEach((record) => {
    const prev = dayDataMap.get(record.date) ?? { totalSeconds: 0, maxColorLevel: 0 }
    prev.totalSeconds += record.duration
    const level = record.color_level ?? typeColorMap[record.type] ?? 3
    if (level > prev.maxColorLevel) {
      prev.maxColorLevel = level
    }
    dayDataMap.set(record.date, prev)
  })

  const groups = new Map<string, HeatmapDot[]>()
  const cursor = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)

  while (cursor <= endDate) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    if (!groups.has(monthKey)) {
      groups.set(monthKey, [])
    }

    const dateStr = getLocalDateStr(cursor)
    const data = dayDataMap.get(dateStr)
    groups.get(monthKey)!.push({
      date: dateStr,
      count: Math.round((data?.totalSeconds ?? 0) / 60),
      colorLevel: data?.maxColorLevel ?? 0,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, days]) => ({
      monthKey,
      monthLabel: `${parseInt(monthKey.split("-")[1])}月`,
      days,
    }))
}
