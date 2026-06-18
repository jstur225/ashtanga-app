"use client"

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Share2, Sparkles, User } from 'lucide-react'
import { toast } from 'sonner'
import type { PracticeRecord, UserProfile } from '@/hooks/usePracticeData'
import { trackEvent } from '@/lib/analytics'
import { captureWithFallback, formatErrorForUser } from '@/lib/screenshot'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface ShareCardModalProps {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  profile: UserProfile
  totalPracticeCount: number
  thisMonthDays: number
  totalHours: number
  onEditRecord: (id: string, notes: string, photos: string[], breakthrough?: string) => void
  onLogExport: (log: any) => void
  syncStatus?: SyncStatus
}

export function ShareCardModal({
  isOpen,
  onClose,
  record,
  profile,
  totalPracticeCount,
  thisMonthDays,
  totalHours,
  onLogExport,
}: ShareCardModalProps) {
  const [isCapturing] = useState(false)

  if (!record) return null

  const handleExportImage = async () => {
    const element = document.getElementById('share-card-content')
    if (!element) {
      toast.error('未找到分享卡片内容')
      return
    }

    const originalMaxHeight = element.style.maxHeight
    const originalOverflow = element.style.overflow
    const notesEl = element.querySelector('p') as HTMLElement | null
    const originalNotesMaxHeight = notesEl?.style.maxHeight

    try {
      toast.loading('正在生成图片...', { id: 'export' })

      element.style.maxHeight = 'none'
      element.style.overflow = 'visible'
      if (notesEl) notesEl.style.maxHeight = 'none'

      await new Promise(resolve => setTimeout(resolve, 100))

      const result = await captureWithFallback(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        filename: `ashtanga-${record.date || 'practice'}.png`,
        onLog: (log) => {
          onLogExport({
            ...log,
            timestamp: log.timestamp,
            success: log.success,
            userAgent: log.userAgent,
            recordDate: log.recordDate,
          })
        },
      })

      trackEvent('share_card_export', {
        export_method: result.method,
        export_success: result.success,
      })

      toast.dismiss('export')

      if (result.success) {
        toast.success('图片已保存')
        onClose()
      } else {
        toast.error(formatErrorForUser(result))
      }
    } catch {
      trackEvent('share_card_export', {
        export_method: 'error',
        export_success: false,
      })
      toast.dismiss('export')
      toast.error('导出失败，请重试')
    } finally {
      element.style.maxHeight = originalMaxHeight
      element.style.overflow = originalOverflow
      if (notesEl) notesEl.style.maxHeight = originalNotesMaxHeight || ''
    }
  }

  const formattedDate = new Date(record.date)
    .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '.')
  const durationMinutes = Math.floor(record.duration / 60)

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
            <div className="flex flex-col gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div
                id="share-card-content"
                className="bg-background rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
              >
                <div className="px-5 pt-5 pb-4 border-b border-border">
                  <div className="text-xs text-muted-foreground font-serif mb-1">
                    {formattedDate} / {record.type}
                  </div>
                  <div className="text-4xl font-serif font-bold text-foreground">
                    {durationMinutes} <span className="text-xl font-normal">分钟</span>
                  </div>
                  {record.breakthrough && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e67e22]/10 to-[#f39c12]/10 rounded-full border border-[#e67e22]/20">
                      <Sparkles className="w-4 h-4 text-[#e67e22]" />
                      <span className="text-sm font-serif font-bold text-[#e67e22]">{record.breakthrough}</span>
                    </div>
                  )}
                </div>

                <div className="px-5 py-6">
                  <p className={`text-sm text-foreground font-serif leading-relaxed whitespace-pre-wrap break-words ${
                    isCapturing ? 'max-h-none' : 'max-h-[50vh] overflow-y-auto'
                  }`}>
                    {record.notes || '今日练习完成'}
                  </p>

                  {record.photos && record.photos.length > 0 && (
                    <div className="mt-4 mx-auto w-[90%] space-y-3">
                      {record.photos.map((url, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`练习照片 ${index + 1}`}
                            className="w-full h-auto object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5 pt-2 border-t border-border">
                  <div className="grid grid-cols-3 gap-3 mb-4 pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {thisMonthDays} <span className="text-sm font-normal">天</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">本月练习</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {totalPracticeCount} <span className="text-sm font-normal">次</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">累计练习</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {totalHours} <span className="text-sm font-normal">小时</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">累计时长</div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 shrink-0 rounded-full bg-[#2d5a27] border border-[#2d5a27]/20 flex items-center justify-center overflow-hidden">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-serif text-[#e67e22]">{profile.name}</span>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] text-muted-foreground italic font-serif">{profile.signature}</span>
                          <span className="text-[10px] text-muted-foreground italic font-serif">练习日记</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
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
