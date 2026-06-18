"use client"

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Share2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { PracticeRecord, UserProfile } from '@/hooks/usePracticeData'
import { captureWithFallback, formatErrorForUser } from '@/lib/screenshot'

interface MonthlyStatsShareModalProps {
  isOpen: boolean
  onClose: () => void
  practiceHistory: PracticeRecord[]
  year: number
  month: number
  profile: UserProfile
}

export function MonthlyStatsShareModal({
  isOpen,
  onClose,
  practiceHistory,
  year,
  month,
  profile,
}: MonthlyStatsShareModalProps) {
  const { stats, calendarDays } = useMemo(() => {
    const monthRecords = practiceHistory.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === month && r.duration > 0 && r.type !== '草稿'
    })

    const totalSeconds = monthRecords.reduce((acc, r) => acc + r.duration, 0)
    const totalHours = Math.round(totalSeconds / 3600)
    const breathCount = Math.round(totalSeconds / 6)
    const photosynthesisCount = breathCount * 144

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const practiceMap: Record<number, boolean> = {}
    monthRecords.forEach(r => {
      practiceMap[new Date(r.date).getDate()] = true
    })

    const days: { day: number | null; practiced: boolean }[] = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, practiced: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, practiced: !!practiceMap[day] })
    }

    return {
      stats: { totalHours, breathCount, photosynthesisCount },
      calendarDays: days,
    }
  }, [practiceHistory, year, month])

  const formatNumber = (num: number) => num.toLocaleString('zh-CN')

  const handleExportImage = async () => {
    const element = document.getElementById('monthly-stats-share-content')
    if (!element) {
      toast.error('未找到分享卡片内容')
      return
    }

    try {
      toast.loading('正在生成图片...', { id: 'export-monthly' })

      const result = await captureWithFallback(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        filename: `ashtanga-monthly-${year}-${String(month + 1).padStart(2, '0')}.png`,
      })

      toast.dismiss('export-monthly')

      if (result.success) {
        toast.success('图片已保存')
        onClose()
      } else {
        toast.error(formatErrorForUser(result))
      }
    } catch {
      toast.dismiss('export-monthly')
      toast.error('导出失败，请重试')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <div className="flex flex-col gap-3 items-center" onClick={(e) => e.stopPropagation()}>
              <div id="monthly-stats-share-content" className="relative w-[320px] rounded-3xl shadow-2xl overflow-hidden bg-white">
                <div className="flex flex-col p-6">
                  <div className="flex items-end justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>{year}年</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-bold" style={{ color: '#2d5a27' }}>{month + 1}</span>
                        <span className="text-base font-serif" style={{ color: '#2d5a27' }}>月</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>已累计练习</div>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-4xl font-serif font-bold" style={{ color: '#2d5a27' }}>{stats.totalHours}</span>
                        <span className="text-base font-serif" style={{ color: '#2d5a27' }}>小时</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-7 gap-1 justify-items-center">
                      {calendarDays.map((item, idx) => (
                        <div
                          key={idx}
                          className={`w-8 h-8 shrink-0 rounded-full ${
                            item.day === null
                              ? ''
                              : item.practiced
                                ? 'green-gradient-deep border border-white/20'
                                : 'bg-stone-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-4">
                    <div className="text-left">
                      <div className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>相当于</div>
                      <div className="text-2xl font-serif font-bold" style={{ color: '#2d5a27' }}>{formatNumber(stats.breathCount)}</div>
                      <div className="text-xs font-serif" style={{ color: '#2d5a27' }}>次深呼吸</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: '#2d5a27' }}>
                          <path d="M12 2L4 10h4v4h8v-4h4L12 2z" fill="currentColor" />
                          <path d="M12 6L6 12h3v6h6v-6h3L12 6z" fill="currentColor" />
                        </svg>
                        <span className="text-xs font-serif" style={{ color: '#2d5a27' }}>像一棵树进行了</span>
                      </div>
                      <div className="text-2xl font-serif font-bold text-orange-500">{formatNumber(stats.photosynthesisCount)}</div>
                      <div className="text-xs font-serif" style={{ color: '#2d5a27' }}>次光合作用</div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-4">
                    <div className="flex items-end gap-2 min-w-0">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="头像" className="w-8 h-8 shrink-0 rounded-full object-cover border border-stone-200" />
                      ) : (
                        <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-serif font-medium text-stone-800 truncate">{profile.name}</span>
                        <span className="text-[10px] font-serif text-stone-400 truncate">{profile.signature}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-serif text-stone-400 shrink-0">练习日记</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-[320px]" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onClose()
                  }}
                  className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
                >
                  返回
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleExportImage()
                  }}
                  className="flex-1 py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  保存图片
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
