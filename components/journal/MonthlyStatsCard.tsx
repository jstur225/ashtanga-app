"use client"

import { useMemo } from "react"
import type { PracticeRecord } from "@/hooks/usePracticeData"
import { calculateMonthlyJournalStats } from "@/lib/journal-utils"

interface MonthlyStatsCardProps {
  practiceHistory: PracticeRecord[]
  year: number
  month: number
  onClick?: () => void
}

export function MonthlyStatsCard({ practiceHistory, year, month, onClick }: MonthlyStatsCardProps) {
  const stats = useMemo(
    () => calculateMonthlyJournalStats(practiceHistory, year, month),
    [practiceHistory, year, month]
  )

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[20px] shadow-md border border-stone-200 overflow-hidden p-3 ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="text-2xl font-serif text-primary">{stats.practiceDays}</div>
          <div className="text-[10px] text-muted-foreground font-serif mt-1">熬汤天数</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-serif text-primary">{stats.totalMinutes}</div>
          <div className="text-[10px] text-muted-foreground font-serif mt-1">累计分钟</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-serif text-primary">{stats.avgMinutes}</div>
          <div className="text-[10px] text-muted-foreground font-serif mt-1">平均时长</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-serif text-orange-500">{stats.consecutiveWeeks}</div>
          <div className="text-[10px] text-muted-foreground font-serif mt-1">连续熬汤(周)</div>
        </div>
      </div>
    </div>
  )
}
