import type { PracticeRecord } from "@/hooks/usePracticeData"

export interface MonthlyJournalStats {
  practiceDays: number
  totalMinutes: number
  avgMinutes: number
  consecutiveWeeks: number
}

export function calculateMonthlyJournalStats(
  practiceHistory: PracticeRecord[],
  year: number,
  month: number,
  today: Date = new Date()
): MonthlyJournalStats {
  const monthRecords = practiceHistory.filter((record) => {
    const date = new Date(record.date)
    return date.getFullYear() === year && date.getMonth() === month && record.duration > 0 && record.type !== "草稿"
  })

  const practiceDays = monthRecords.length
  const totalSeconds = monthRecords.reduce((acc, record) => acc + record.duration, 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const avgMinutes = practiceDays > 0 ? Math.round(totalMinutes / practiceDays) : 0

  const practiceDates = practiceHistory
    .filter((record) => record.duration > 0 && record.type !== "草稿")
    .map((record) => record.date)
    .filter((date, index, array) => array.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let consecutiveWeeks = 0
  if (practiceDates.length > 0) {
    const mostRecent = new Date(practiceDates[0])
    const daysSinceLastPractice = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastPractice <= 7) {
      let totalSpanDays = 1

      for (let index = 0; index < practiceDates.length - 1; index++) {
        const current = new Date(practiceDates[index])
        const next = new Date(practiceDates[index + 1])
        const gap = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))

        if (gap <= 7) {
          totalSpanDays += gap
        } else {
          break
        }
      }

      consecutiveWeeks = Math.ceil(totalSpanDays / 7)
    }
  }

  return {
    practiceDays,
    totalMinutes,
    avgMinutes,
    consecutiveWeeks,
  }
}
