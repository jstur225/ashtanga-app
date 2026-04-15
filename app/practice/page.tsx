"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useLocalStorage, useInterval } from 'react-use';
import { motion, AnimatePresence } from "framer-motion"
import { usePracticeData, type PracticeRecord, type PracticeOption, type UserProfile, GUIDED_AUDIO_OPTION, MAX_SLOTS_FREE } from "@/hooks/usePracticeData"
import { useMembership } from "@/hooks/useMembership"
import { usePWAInstall } from "@/hooks/usePWAInstall"
import { useAuth } from "@/hooks/useAuth"
import { useSync } from "@/hooks/useSync"
import { BookOpen, BarChart3, Calendar, X, Camera, Pause, Play, Trash2, User, Settings, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Cloud, Download, Upload, Plus, Minus, Share2, Sparkles, Check, Copy, ClipboardPaste, MessageCircle, Bug, AlertCircle, SkipBack, SkipForward, Volume, Crown, Ticket } from "lucide-react"
import { cn } from '@/lib/utils'
import { FakeDoorModal } from "@/components/FakeDoorModal"
import { VoiceButton } from "@/components/VoiceButton"
import { PracticeForm, type PracticeFormData } from "@/components/PracticeForm"
import { PhotoUploadButton } from "@/components/PhotoUploadButton"
import { ImportModal } from "@/components/ImportModal"
import { ExportModal } from "@/components/ExportModal"
import { XiaohongshuInviteModal, INVITE_VERSION } from "@/components/XiaohongshuInviteModal"
import { PWAInstallBanner } from "@/components/PWAInstallBanner"
import { PWAInstallTutorialModal } from "@/components/PWAInstallTutorialModal"
import { AccountBindingSection } from "@/components/AccountBindingSection"
import { AuthModal } from "@/components/AuthModal"
import { DataConflictModal } from "@/components/DataConflictModal"
import { DebugLogModal } from "@/components/DebugLogModal"
import { toast } from 'sonner'
import { trackEvent, setUserProfile } from '@/lib/analytics'
import { captureWithFallback, formatErrorForUser } from '@/lib/screenshot'
import { MOON_DAYS_2026 } from '@/lib/moon-phase-data'
import { ActivateModal } from '@/components/Membership/ActivateModal'
import { supabase } from '@/lib/supabase'
import { deletePracticeRecord } from '@/lib/database'
import { useRouter } from 'next/navigation'
import { getVersionInfo } from '@/lib/version'
import { audioCache } from '@/lib/audioCache'

// 月相图标路径
const NEW_MOON_ICON = '/moon-phase/new-moon.png'
const FULL_MOON_ICON = '/moon-phase/full-moon.png'

// 月相查找函数
const getMoonPhaseMap = () => {
  const map: Record<string, { type: 'new' | 'full'; icon: string; name: string }> = {}
  MOON_DAYS_2026.forEach(moonDay => {
    map[moonDay.date] = {
      type: moonDay.type,
      icon: moonDay.type === 'new' ? NEW_MOON_ICON : FULL_MOON_ICON,
      name: moonDay.type === 'new' ? '新月' : '满月'
    }
  })
  return map
}

// Helper functions
function getLocalDateStr(dateInput?: Date | string) {
  const now = dateInput ? new Date(dateInput) : new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}`
}

function formatSeconds(seconds: number): string {
  const remainingSeconds = seconds % 60
  return `${remainingSeconds.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} 分钟`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

// Zen-style Custom Date Picker Component
function ZenDatePicker({
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
    const d = value ? new Date(value) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const today = maxDate ? new Date(maxDate) : new Date()
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [startDayOfWeek, daysInMonth])

  // 月相Map
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const goToPreviousMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    setViewDate(nextMonth)
  }

  const canGoNext = true

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setIsOpen(false)
  }

  const selectedDateStr = value
  const displayValue = value ? `${new Date(value).getFullYear()}年${new Date(value).getMonth() + 1}月${new Date(value).getDate()}日` : '选择日期'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif text-left focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      >
        {displayValue}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card rounded-[20px] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-serif text-foreground">
                  {currentYear}年{currentMonth + 1}月
                </h3>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-serif py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={idx} />
                  }
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = dateStr === selectedDateStr
                  const moonInfo = moonPhaseMap[dateStr]

                  return (
                    <MoonDayButton
                      key={idx}
                      day={day}
                      moonInfo={moonInfo}
                      practiced={false}
                      onClick={() => handleDayClick(day)}
                      className={isSelected ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' : 'text-foreground hover:bg-secondary'}
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

// 月相日期按钮组件（供三个日历共用）
function MoonDayButton({
  day,
  moonInfo,
  practiced,
  isPast,
  hasBreakthrough,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  day: number | null
  moonInfo: { type: 'new' | 'full'; icon: string; name: string } | null
  practiced: boolean
  isPast?: boolean
  hasBreakthrough?: boolean
}) {
  // 修复：已练习的月相日期应该优先显示绿色，而不是月相图标
  const isMoonDayNotPracticed = moonInfo && !practiced
  const isFutureMoonDay = moonInfo && !practiced && isPast === false

  return (
    <button
      {...props}
      className={`aspect-square rounded-full flex items-center justify-center text-[9px] font-serif transition-all relative ${
        // 已练习：绿色背景（优先级最高）
        practiced
          ? 'green-gradient-deep border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.3)] text-white cursor-pointer hover:shadow-[0_2px_12px_rgba(45,90,39,0.45)]'
          : isMoonDayNotPracticed
            ? 'bg-background border-0' // 未练习月相日期：灰色圆圈背景
            : className || ''
      } ${!practiced && !moonInfo && isPast === false ? 'text-muted-foreground/50' : ''}`}
      style={
        // 只有未练习的月相日期才显示月相图标背景
        isMoonDayNotPracticed ? {
          backgroundImage: `url(${moonInfo!.icon})`,
          backgroundSize: '105%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          boxShadow: 'none'
        } : undefined
      }
    >
      {/* 日期数字 - 未来月相日期显示灰色，过去月相日期显示黑色 */}
      <span className={`relative z-10 ${isFutureMoonDay ? 'text-muted-foreground/50' : ''}`}>{day}</span>

      {/* 月相日期且已练习：显示黄色小亮点 */}
      {moonInfo && practiced && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FFE066] rounded-full z-20 shadow-[0_0_6px_rgba(255,224,102,0.8)]" />
      )}

      {/* 突破日：显示橙色小亮点（非月相日期） */}
      {hasBreakthrough && !moonInfo && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#e67e22] rounded-full z-20 shadow-[0_0_6px_rgba(230,126,34,0.8)]" />
      )}
    </button>
  )
}

// Custom Practice Modal (for adding new custom option)
function CustomPracticeModal({
  isOpen,
  onClose,
  onConfirm,
  isFull,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, notes: string) => void
  isFull: boolean
}) {
  const [practiceName, setPracticeName] = useState("")
  const [notes, setNotes] = useState("")

  const handleConfirm = () => {
    if (practiceName.trim()) {
      onConfirm(practiceName.slice(0, 10), notes.slice(0, 14))
      setPracticeName("")
      setNotes("")
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
            className="fixed inset-0 bg-black/30 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">自定义练习</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isFull ? (
              <div className="text-center py-8">
                <p className="text-foreground font-serif mb-2">选项已满（当前版本最多4个）</p>
                <p className="text-muted-foreground text-sm font-serif">请双击删除旧选项后再添加</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">
                    练习名称 <span className="text-muted-foreground text-xs">（最多10字）</span>
                  </label>
                  <input
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value.slice(0, 10))}
                    placeholder="例如：三序列、恢复性..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{practiceName.length}/10</div>
                </div>

                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">
                    备注 <span className="text-muted-foreground text-xs">（最多14字）</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 14))}
                    placeholder="简短描述..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/14</div>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={!practiceName.trim()}
                  className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] backdrop-blur-sm"
                >
                  添加选项
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Edit Option Modal (for editing/deleting existing options)
function EditOptionModal({
  isOpen,
  onClose,
  option,
  onSave,
  onDelete,
  canDelete,
}: {
  isOpen: boolean
  onClose: () => void
  option: PracticeOption | null
  onSave: (id: string, name: string, notes: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (option) {
      setName(option.label)
      setNotes(option.notes || "")
    }
  }, [option])

  const handleSave = () => {
    if (option && name.trim()) {
      onSave(option.id, name.slice(0, 10), notes.slice(0, 14))
      onClose()
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (option) {
      onDelete(option.id)
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && option && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">编辑选项</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-4">
                <p className="text-center font-serif text-foreground">确定要删除"{name}"吗？</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 rounded-full font-serif transition-all active:scale-[0.98] bg-red-500 text-white shadow-md hover:bg-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">
                    名称 <span className="text-muted-foreground text-xs">（最多10字）</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 10))}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{name.length}/10</div>
                </div>

                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">
                    备注 <span className="text-muted-foreground text-xs">（最多14字）</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 14))}
                    placeholder="简短描述..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/14</div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                >
                  保存
                </button>

                {canDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="w-full py-3 rounded-full bg-transparent text-destructive font-serif transition-all hover:bg-destructive/10 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除选项
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


// Edit Record Modal (for editing/deleting practice records) - 使用 PracticeForm
function EditRecordModal({
  isOpen,
  onClose,
  record,
  onSave,
  onDelete,
  practiceOptions,
  practiceHistory = [],
  onChildModalOpen,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  user,
  userProfile,
}: {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  onSave: (id: string, data: Partial<PracticeRecord>) => void
  onDelete: (id: string) => void
  onOpenVoiceFakeDoor?: () => void
  onOpenPhotoFakeDoor?: () => void
  practiceOptions: PracticeOption[]
  practiceHistory?: PracticeRecord[]
  onChildModalOpen?: (open: boolean) => void
  user?: { email?: string | null } | null
  userProfile?: UserProfile | null
}) {
  // ⭐ 从最新的 practiceHistory 中获取记录数据（避免照片上传后数据过时）
  const latestRecord = useMemo(() => {
    if (!record) return null
    return practiceHistory.find(r => r.id === record.id) || record
  }, [record, practiceHistory])

  // 子模态框状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  // 表单数据状态（用于 PracticeForm）
  const [formData, setFormData] = useState({
    date: '',
    type: '',
    duration: 60,
    notes: '',
    breakthrough: undefined as string | undefined,
  })

  // 当记录变化时，同步表单数据
  useEffect(() => {
    if (latestRecord) {
      setFormData({
        date: latestRecord.date,
        type: latestRecord.type,
        duration: Math.floor(latestRecord.duration / 60), // 转换为分钟
        notes: latestRecord.notes || '',
        breakthrough: latestRecord.breakthrough,
      })
    }
  }, [latestRecord])

  const handleSave = (data: PracticeFormData) => {
    if (latestRecord) {
      onSave(latestRecord.id, {
        date: data.date,
        type: data.type,
        duration: data.duration * 60, // 转换为秒
        notes: data.notes,
        breakthrough: data.breakthrough,
        photos: data.photos, // ⭐ 保存时包含照片
      })
      toast.success('更新成功')
      onClose()
    }
  }

  const handleDelete = () => {
    if (latestRecord) {
      onDelete(latestRecord.id)
      onClose()
    }
  }

  const handleDatePickerToggle = (open: boolean) => {
    setShowDatePicker(open)
    onChildModalOpen?.(open)
  }

  const handleTypeSelectorToggle = (open: boolean) => {
    setShowTypeSelector(open)
    onChildModalOpen?.(open)
  }

  return (
    <AnimatePresence>
      {isOpen && latestRecord && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">编辑记录</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PracticeForm
              initialData={formData}
              recordId={latestRecord?.id}
              user={{ email: user?.email, is_pro: userProfile?.is_pro }} // ⭐ 传入用户信息
              date={formData.date}
              type={formData.type}
              onDateChange={(d) => setFormData(prev => ({ ...prev, date: d }))}
              onTypeChange={(t) => setFormData(prev => ({ ...prev, type: t }))}
              dateEditable={true}
              typeEditable={true}
              durationEditable={true}
              showDelete={true}
              showPhotoUpload={true}
              practiceOptions={practiceOptions}
              onSave={handleSave}
              onDelete={handleDelete}
              onDatePickerOpen={() => handleDatePickerToggle(true)}
              onTypeSelectorOpen={() => handleTypeSelectorToggle(true)}
              onChildModalOpen={onChildModalOpen}
              initialPhotos={latestRecord.photos || []}
            />
          </motion.div>

          {/* DatePicker Modal */}
          <DatePickerModal
            isOpen={showDatePicker}
            onClose={(selectedDate) => {
              if (selectedDate) {
                setFormData(prev => ({ ...prev, date: selectedDate }))
              }
              handleDatePickerToggle(false)
            }}
            maxDate={getLocalDateStr()}
            practiceHistory={practiceHistory}
          />

          {/* TypeSelector Modal */}
          <TypeSelectorModal
            isOpen={showTypeSelector}
            onClose={(selectedType) => {
              if (selectedType) {
                setFormData(prev => ({ ...prev, type: selectedType }))
              }
              handleTypeSelectorToggle(false)
            }}
            practiceOptions={practiceOptions}
            selectedType={formData.type}
          />
        </>
      )}
    </AnimatePresence>
  )
}
// Share Card Modal - v3 "The Aotang Poster" with Magazine Layout
function ShareCardModal({
  isOpen,
  onClose,
  record,
  profile,
  totalPracticeCount,
  thisMonthDays,
  totalHours,
  onEditRecord,
  onLogExport,
  syncStatus,
}: {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  profile: UserProfile
  totalPracticeCount: number
  thisMonthDays: number
  totalHours: number
  onEditRecord: (id: string, notes: string, photos: string[], breakthrough?: string) => void
  onLogExport: (log: any) => void
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error'
}) {
  const [isCapturing, setIsCapturing] = useState(false)  // 截图状态

  // 早期返回必须在所有 Hooks 之后
  if (!record) return null

  // 图片导出功能
  const handleExportImage = async () => {
    const element = document.getElementById('share-card-content')
    if (!element) {
      toast.error('未找到分享卡片内容')
      return
    }

    // 保存原始样式
    const originalMaxHeight = element.style.maxHeight
    const originalOverflow = element.style.overflow

    try {
      toast.loading('正在生成图片...', { id: 'export' })

      // 1. 临时移除滚动限制，展开完整内容
      element.style.maxHeight = 'none'
      element.style.overflow = 'visible'

      // 2. 等待DOM更新（确保高度扩展完成）
      await new Promise(resolve => setTimeout(resolve, 100))

      // 3. 执行截图
      const result = await captureWithFallback(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        filename: `ashtanga-${record?.date || 'practice'}.png`,
        onLog: (log) => {
          const logEntry = {
            ...log,
            timestamp: log.timestamp,
            success: log.success,
            userAgent: log.userAgent,
            recordDate: log.recordDate
          }
          onLogExport(logEntry)
        }
      })

      // 记录分享卡片导出事件
      trackEvent('share_card_export', {
        export_method: result.method,
        export_success: result.success
      })

      toast.dismiss('export')

      if (result.success) {
        toast.success('图片已保存')
        onClose()
      } else {
        const errorMessage = formatErrorForUser(result, navigator.userAgent)
        toast.error(errorMessage)
      }
    } catch (error) {
      // 记录失败
      trackEvent('share_card_export', {
        export_method: 'error',
        export_success: false
      })
      toast.dismiss('export')
      toast.error('导出失败，请重试')
    } finally {
      // 恢复原始样式
      element.style.maxHeight = originalMaxHeight
      element.style.overflow = originalOverflow
    }
  }

  if (!record) return null

  const formattedDate = new Date(record.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')
  const durationMinutes = Math.floor(record.duration / 60)

  return (
    <AnimatePresence>
      {isOpen && record && (
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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <div className="flex flex-col gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              {/* Share Card Content (for screenshot) */}
              <div
                id="share-card-content"
                className="bg-background rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
              >
                {/* Header: Hero Duration Design */}
                <div className="px-5 pt-5 pb-4 border-b border-border">
                  {/* Top Line: Date · Type (small, subtle) */}
                  <div className="text-xs text-muted-foreground font-serif mb-1">
                    {formattedDate} · {record.type}
                  </div>
                  {/* Main Line: Hero Duration (huge, bold Song font) */}
                  <div className="text-4xl font-serif font-bold text-foreground">
                    {durationMinutes} <span className="text-xl font-normal">分钟</span>
                  </div>
                  {/* Breakthrough Badge - Celebratory stamp if exists */}
                  {record.breakthrough && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e67e22]/10 to-[#f39c12]/10 rounded-full border border-[#e67e22]/20">
                      <Sparkles className="w-4 h-4 text-[#e67e22]" />
                      <span className="text-sm font-serif font-bold text-[#e67e22]">{record.breakthrough}</span>
                    </div>
                  )}
                </div>

                {/* Reflection Text - 只读显示 */}
                <div className="px-5 py-6">
                  <p className={`text-sm text-foreground font-serif leading-relaxed whitespace-pre-wrap break-words ${
                    isCapturing ? 'max-h-none' : 'max-h-[50vh] overflow-y-auto'
                  }`}>
                    {record.notes || "今日练习完成"}
                  </p>

                  {/* 照片展示 - 与文案区同宽，垂直排列，一行一张 */}
                  {record.photos && record.photos.length > 0 && (
                    <div className="mt-4 mx-auto w-[90%] space-y-3">
                      {record.photos.map((url, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden"
                        >
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

                {/* Footer: Stats & Identity Zone */}
                <div className="px-5 pb-5 pt-2 border-t border-border">
                  {/* Stats Grid - 3 columns with units */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {thisMonthDays} <span className="text-sm font-normal">天</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">本月熬汤</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {totalPracticeCount} <span className="text-sm font-normal">次</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">累计熬汤</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {totalHours} <span className="text-sm font-normal">小时</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-serif">累计熬汤时长</div>
                    </div>
                  </div>

                  {/* Identity Footer: Avatar+Name+Signature (Left) | Brand (Right) */}
                  <div className="pt-3">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center overflow-hidden">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      {/* Name and Signature - full width */}
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-serif text-[#e67e22]">{profile.name}</span>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] text-muted-foreground italic font-serif">{profile.signature}</span>
                          <span className="text-[10px] text-muted-foreground italic font-serif">熬汤日记</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions (outside screenshot area, but inside stopPropagation div) */}
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
                    console.log('💾 保存按钮')
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

// Custom Select Component (Zen-style dropdown styled like date picker)
function ZenSelect({
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif text-left focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || placeholder}
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card rounded-[20px] p-2 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-50 max-h-[200px] overflow-y-auto"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-left font-serif transition-colors ${
                    value === option.value
                      ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Date Picker Modal - 复用Tab2的月度热力图样式
function DatePickerModal({
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
  const today = maxDate ? new Date(maxDate) : new Date()

  // 复用MonthlyHeatmap的日历逻辑
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  // 练习记录映射
  const practiceMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      map[p.date] = true
    })
    return map
  }, [practiceHistory])

  // 突破日映射
  const breakthroughMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      if (p.breakthrough) {
        map[p.date] = true
      }
    })
    return map
  }, [practiceHistory])

  // 月相Map
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [startDayOfWeek, daysInMonth])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const goToPreviousMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    setViewDate(nextMonth)
  }

  const canGoNext = true

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onClose(dateStr)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - z-[75] */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[75]"
            onClick={() => onClose('')}
          />
          {/* 模态框主体 - z-[80] */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground font-semibold">选择日期</h2>
              <button
                onClick={() => onClose('')}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 月份导航 */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={goToPreviousMonth}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-serif text-foreground font-semibold">
                {currentYear}年{currentMonth + 1}月
              </h3>
              <button
                onClick={goToNextMonth}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 日历网格 */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-serif py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} />
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasPractice = practiceMap[dateStr]
                const moonInfo = moonPhaseMap[dateStr]
                const hasBreakthrough = breakthroughMap[dateStr]

                return (
                  <MoonDayButton
                    key={idx}
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

// Type Selector Modal - 练习类型选择器（全屏）
function TypeSelectorModal({
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
  // 处理按钮点击
  const handleOptionTap = (option: PracticeOption) => {
    // 返回 label + notes 组合以区分同名选项
    const typeValue = option.notes
      ? `${option.label} ${option.notes}`
      : option.label
    onClose(typeValue)
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - z-[75] */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[75]"
            onClick={() => onClose('')}
          />
          {/* 半屏卡片 - z-[80] */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] flex flex-col max-h-[calc(100vh-2rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-serif text-foreground font-semibold">选择练习类型</h2>
              <button
                onClick={() => onClose('')}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3列网格 - 可滚动 */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-3 gap-3">
                {practiceOptions
                  .filter(option => option.id !== "custom")
                  .map((option) => {
                  // 显示逻辑：label（名称）+ notes（备注）
                  const displayName = option.label || ''
                  const displayNotes = option.notes || ''

                  // 使用 label + notes 组合来精确匹配，避免同名选项同时高亮
                  const optionTypeValue = displayNotes
                    ? `${displayName} ${displayNotes}`
                    : displayName
                  const isSelected = selectedType === optionTypeValue

                  return (
                    <motion.button
                      key={option.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleOptionTap(option)}
                      className={`
                        py-3 px-2 rounded-[20px] text-center font-serif transition-all duration-300
                        min-h-[80px] w-full flex flex-col items-center justify-center
                        ${
                          isSelected
                            ? "green-gradient text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                            : "bg-card text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                        }
                      `}
                    >
                      <span className="text-[14px] leading-snug break-words w-full">
                        {displayName}
                      </span>
                      {displayNotes && (
                        <span className={`
                          text-[11px] mt-1 leading-snug break-words w-full line-clamp-1
                          ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}
                        `}>
                          {displayNotes}
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* 提示文本 */}
              <p className="text-center text-xs text-muted-foreground font-serif mt-6">
                点击选择练习类型
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </>
  )
}

// Add Practice Modal (添加练习) - 使用 PracticeForm
function AddPracticeModal({
  isOpen,
  onClose,
  onSave,
  addRecord,
  updateRecord,
  deleteRecord,
  practiceOptions,
  practiceHistory = [],
  onChildModalOpen,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  user,
  userProfile,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => void
  addRecord: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => PracticeRecord
  updateRecord: (id: string, data: Partial<PracticeRecord>) => void
  deleteRecord: (id: string) => void
  practiceOptions: PracticeOption[]
  practiceHistory?: PracticeRecord[]
  onChildModalOpen?: (open: boolean) => void
  onOpenVoiceFakeDoor?: () => void
  onOpenPhotoFakeDoor?: () => void
  user?: { email?: string | null } | null
  userProfile?: UserProfile | null
}) {
  // 表单数据状态（用于 PracticeForm）
  const [formData, setFormData] = useState({
    date: getLocalDateStr(),
    type: '',
    duration: 60,
    notes: '',
    breakthrough: undefined as string | undefined,
  })

  // 子模态框状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  // 草稿记录（用于照片上传）
  const [draftRecord, setDraftRecord] = useState<PracticeRecord | null>(null)

  // 当弹窗打开时，预创建草稿记录
  useEffect(() => {
    if (isOpen) {
      // 创建草稿记录用于照片上传
      const draft = addRecord({
        date: getLocalDateStr(),
        type: '草稿', // 临时类型，不显示在时光轴
        duration: 60,
        notes: '',
      })
      setDraftRecord(draft)
    } else if (draftRecord) {
      // 弹窗关闭时删除草稿（用户取消）
      deleteRecord(draftRecord.id, true) // true = 跳过确认
      setDraftRecord(null)
    }
  }, [isOpen])

  // 清理函数：组件卸载时也删除草稿
  useEffect(() => {
    return () => {
      if (draftRecord) {
        deleteRecord(draftRecord.id, true) // true = 跳过确认
      }
    }
  }, [])

  const handleSave = (data: PracticeFormData) => {
    if (draftRecord) {
      // 更新草稿为正式记录
      updateRecord(draftRecord.id, {
        date: data.date,
        type: data.type,
        duration: data.duration * 60, // 转换为秒
        notes: data.notes || "今日练习完成",
        breakthrough: data.breakthrough,
        photos: data.photos, // ⭐ 保存时包含照片
      })
      toast.success('补卡成功！')
    }
    // 重置表单
    setFormData({
      date: getLocalDateStr(),
      type: '',
      duration: 60,
      notes: '',
      breakthrough: undefined,
    })
    setDraftRecord(null)
    onClose()
  }

  const handleDatePickerToggle = (open: boolean) => {
    setShowDatePicker(open)
    onChildModalOpen?.(open)
  }

  const handleTypeSelectorToggle = (open: boolean) => {
    setShowTypeSelector(open)
    onChildModalOpen?.(open)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[70] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground font-semibold">🧘‍♀️添加练习</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PracticeForm
              initialData={formData}
              recordId={draftRecord?.id}
              user={{ email: user?.email, is_pro: userProfile?.is_pro }} // ⭐ 传入用户信息
              date={formData.date}
              type={formData.type}
              onDateChange={(d) => setFormData(prev => ({ ...prev, date: d }))}
              onTypeChange={(t) => setFormData(prev => ({ ...prev, type: t }))}
              dateEditable={true}
              typeEditable={true}
              durationEditable={true}
              showDelete={false}
              showPhotoUpload={true}
              practiceOptions={practiceOptions}
              onSave={handleSave}
              onDatePickerOpen={() => handleDatePickerToggle(true)}
              onTypeSelectorOpen={() => handleTypeSelectorToggle(true)}
              onChildModalOpen={onChildModalOpen}
            />
          </motion.div>

          {/* DatePicker Modal */}
          <DatePickerModal
            isOpen={showDatePicker}
            onClose={(selectedDate) => {
              if (selectedDate) {
                setFormData(prev => ({ ...prev, date: selectedDate }))
              }
              handleDatePickerToggle(false)
            }}
            maxDate={getLocalDateStr()}
            practiceHistory={practiceHistory}
          />

          {/* TypeSelector Modal */}
          <TypeSelectorModal
            isOpen={showTypeSelector}
            onClose={(selectedType) => {
              if (selectedType) {
                setFormData(prev => ({ ...prev, type: selectedType }))
              }
              handleTypeSelectorToggle(false)
            }}
            practiceOptions={practiceOptions}
            selectedType={formData.type}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// Settings Modal with Account Binding and Data Management
function SettingsModal({
  isOpen,
  onClose,
  profile,
  onSave,
  onOpenExport,
  onOpenImport,
  onExportLog,
  onClearData,
  user,
  practiceHistory,
  practiceOptionsData,
  initialSection,
  onShowClearDataConfirm,
  onOpenLoginModal,
  onOpenRegisterModal,
  membership,
  onActivateMembership,
  onUpdateProfile,
}: {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  onOpenExport: () => void
  onOpenImport: () => void
  onExportLog?: () => void | Promise<void>
  onClearData?: () => void
  user?: any
  practiceHistory?: PracticeRecord[]
  practiceOptionsData?: PracticeOption[]
  initialSection?: 'profile' | 'membership' | 'account' | 'data'
  onShowClearDataConfirm?: () => void
  onOpenLoginModal?: () => void
  onOpenRegisterModal?: () => void
  membership?: { is_active: boolean; expires_at_formatted: string | null; days_remaining: number; type: 'quarter' | 'year' | null } | null
  onActivateMembership?: () => void
  onUpdateProfile?: (profile: UserProfile) => void
}) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [activeSection, setActiveSection] = useState<'profile' | 'membership' | 'account' | 'data'>(initialSection || 'profile')
  const [isExportingLog, setIsExportingLog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 历史数据校准
  const [historicalDays, setHistoricalDays] = useState(profile.historical_days || 0)
  const [historicalAvgMinutes, setHistoricalAvgMinutes] = useState(profile.historical_avg_minutes || 0)

  // 当 profile 变化时同步历史数据
  useEffect(() => {
    setHistoricalDays(profile.historical_days || 0)
    setHistoricalAvgMinutes(profile.historical_avg_minutes || 0)
  }, [profile.historical_days, profile.historical_avg_minutes])

  // 当 initialSection 变化时，切换到对应标签页
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件大小（限制5MB）
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      alert('图片太大啦，请选择5MB以内的图片')
      return
    }

    // 自动压缩图片
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // 计算压缩后的尺寸（最大200x200，头像显示足够）
        const MAX_DIMENSION = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = (height * MAX_DIMENSION) / width
            width = MAX_DIMENSION
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = (width * MAX_DIMENSION) / height
            height = MAX_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height)

        // 转换为base64，质量0.85
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatar(compressedDataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    try {
      onSave({
        ...profile,
        name,
        signature,
        avatar,
        historical_days: historicalDays,
        historical_avg_minutes: historicalAvgMinutes,
      })
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，图片可能太大，请尝试压缩后再上传')
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
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">设置</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs - 顺序：个人资料 | 会员 | 账户与同步 | 数据管理 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveSection('profile')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'profile'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                个人资料
              </button>
              <button
                onClick={() => setActiveSection('membership')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'membership'
                    ? 'bg-gradient-to-r from-[#C1A268] to-[#D4AF37] shadow-[0_4px_16px_rgba(193,162,104,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                会员
              </button>
              <button
                onClick={() => setActiveSection('account')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'account'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                账户与同步
              </button>
              <button
                onClick={() => setActiveSection('data')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'data'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                数据管理
              </button>
            </div>

            <div className="space-y-6">
              {activeSection === 'profile' && (
                <>
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-serif text-muted-foreground mb-1.5">昵称</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-serif text-muted-foreground mb-1.5">个人签名</label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* 历史练习数据校准 */}
                  <div className="pt-2">
                    {/* 标题行 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-sm font-serif text-foreground">过往练习</h3>
                      </div>
                      <span className="text-xs text-primary font-medium">
                        累计约 {Math.round(historicalDays * historicalAvgMinutes / 60)} 小时
                      </span>
                    </div>

                    {/* 左右两个独立卡片 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 左边：历史练习天数 */}
                      <div className="bg-white rounded-xl p-3 border border-stone-200">
                        <div className="text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={historicalDays === 0 ? '' : historicalDays}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              setHistoricalDays(val === '' ? 0 : parseInt(val))
                            }}
                            className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
                            placeholder="0"
                          />
                          <div className="text-[10px] text-muted-foreground font-serif mt-1">天数</div>
                        </div>
                      </div>

                      {/* 右边：平均每次时长 */}
                      <div className="bg-white rounded-xl p-3 border border-stone-200">
                        <div className="text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={historicalAvgMinutes === 0 ? '' : historicalAvgMinutes}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              setHistoricalAvgMinutes(val === '' ? 0 : parseInt(val))
                            }}
                            className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
                            placeholder="0"
                          />
                          <div className="text-[10px] text-muted-foreground font-serif mt-1">分钟/次</div>
                        </div>
                      </div>
                    </div>

                    {/* 说明文字 */}
                    <p className="text-[10px] text-muted-foreground/70 text-center font-serif mt-2">
                      💡 设置后，统计数据会以此为基础累加
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'membership' && (
                <div className="space-y-4">
                  {/* 会员状态卡片 */}
                  <div className="bg-gradient-to-br from-[#F9F7F2] to-[#F5F0E8] rounded-[20px] p-5 border border-[#C1A268]/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#C1A268] to-[#D4AF37] rounded-lg flex items-center justify-center">
                            <Crown className="w-4 h-4 text-white" />
                          </div>
                          <h2 className="font-serif text-lg text-[#8B7355]">Pro 会员</h2>
                        </div>

                        {membership?.is_active ? (
                          <div>
                            <p className="text-[#6B5A47] font-serif font-medium">
                              有效期至 {membership.expires_at_formatted}
                            </p>
                            <p className="text-[#8B7355] text-sm mt-1 font-serif">
                              还剩 {membership.days_remaining} 天
                              {membership.type === 'quarter' ? ' · 季卡' : membership.type === 'year' ? ' · 年卡' : ''}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[#8B7355] text-sm font-serif">
                            免费用户 · 解锁更多专属功能
                          </p>
                        )}
                      </div>

                      {!membership?.is_active && (
                        <Sparkles className="w-6 h-6 text-[#C1A268]" />
                      )}
                    </div>

                    {/* Pro 功能预览 */}
                    <div className="mt-4 pt-4 border-t border-[#C1A268]/20">
                      <p className="text-xs text-[#8B7355] mb-3 font-serif">Pro 会员权益</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#6B5A47]">9 张</div>
                          <div className="text-xs text-[#8B7355] font-serif">照片上传</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#6B5A47]">10 个</div>
                          <div className="text-xs text-[#8B7355] font-serif">自定义选项</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#6B5A47]">9 种</div>
                          <div className="text-xs text-[#8B7355] font-serif">日历标注</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 激活按钮 */}
                  {!membership?.is_active && (
                    <button
                      onClick={onActivateMembership}
                      className="w-full flex items-center justify-between p-4 bg-white rounded-[20px] border border-[#E8E8E3] hover:border-[#C1A268]/50 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F5F0E8] rounded-xl flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-[#C1A268]" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-[#2D3A2D] font-serif">激活会员</p>
                          <p className="text-sm text-[#8B7355] font-serif">使用激活码开通或续费</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#C1A268]" />
                    </button>
                  )}

                  {/* 购买按钮 */}
                  <button
                    onClick={() => alert('购买功能即将上线')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#C1A268] to-[#D4AF37] rounded-[20px] text-white shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium font-serif">购买会员</p>
                        <p className="text-sm text-white/80 font-serif">开通 Pro 解锁全部功能</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}

              {activeSection === 'account' && (
                <AccountBindingSection
                  profile={profile}
                  localData={{
                    records: practiceHistory,
                    options: practiceOptionsData
                  }}
                  onSyncComplete={(data) => {
                    // 同步完成后的回调
                    console.log('Sync completed:', data)
                    // ⭐ 更新本地 profile（如果云端有更新）
                    if (data?.profile) {
                      console.log('更新本地 profile:', data.profile)
                      onUpdateProfile?.(data.profile)
                    }
                  }}
                  onClose={onClose}
                  onOpenLoginModal={onOpenLoginModal}
                  onOpenRegisterModal={onOpenRegisterModal}
                  onShowClearDataConfirm={onShowClearDataConfirm}
                  user={user}
                />
              )}

              {/* 临时注释：测试其他Tab是否正常
              {activeSection === 'account' && (
                <div className="text-center py-8">
                  <p>账户与同步功能开发中...</p>
                </div>
              )}
              */}

              {activeSection === 'data' && (
                <div className="space-y-3">
                  {/* 只有未登录时才显示备份提示 */}
                  {!user && (
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                      <p className="text-xs text-orange-600 font-serif leading-relaxed">
                        💡 未开启云端同步，建议定期备份数据，防止意外丢失
                      </p>
                    </div>
                  )}

                  {/* 导出按钮 */}
                  <button
                    onClick={onOpenExport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                        <Copy className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-serif text-foreground">复制数据胶囊</div>
                        <div className="text-[10px] text-muted-foreground font-serif">一键复制到剪贴板</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 导入按钮 */}
                  <button
                    onClick={onOpenImport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-50 text-red-500">
                        <Download className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-serif text-foreground">导入数据胶囊</div>
                        <div className="text-[10px] text-muted-foreground font-serif">从剪贴板恢复数据</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 导出日志按钮 */}
                  {onExportLog && (
                    <button
                      onClick={async () => {
                        setIsExportingLog(true)
                        try {
                          await onExportLog()
                        } finally {
                          setIsExportingLog(false)
                        }
                      }}
                      disabled={isExportingLog}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                          <Bug className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-serif text-foreground">
                            {isExportingLog ? '正在生成日志...' : '运行日志'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-serif">
                            {isExportingLog ? '请稍候，正在测试连接...' : '如遇问题，请复制本日志发给开发者'}
                          </div>
                        </div>
                      </div>
                      {isExportingLog ? (
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      )}
                    </button>
                  )}

                  {/* 清空数据按钮 - 三层安全防护 */}
                  {onClearData && (
                    <button
                      onClick={() => {
                        onShowClearDataConfirm && onShowClearDataConfirm()
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-all group border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-100 text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-serif text-red-700">清空数据胶囊</div>
                          <div className="text-[10px] text-red-600 font-serif">删除所有记录，恢复初始状态</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              )}

              <div className="pt-4">
                {/* 只在"个人资料"Tab显示保存按钮 */}
                {activeSection === 'profile' && (
                  <button
                    onClick={handleSave}
                    className="w-full py-4 rounded-full green-gradient text-white font-serif shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    保存设置
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Account & Sync Modal - 专门用于云图标点击
function AccountSyncModal({
  isOpen,
  onClose,
  profile,
  practiceHistory,
  practiceOptionsData,
  onOpenLoginModal,
  onOpenRegisterModal,
  onShowClearDataConfirm,
  onUpdateProfile,
  user,
}: {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  practiceHistory: PracticeRecord[]
  practiceOptionsData: PracticeOption[]
  onOpenLoginModal: () => void
  onOpenRegisterModal: () => void
  onShowClearDataConfirm?: () => void
  onUpdateProfile?: (profile: UserProfile) => void
  user?: any
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-serif text-foreground">账户与同步</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <AccountBindingSection
              profile={profile}
              localData={{
                records: practiceHistory,
                options: practiceOptionsData
              }}
              onSyncComplete={(data) => {
                console.log('Sync completed:', data)
                // ⭐ 更新本地 profile（如果云端有更新）
                if (data?.profile) {
                  console.log('更新本地 profile:', data.profile)
                  onUpdateProfile?.(data.profile)
                }
              }}
              onClose={onClose}
              onOpenLoginModal={onOpenLoginModal}
              onOpenRegisterModal={onOpenRegisterModal}
              onShowClearDataConfirm={onShowClearDataConfirm}
              user={user}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Confirm End Dialog
function ConfirmEndDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-3xl z-[70] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] w-[calc(100%-48px)] max-w-sm"
          >
            <h2 className="text-lg font-serif text-foreground text-center mb-2">确认结束？</h2>
            <p className="text-muted-foreground text-center text-sm mb-6 font-serif">确定要结束这次练习吗？</p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
              >
                结束
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Completion Sheet - 使用 PracticeForm
function CompletionSheet({
  isOpen,
  practiceType,
  duration,
  onSave,
  onClose,
  addRecord,
  updateRecord,
  deleteRecord,
  autoSync,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  user,
  userProfile,
}: {
  isOpen: boolean
  practiceType: string
  duration: string
  onSave: (notes: string, photos: string[], breakthrough?: string) => void
  onClose?: () => void
  addRecord: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => PracticeRecord
  updateRecord: (id: string, data: Partial<PracticeRecord>) => void
  deleteRecord: (id: string, skipConfirm?: boolean) => void
  autoSync?: () => Promise<void>
  onOpenVoiceFakeDoor?: () => void
  onOpenPhotoFakeDoor?: () => void
  user?: { email?: string | null } | null
  userProfile?: UserProfile | null
}) {
  // 表单数据状态（用于 PracticeForm）
  const [formData, setFormData] = useState({
    date: getLocalDateStr(),
    type: practiceType,
    duration: parseInt(duration) || 0,
    notes: '',
    breakthrough: undefined as string | undefined,
  })

  // 草稿记录（用于照片上传）
  const [draftRecord, setDraftRecord] = useState<PracticeRecord | null>(null)

  // 当弹窗打开时，预创建草稿记录并同步数据
  useEffect(() => {
    if (isOpen) {
      // 创建草稿记录用于照片上传（使用实际类型，不是'草稿'）
      const draft = addRecord({
        date: getLocalDateStr(),
        type: practiceType,
        duration: parseInt(duration) * 60 || 0,
        notes: '',
      })
      setDraftRecord(draft)
      setFormData({
        date: getLocalDateStr(),
        type: practiceType,
        duration: parseInt(duration) || 0,
        notes: '',
        breakthrough: undefined,
      })

      // ⭐ 延迟 500ms 同步，确保 localStorage 已完全更新
      // 只有绑定邮箱的用户才同步到云端
      if (user?.email && autoSync) {
        console.log('[CompletionSheet] 草稿创建完成，准备同步')
        setTimeout(() => {
          autoSync()
        }, 500)
      }
    } else if (draftRecord) {
      // 弹窗关闭时删除草稿（用户取消）
      deleteRecord(draftRecord.id, true) // true = 跳过确认
      setDraftRecord(null)
    }
  }, [isOpen, practiceType, duration])

  // 清理函数：组件卸载时也删除草稿
  useEffect(() => {
    return () => {
      if (draftRecord) {
        deleteRecord(draftRecord.id, true) // true = 跳过确认
      }
    }
  }, [])

  const handleSave = (data: PracticeFormData) => {
    if (draftRecord) {
      // 更新草稿为正式记录（包含照片）
      updateRecord(draftRecord.id, {
        notes: data.notes || "今日练习完成",
        breakthrough: data.breakthrough,
        photos: data.photos, // ⭐ 保存时包含照片
      })
      toast.success('记录已保存！')

      // ⭐ 关闭弹窗
      onClose?.()
    }
    // 重置表单
    setFormData({
      date: getLocalDateStr(),
      type: practiceType,
      duration: parseInt(duration) || 0,
      notes: '',
      breakthrough: undefined,
    })
    setDraftRecord(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[70] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <h2 className="text-xl font-serif text-foreground text-center mb-6">练习完成</h2>

            <PracticeForm
              initialData={formData}
              recordId={draftRecord?.id}
              user={{ email: user?.email, is_pro: userProfile?.is_pro }} // ⭐ 传入用户信息
              date={formData.date}
              type={formData.type}
              onDateChange={() => {}} // 只读，不处理
              onTypeChange={() => {}} // 只读，不处理
              dateEditable={false}
              typeEditable={false}
              durationEditable={false}
              showDelete={false}
              showPhotoUpload={true}
              practiceOptions={[]}
              onSave={handleSave}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Color Block Fullscreen Viewer (simulates photo viewer)
// Monthly Stats Card Component
function MonthlyStatsCard({
  practiceHistory,
  year,
  month,
  onClick,
}: {
  practiceHistory: PracticeRecord[]
  year: number
  month: number
  onClick?: () => void
}) {
  // 计算本月统计数据
  const stats = useMemo(() => {
    const monthRecords = practiceHistory.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === month && r.duration > 0 && r.type !== '草稿'
    })

    const practiceDays = monthRecords.length
    const totalSeconds = monthRecords.reduce((acc, r) => acc + r.duration, 0)
    const totalMinutes = Math.round(totalSeconds / 60)
    const avgMinutes = practiceDays > 0 ? Math.round(totalMinutes / practiceDays) : 0

    // 计算连续练习周数
    const practiceDates = practiceHistory
      .filter(r => r.duration > 0 && r.type !== '草稿')
      .map(r => r.date)
      .filter((date, idx, arr) => arr.indexOf(date) === idx)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let consecutiveWeeks = 0
    if (practiceDates.length > 0) {
      const today = new Date()
      const currentWeekEnd = new Date(today)
      currentWeekEnd.setHours(23, 59, 59, 999)

      while (true) {
        const weekStart = new Date(currentWeekEnd)
        weekStart.setDate(weekStart.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)

        const hasPracticeThisWeek = practiceDates.some(dateStr => {
          const d = new Date(dateStr)
          return d >= weekStart && d <= currentWeekEnd
        })

        if (hasPracticeThisWeek) {
          consecutiveWeeks++
          currentWeekEnd.setDate(currentWeekEnd.getDate() - 7)
        } else {
          break
        }
      }
    }

    return {
      practiceDays,
      totalMinutes,
      avgMinutes,
      consecutiveWeeks,
    }
  }, [practiceHistory, year, month])

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[20px] shadow-md border border-stone-200 overflow-hidden p-3 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
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

// Monthly Stats Share Modal
function MonthlyStatsShareModal({
  isOpen,
  onClose,
  practiceHistory,
  year,
  month,
  profile,
}: {
  isOpen: boolean
  onClose: () => void
  practiceHistory: PracticeRecord[]
  year: number
  month: number
  profile: UserProfile
}) {
  // 计算统计数据和日历数据
  const { stats, calendarDays, hasPractice } = useMemo(() => {
    const monthRecords = practiceHistory.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === month && r.duration > 0 && r.type !== '草稿'
    })

    const totalSeconds = monthRecords.reduce((acc, r) => acc + r.duration, 0)
    const totalHours = Math.round(totalSeconds / 3600)
    const breathCount = Math.round(totalSeconds / 6)
    const photosynthesisCount = breathCount * 144

    // 生成日历数据
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    // 创建日期到练习状态的映射
    const practiceMap: Record<number, boolean> = {}
    monthRecords.forEach(r => {
      const day = new Date(r.date).getDate()
      practiceMap[day] = true
    })

    // 生成日历网格（7列，6行最大）
    const days: { day: number | null; practiced: boolean }[] = []

    // 前置空位
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, practiced: false })
    }

    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, practiced: !!practiceMap[day] })
    }

    return {
      stats: { totalHours, breathCount, photosynthesisCount },
      calendarDays: days,
      hasPractice: (day: number) => !!practiceMap[day],
    }
  }, [practiceHistory, year, month])

  // 格式化大数字（如 1,234,567）
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN')
  }

  // 图片导出功能
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
        const errorMessage = formatErrorForUser(result, navigator.userAgent)
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.dismiss('export-monthly')
      toast.error('导出失败，请重试')
    }
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <div className="flex flex-col gap-3 items-center" onClick={(e) => e.stopPropagation()}>
              {/* Share Card (for display & export) - 固定宽度，高度自适应 */}
              <div id="monthly-stats-share-content" className="relative w-[320px] rounded-3xl shadow-2xl overflow-hidden bg-white">
                {/* 实际显示内容 */}
                <div className="flex flex-col p-6">
                  {/* 顶部：左边年份月份，右边累计熬汤 */}
                  <div className="flex items-end justify-between mb-4">
                    {/* 左边：年份月份 */}
                    <div className="flex flex-col">
                      <span className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>{year}年</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-bold" style={{ color: '#2d5a27' }}>{month + 1}</span>
                        <span className="text-base font-serif" style={{ color: '#2d5a27' }}>月</span>
                      </div>
                    </div>
                    {/* 右边：已累计熬汤 */}
                    <div className="text-right">
                      <div className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>已累计熬汤</div>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-4xl font-serif font-bold" style={{ color: '#2d5a27' }}>{stats.totalHours}</span>
                        <span className="text-base font-serif" style={{ color: '#2d5a27' }}>小时</span>
                      </div>
                    </div>
                  </div>

                  {/* 日历网格 - 圆点样式 */}
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
                              : 'bg-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 统计数据 - 像一棵树后面加"进行了" */}
                  <div className="flex items-end justify-between pt-4">
                    <div className="text-left">
                      <div className="text-xs font-serif mb-1" style={{ color: '#2d5a27' }}>相当于</div>
                      <div className="text-2xl font-serif font-bold" style={{ color: '#2d5a27' }}>{formatNumber(stats.breathCount)}</div>
                      <div className="text-xs font-serif" style={{ color: '#2d5a27' }}>次深呼吸</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: '#2d5a27' }}>
                          <path d="M12 2L4 10h4v4h8v-4h4L12 2z" fill="currentColor"/>
                          <path d="M12 6L6 12h3v6h6v-6h3L12 6z" fill="currentColor"/>
                        </svg>
                        <span className="text-xs font-serif" style={{ color: '#2d5a27' }}>像一棵树进行了</span>
                      </div>
                      <div className="text-2xl font-serif font-bold text-orange-500">{formatNumber(stats.photosynthesisCount)}</div>
                      <div className="text-xs font-serif" style={{ color: '#2d5a27' }}>次光合作用</div>
                    </div>
                  </div>

                  {/* 底部 - 熬汤日记灰色，与签名底部对齐，增加底部空间 */}
                  <div className="flex items-end justify-between pt-4">
                    <div className="flex items-end gap-2">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="头像" className="w-8 h-8 rounded-full object-cover border border-stone-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-serif font-medium text-stone-800">{profile.name}</span>
                        <span className="text-[10px] font-serif text-stone-400">{profile.signature}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-serif text-stone-400">熬汤日记</span>
                  </div>
                </div>
              </div>

              {/* Actions - 与时光轴分享卡片同风格 */}
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

// Monthly Heatmap for Journal - Now with CIRCLES instead of squares
function MonthlyHeatmap({
  practiceHistory,
  onDayClick,
  onOpenFakeDoor,
  onAddRecord,
  votedCloud,
  syncStatus,
  user,
  onMonthChange,
}: {
  practiceHistory: PracticeRecord[]
  onDayClick: (dateStr: string) => void
  onOpenFakeDoor: () => void
  onAddRecord: () => void
  votedCloud: boolean
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  user: any
  onMonthChange?: (date: Date) => void
}) {
  const today = new Date()
  const todayStr = getLocalDateStr()
  const [viewDate, setViewDate] = useState(today)
  
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  
  // Get first day of month and total days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
  
  // Create practice map - only practiced days
  const practiceMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      map[p.date] = true
    })
    return map
  }, [practiceHistory])

  // 突破日映射
  const breakthroughMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      if (p.breakthrough) {
        map[p.date] = true
      }
    })
    return map
  }, [practiceHistory])

  // 月相Map
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])

  // Moon Day弹窗状态
  const [moonDayDialog, setMoonDayDialog] = useState<{
    open: boolean
    type: 'new' | 'full' | null
  }>({ open: false, type: null })

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [startDayOfWeek, daysInMonth])
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

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

  const canGoNext = true

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // 如果是月相日期且未练习，显示弹窗
    if (moonPhaseMap[dateStr] && !practiceMap[dateStr]) {
      setMoonDayDialog({
        open: true,
        type: moonPhaseMap[dateStr].type
      })
      return
    }

    // 正常练习记录跳转
    if (practiceMap[dateStr]) {
      onDayClick(dateStr)
    }
  }
  
  return (
    <div className="bg-white rounded-[20px] mb-3 shadow-md border border-stone-200 overflow-hidden">
      {/* Integrated Header: Sync + Month Navigation + Add Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-lime-50">
        {/* Left: Sync Status - aligned with calendar first column */}
        <div className="w-[calc((100%-12px)/7)] flex justify-center">
          <SyncButton onOpenFakeDoor={onOpenFakeDoor} syncStatus={syncStatus} hasVoted={!!user} />
        </div>
        
        {/* Center: Month Navigation - takes remaining space */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <button 
            onClick={goToPreviousMonth}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-serif text-foreground min-w-[90px] text-center font-semibold text-lg">
            {currentYear}年{currentMonth + 1}月
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Right: Add Button - aligned with calendar last column */}
        <div className="w-[calc((100%-12px)/7)] flex justify-center">
          <button
            onClick={onAddRecord}
            className="w-8 h-8 rounded-full green-gradient-deep border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[2px] p-4">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[9px] text-muted-foreground font-serif py-0.5">
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const practiced = day ? practiceMap[dateStr] : false
          const isPast = day ? dateStr <= todayStr : false
          const moonInfo = day ? moonPhaseMap[dateStr] : null
          const hasBreakthrough = day ? breakthroughMap[dateStr] : false

          return (
            <MoonDayButton
              key={idx}
              day={day}
              moonInfo={moonInfo}
              practiced={practiced}
              isPast={isPast}
              hasBreakthrough={hasBreakthrough}
              onClick={() => handleDayClick(day)}
              disabled={!moonInfo && !practiced}
              className={
                !moonInfo && !practiced
                  ? day === null
                    ? 'bg-transparent'
                    : isPast
                      ? 'bg-background text-foreground'
                      : 'bg-background text-muted-foreground/50'
                  : ''
              }
            />
          )
        })}
      </div>

      {/* Moon Day提示弹窗 */}
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
                  {moonDayDialog.type === 'new' ? '新月Moon Day🌑' : '满月Moon Day🌕'}
                </h3>
                <p className="text-sm text-muted-foreground font-serif mb-4 leading-relaxed">
                  建议暂停练习
                  <br />
                  提前安排练习时间
                </p>
                <button
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

// Sync Button - Cream cloud icon with colored status dot below
function SyncButton({ onOpenFakeDoor, syncStatus, hasVoted }: { onOpenFakeDoor: () => void; syncStatus: 'idle' | 'syncing' | 'success' | 'error'; hasVoted: boolean }) {
  const [isClickSpinning, setIsClickSpinning] = useState(false)

  const handleClick = () => {
    // 点击时触发一次旋转动画（1秒）
    setIsClickSpinning(true)
    setTimeout(() => setIsClickSpinning(false), 1000)

    // 延迟打开弹窗，让用户先看到旋转动画
    setTimeout(() => {
      onOpenFakeDoor()
    }, 100)
  }

  // 根据同步状态决定颜色
  const getStatusColor = () => {
    // 未登录：红色
    if (!hasVoted) return 'bg-red-400'

    // 已登录 - 只在有明确状态时显示对应颜色
    if (syncStatus === 'syncing') return 'bg-blue-400' // 同步中：蓝色
    if (syncStatus === 'success') return 'bg-green-400' // 同步成功：绿色
    if (syncStatus === 'error') return 'bg-red-400' // 同步失败：红色

    // 默认：等待同步或空闲状态 - 显示灰色
    return 'bg-stone-400'
  }

  // 是否应该旋转：正在同步 或 点击动画
  const shouldSpin = syncStatus === 'syncing' || isClickSpinning

  return (
    <button
      onClick={handleClick}
      className={`relative w-8 h-8 rounded-full backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.2)] flex items-center justify-center transition-all ${
        hasVoted
          ? 'green-gradient'
          : 'bg-stone-400'
      }`}
    >
      <motion.div
        animate={shouldSpin ? { rotate: 360 } : { rotate: 0 }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
          repeat: syncStatus === 'syncing' ? Infinity : (isClickSpinning ? 1 : 0)
        }}
      >
        <Cloud className={`w-4 h-4 ${hasVoted ? 'text-[#FAF7F2]' : 'text-stone-200'}`} />
      </motion.div>
      {/* Status dot - 根据同步状态显示不同颜色 */}
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 ${getStatusColor()}`} />
    </button>
  )
}

// Journal Tab Component with Timeline - Split interaction zones
function JournalTab({
  practiceHistory,
  practiceOptions,
  profile,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onOpenFakeDoor,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  onAddOption,
  votedCloud,
  onLogExport,
  editingRecord,
  onSetEditingRecord,
  showAddModal,
  onSetShowAddModal,
  syncStatus,
  user,
}: {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  profile: UserProfile
  onEditRecord: (id: string, data: Partial<PracticeRecord>) => void
  onDeleteRecord: (id: string) => void
  onAddRecord: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => void
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
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  user: any
}) {
  const [sharingRecordId, setSharingRecordId] = useState<string | null>(null)
  const [childModalOpen, setChildModalOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null) // ⭐ 图片预览状态
  const [showStatsShare, setShowStatsShare] = useState(false) // ⭐ 月度统计分享弹窗状态
  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ⭐ 已加载的月份列表（无限滚动）
  const [loadedMonths, setLoadedMonths] = useState<Date[]>([new Date()])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // ⭐ 计算最早有记录的月份
  const earliestRecordMonth = useMemo(() => {
    if (practiceHistory.length === 0) return null
    const validRecords = practiceHistory.filter(r => r.type !== '草稿' && r.duration > 0)
    if (validRecords.length === 0) return null

    const earliestDate = validRecords.reduce((earliest, r) => {
      return new Date(r.date) < new Date(earliest.date) ? r : earliest
    }, validRecords[0])

    const d = new Date(earliestDate.date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }, [practiceHistory])

  // ⭐ 检查是否已经到达最早月份
  const hasReachedEarliest = earliestRecordMonth && loadedMonths.some(month =>
    month.getFullYear() === earliestRecordMonth.getFullYear() &&
    month.getMonth() === earliestRecordMonth.getMonth()
  )

  // 月相Map
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])

  // ⭐ 创建日期到记录ID的映射（修复修改日期后无法跳转的问题）
  const dateToIdMap = useMemo(() => {
    const map: Record<string, string> = {}
    practiceHistory.forEach(r => {
      map[r.date] = r.id
    })
    return map
  }, [practiceHistory])

  // 根据 ID 从最新的 practiceHistory 中查找记录
  const sharingRecord = useMemo(() => {
    return sharingRecordId
      ? practiceHistory.find(r => r.id === sharingRecordId) || null
      : null
  }, [sharingRecordId, practiceHistory])

  // 提取练习类型名称（去除备注）
  const getTypeDisplayName = (type: string) => {
    // type格式可能是："一序列 Mysore" 或 "Primary 1 - Mysore"
    // 提取第一部分（在空格或" - "之前）
    return type.split(/\s+|-\s*/)[0]
  }

  // Handle scroll to show/hide back-to-top button and infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400)

      // ⭐ 无限滚动：接近底部时加载上一个月
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      if (isNearBottom && !isLoadingMore) {
        const lastMonth = loadedMonths[loadedMonths.length - 1]
        const prevMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)

        // 检查是否已有记录在这个月份，有才加载
        const hasRecordsInPrevMonth = practiceHistory.some(r => {
          const d = new Date(r.date)
          return d.getFullYear() === prevMonth.getFullYear() &&
                 d.getMonth() === prevMonth.getMonth() &&
                 r.type !== '草稿' &&
                 r.duration > 0
        })

        if (hasRecordsInPrevMonth) {
          setIsLoadingMore(true)
          setLoadedMonths(prev => [...prev, prevMonth])
          setTimeout(() => setIsLoadingMore(false), 300)
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadedMonths, isLoadingMore, practiceHistory])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Calculate vanity metrics for share card
  const totalPracticeCount = practiceHistory.length + (profile?.historical_days || 0)
  const today = new Date()
  const thisMonthDays = useMemo(() => {
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    return practiceHistory.filter(r => {
      const d = new Date(r.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.duration > 0 && r.type !== '草稿'
    }).length
  }, [practiceHistory, today])
  const totalHours = useMemo(() => {
    const localSeconds = practiceHistory.reduce((acc, r) => acc + r.duration, 0)
    const historicalMinutes = (profile?.historical_days || 0) * (profile?.historical_avg_minutes || 0)
    return Math.round((localSeconds / 60 + historicalMinutes) / 60)
  }, [practiceHistory, profile])

  const handleDayClick = (dateStr: string) => {
    // ⭐ 通过日期找到记录ID，再通过ID找到ref（修复修改日期后无法跳转的问题）
    const recordId = dateToIdMap[dateStr]
    if (recordId) {
      const ref = recordRefs.current[recordId]
      if (ref) {
        // Trigger highlight animation
        setHighlightedDate(dateStr)

        // Scroll to the record
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Clear highlight after animation completes (1s)
        setTimeout(() => {
          setHighlightedDate(null)
        }, 1000)
      }
    }
  }

  // Left click -> Edit record
  const handleLeftClick = (record: PracticeRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    onSetEditingRecord(record)
  }

  // Right click -> Share card
  const handleRightClick = (record: PracticeRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setSharingRecordId(record.id)
  }

  // Share card edit adapter - converts old signature to new
  const handleShareCardEdit = (id: string, notes: string, photos: string[], breakthrough?: string) => {
    const updateData: Partial<PracticeRecord> = {
      notes,
      photos,
      ...(breakthrough !== undefined && { breakthrough })
    }
    onEditRecord(id, updateData)
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24 pt-12 relative">
      {/* Calendar with integrated header */}
      <div className="px-6">
        <MonthlyHeatmap
          practiceHistory={practiceHistory}
          onDayClick={handleDayClick}
          onOpenFakeDoor={onOpenFakeDoor}
          onAddRecord={() => onSetShowAddModal(true)}
          votedCloud={votedCloud}
          syncStatus={syncStatus}
          user={user}
          onMonthChange={(date) => {
            // ⭐ 切换月份时重置加载的月份列表
            setLoadedMonths([date])
          }}
        />
      </div>

      {/* Monthly Stats Card - 独立的统计卡片 */}
      <div className="px-6 mt-3">
        <MonthlyStatsCard
          practiceHistory={practiceHistory}
          year={loadedMonths[0].getFullYear()}
          month={loadedMonths[0].getMonth()}
          onClick={() => setShowStatsShare(true)}
        />
      </div>

      {/* Timeline - continuous, split click zones */}
      <div className="px-2 pb-10 mt-3">
        {practiceHistory
          .filter(r => {
            if (r.type === '草稿') return false
            // ⭐ 筛选所有已加载月份的记录
            const d = new Date(r.date)
            return loadedMonths.some(month =>
              d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
            )
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
                '0 0 0 rgba(230, 126, 34, 0)',
                '0 0 30px rgba(230, 126, 34, 0.6)',
                '0 0 0 rgba(230, 126, 34, 0)'
              ] : '0 0 0 rgba(45, 90, 39, 0)'
            }}
            transition={{
              opacity: { duration: 0.3, delay: index * 0.05 },
              y: { duration: 0.3, delay: index * 0.05 },
              boxShadow: {
                duration: highlightedDate === practice.date ? 1.0 : 0,
                delay: highlightedDate === practice.date ? 0 : 0,
                times: highlightedDate === practice.date ? [0, 0.5, 1] : undefined
              }
            }}
            className="flex flex-col rounded-lg"
          >
            {/* Single Row Layout - Date-Anchored Alignment with Symmetrical Spacing */}
            <div className="flex items-start rounded-lg">
              {/* Left Column: 3-line stack (Date, Duration, Type) - Right-aligned with breathing room */}
              <button
                onClick={(e) => handleLeftClick(practice, e)}
                className="w-[70px] flex-shrink-0 pr-3 pt-1 pb-1 text-right hover:bg-secondary/30 rounded-l-lg transition-colors"
                style={{ borderRadius: '0.5rem 0 0 0.5rem' }}
              >
                <div className="text-sm font-serif italic text-foreground leading-none">{formatDate(practice.date)}</div>
                {practice.duration > 0 && (
                  <div className="flex items-center justify-end mt-1">
                    <span className="text-xs font-serif italic text-muted-foreground leading-none">{formatMinutes(practice.duration)}</span>
                    <span className="text-xs font-serif italic text-muted-foreground ml-0.5">
                      分钟
                    </span>
                  </div>
                )}
                <div className="text-[10px] font-serif italic text-muted-foreground mt-0.5">{getTypeDisplayName(practice.type)}</div>
              </button>
              
              {/* Center: Vertical line with Dot - balanced whitespace on both sides */}
              <div className="w-[1px] bg-border flex-shrink-0 self-stretch relative">
                <div className={`absolute mt-[10px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${moonPhaseMap[practice.date] ? 'bg-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.8)]' : practice.breakthrough ? 'bg-gradient-to-br from-[#e67e22] to-[#f39c12]' : 'green-gradient-deep'}`} />
              </div>

              {/* Right Column: Content - Left-aligned with matching breathing room */}
              <div className="flex-1 pl-3 pr-8 pb-1">
                {/* First line: Breakthrough OR Notes - must align with Date */}
                {practice.breakthrough ? (
                  <div className="flex items-start gap-1 leading-snug mb-1 mt-[3px]">
                    <Sparkles className="w-3 h-3 text-[#e67e22] flex-shrink-0 mt-[2px]" />
                    <span className="text-sm font-serif font-bold text-[#e67e22] leading-snug">{practice.breakthrough}</span>
                  </div>
                ) : null}
                {/* Notes area - Click for Share Card */}
                <button
                  onClick={(e) => handleRightClick(practice, e)}
                  className="w-full text-left hover:bg-secondary/30 rounded-lg transition-colors overflow-hidden"
                  style={{ borderRadius: '0 0.5rem 0.5rem 0' }}
                >
                  <p className="text-sm text-foreground font-serif leading-snug whitespace-pre-wrap break-words w-full text-justify">
                    {practice.notes}
                  </p>
                  {/* ⭐ 照片展示 - 时光轴 */}
                  {practice.photos && practice.photos.length > 0 && (
                    <div className={cn(
                      "mt-2",
                      practice.photos.length === 1
                        ? "w-[90%]" // 1张大图：觉察文案宽度的90%
                        : "grid grid-cols-3 gap-1" // 2张以上：九宫格
                    )}>
                      {practice.photos.map((url, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-md overflow-hidden border border-border/50 cursor-pointer",
                            practice.photos.length === 1
                              ? "w-full" // 1张：宽度100%（容器已限制90%），高度自适应
                              : "aspect-square w-full" // 多张：正方形
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(url);
                          }}
                        >
                          <img
                            src={url}
                            alt={`照片 ${idx + 1}`}
                            className={cn(
                              "w-full",
                              practice.photos.length === 1 ? "h-auto" : "h-full object-cover"
                            )}
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

        {/* ⭐ 加载提示 */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground font-serif">加载中...</span>
          </div>
        )}

        {/* ⭐ 底部状态提示 */}
        {!isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            {hasReachedEarliest ? (
              <span className="text-sm text-muted-foreground font-serif">已经到底啦~</span>
            ) : (
              <button
                onClick={() => {
                  const lastMonth = loadedMonths[loadedMonths.length - 1]
                  const prevMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)
                  setLoadedMonths(prev => [...prev, prevMonth])
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
        onChildModalOpen={(open) => setChildModalOpen(open)}
        onOpenVoiceFakeDoor={onOpenVoiceFakeDoor}
        onOpenPhotoFakeDoor={onOpenPhotoFakeDoor}
        user={user}
        userProfile={profile}
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
        practiceOptions={practiceOptions}
        practiceHistory={practiceHistory}
        onChildModalOpen={(open) => setChildModalOpen(open)}
        onOpenVoiceFakeDoor={onOpenVoiceFakeDoor}
        onOpenPhotoFakeDoor={onOpenPhotoFakeDoor}
        user={user}
        userProfile={profile}
      />

      {/* ⭐ 月度统计分享弹窗 */}
      <MonthlyStatsShareModal
        isOpen={showStatsShare}
        onClose={() => setShowStatsShare(false)}
        practiceHistory={practiceHistory}
        year={loadedMonths[0]?.getFullYear() || new Date().getFullYear()}
        month={loadedMonths[0]?.getMonth() || new Date().getMonth()}
        profile={profile}
      />

{/* Back to Top Button - Floating, Jade Glassmorphism */}
      <AnimatePresence>
  {showBackToTop && (
          <motion.button
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

      {/* ⭐ 图片预览 Modal */}
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
            {/* 关闭按钮 */}
            <motion.button
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
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// PRO Badge Component — 遵循设计规范
function ProBadge({ isPro, daysRemaining }: { isPro: boolean; daysRemaining?: number }) {
  if (!isPro) {
    return (
      <span className="ml-2 px-2 py-0.5 text-[10px] font-serif rounded-full bg-[#E8EDE7] text-[#6B7280] border border-[#E5E5E5]">
        FREE
      </span>
    )
  }

  return (
    <span className="ml-2 px-2 py-0.5 text-[10px] font-serif rounded-full bg-gradient-to-r from-[#C1A268] to-[#D4AF37] text-white shadow-sm">
      PRO
    </span>
  )
}

function StatsTab({
  practiceHistory,
  profile,
  membership,
  onOpenSettings,
  onOpenMembership,
  onOpenFakeDoor,
  showXiaohongshuModal,
  setShowXiaohongshuModal,
  hasNewXhsMessage,
  user,
  setReadInviteVersion,
  showPWAInstallTutorial,
  setShowPWAInstallTutorial,
}: {
  practiceHistory: PracticeRecord[]
  profile: UserProfile
  membership: { is_active: boolean; expires_at_formatted: string | null; days_remaining: number; type: 'quarter' | 'year' | null } | null
  onOpenSettings: () => void
  onOpenMembership: () => void
  onOpenFakeDoor: () => void
  showXiaohongshuModal: boolean
  setShowXiaohongshuModal: (value: boolean) => void
  hasNewXhsMessage: boolean
  user?: any
  showPWAInstallTutorial: boolean
  setShowPWAInstallTutorial: (value: boolean) => void
  setReadInviteVersion: (version: string) => void
}) {
  // 隐藏邮箱的辅助函数
  const maskEmail = (email: string): string => {
    if (!email) return ''

    const [username, domain] = email.split('@')
    if (!username || !domain) return email

    // 用户名长度处理：前3位 + **** + 后3位
    if (username.length <= 6) {
      // 用户名太短，只显示前3位
      return username.slice(0, 3) + '***@' + domain
    }

    const prefix = username.slice(0, 3)
    const suffix = username.slice(-3)
    return `${prefix}****${suffix}@${domain}`
  }

  const { isInstallable, promptInstall } = usePWAInstall()

    const handleInstallClick = async () => {
    // 检查是否已经安装到主屏幕
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches

    if (isInstalled) {
      // 已安装到主屏幕，推荐给朋友
      toast('💚 已安装到主屏幕！推荐给朋友一起练习吧', {
        duration: 3000,
      })
      return
    }

    const installed = await promptInstall()
    if (installed) {
      toast.success('✅ 已安装到主屏幕！现在可以从主屏幕打开了')
    } else {
      // 无法自动弹出安装提示，显示图片教程弹窗
      setShowPWAInstallTutorial(true)
    }
  }
  const [viewMode, setViewMode] = useState<'quarter' | 'half' | 'year'>('quarter')
  const [dateOffset, setDateOffset] = useState(0)
  const [hasVotedPro] = useLocalStorage('has_voted_pro', false)

  const today = new Date()
  const todayStr = getLocalDateStr()

  // Generate heatmap data for the year
  const heatmapData = useMemo(() => {
    const data: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      data[p.date] = true
    })
    return data
  }, [practiceHistory])
  
  // Calculate stats - Current month only (from 1st to today)
  const currentMonthStats = useMemo(() => {
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    let practiceDays = 0
    let totalSeconds = 0

    practiceHistory.forEach((record) => {
      const date = new Date(record.date)
      // Check if record is in current month and year, and not in future (by string comparison for safety)
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && record.date <= todayStr) {
        if (record.duration > 0) {
          practiceDays++
          totalSeconds += record.duration
        }
      }
    })

    const totalMinutes = Math.round(totalSeconds / 60)
    const avgDuration = practiceDays > 0 ? Math.round(totalSeconds / practiceDays / 60) : 0

    return { practiceDays, totalMinutes, avgDuration }
  }, [practiceHistory, today, todayStr])

  // Total stats (all time) - 包含历史数据校准
  const totalStats = useMemo(() => {
    let localDays = 0
    let localSeconds = 0

    practiceHistory.forEach((record) => {
      if (record.duration > 0) {
        localDays++
        localSeconds += record.duration
      }
    })

    // 添加历史数据
    const historicalDays = profile?.historical_days || 0
    const historicalAvgMinutes = profile?.historical_avg_minutes || 0
    const totalDays = localDays + historicalDays
    const localMinutes = Math.round(localSeconds / 60)
    const historicalMinutes = historicalDays * historicalAvgMinutes
    const totalMinutes = localMinutes + historicalMinutes

    const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0

    return {
      localDays,
      totalDays,
      totalHours: Math.round(totalMinutes / 60),
      avgMinutes,
    }
  }, [practiceHistory, profile])

  // Generate flowing dots based on view mode
  const flowingDots = useMemo(() => {
    const daysCount = viewMode === 'quarter' ? 90 : viewMode === 'half' ? 180 : 365
    const daysOffset = viewMode === 'quarter' ? dateOffset * 90 : viewMode === 'half' ? dateOffset * 180 : dateOffset * 365
    const result: string[] = []

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i - daysOffset)
      result.push(getLocalDateStr(d))
    }
    return result
  }, [viewMode, dateOffset, today])

  // Dynamic text based on view
  const dynamicText = useMemo(() => {
    switch (viewMode) {
      case 'quarter': return '觉察每个当下'
      case 'half': return '呼吸串联身体'
      case 'year': return '练习是连贯的珍珠'
    }
  }, [viewMode])

  // Dot sizes based on view
  const dotConfig = useMemo(() => {
    switch (viewMode) {
      case 'quarter': return { size: 'w-6 h-6', gap: 'gap-2', rounded: 'rounded-xl', cols: 'grid-cols-10' }
      case 'half': return { size: 'w-5 h-5', gap: 'gap-2', rounded: 'rounded-lg', cols: 'grid-cols-11' }
      case 'year': return { size: 'w-4 h-4', gap: 'gap-2', rounded: 'rounded-full', cols: 'grid-cols-12' }
    }
  }, [viewMode])

  const canGoNext = dateOffset > 0

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4">
      {/* Header - install and settings icons */}
      <div className="px-6 flex items-center justify-between mb-4 pt-10">
        {/* Install button - always show */}
        <button
          onClick={handleInstallClick}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="安装到主屏幕"
        >
          <Download className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
<PWAInstallTutorialModal
        isOpen={showPWAInstallTutorial}
        onClose={() => setShowPWAInstallTutorial(false)}
      />

      <div className="px-6 pb-48">
        {/* Profile Section with PRO Badge - NOW FIRST */}
        <div className="flex flex-col items-center mb-6">
          {/* 头像容器 */}
          <div className="relative mb-3">
            {/* 头像 */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar || "/placeholder.svg"} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>

            {/* 气泡通知图标 - 头像右上角（更靠外） */}
            <button
              onClick={() => {
                setShowXiaohongshuModal(true)
                setReadInviteVersion(INVITE_VERSION) // 保存当前版本号
              }}
              className="absolute -top-6 -right-6 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
              aria-label="小红书群邀请"
            >
              <MessageCircle className="w-4.5 h-4.5 text-[#e67e22]" />

              {/* 红色状态点 - 气泡中下方 */}
              {hasNewXhsMessage && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 bg-red-400" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif text-[#2D5A27]">{profile.name}</h2>
            <ProBadge isPro={membership?.is_active ?? false} daysRemaining={membership?.days_remaining} />
          </div>

          {/* 会员状态显示 — 遵循设计规范 */}
          {membership?.is_active ? (
            <div className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F9F7F2] to-[#F5F0E8] rounded-full border border-[#C1A268]/30">
              <Crown className="w-4 h-4 text-[#C1A268]" />
              <span className="text-xs text-[#8B7355] font-serif">
                Pro 有效期至 {membership.expires_at_formatted}
              </span>
              <span className="text-[10px] text-[#C1A268]">
                · {membership.days_remaining}天
              </span>
            </div>
          ) : (
            <button
              onClick={onOpenMembership}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-xs text-[#8B7355] hover:text-[#6B5A47] font-serif bg-[#F9F7F2] hover:bg-[#F5F0E8] rounded-full border border-[#C1A268]/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C1A268]" />
              <span>升级 Pro 解锁更多功能</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <p className="text-[10px] font-mono text-gray-400 mt-1">
            ID: {user?.email ? maskEmail(user.email) : (profile.id?.slice(0, 8) || 'ANONYMOUS')}
          </p>
          <p className="text-sm text-muted-foreground font-serif mt-1">{profile.signature}</p>
        </div>

        {/* Stats Cards - NOW SECOND */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.totalDays}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">总熬汤天数</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.totalHours}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">总熬汤时长（小时）</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.avgMinutes}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">平均分钟</div>
          </div>
        </div>

        {/* Flowing Grid Heatmap - NOW THIRD */}
        <div className="bg-white rounded-[20px] shadow-md border border-stone-200 overflow-hidden">
          {/* Single-Row Header: Poetry (Left) + Data (Right) */}
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Philosophy Title - Serif, Italic, clean text */}
            <AnimatePresence mode="wait">
              <motion.h3
                key={dynamicText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-serif italic text-stone-500"
              >
                {dynamicText}
              </motion.h3>
            </AnimatePresence>
            
            {/* Right: Compact View Toggles - Monospace numbers for "Data" feel */}
            <div className="flex bg-transparent rounded-full">
              {(['quarter', 'half', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setDateOffset(0) }}
                  className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${
                    viewMode === mode
                      ? 'green-gradient text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {mode === 'quarter' ? '90' : mode === 'half' ? '180' : '365'}
                </button>
              ))}
            </div>
          </div>

          {/* Flowing Dots Grid - Breathing Fade animation */}
          <div className="p-4 pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  enter: { duration: 0.3, ease: "easeOut" },
                  exit: { duration: 0.15 }
                }}
                className={`grid ${dotConfig.cols} ${dotConfig.gap} justify-items-center`}
              >
                {flowingDots.map((dateStr) => (
                  <button
                    key={dateStr}
                    onClick={() => {
                      // Could open share card for this date
                    }}
                    className={`${dotConfig.size} ${dotConfig.rounded} transition-colors ${
                      heatmapData[dateStr]
                        ? 'green-gradient-deep shadow-[0_2px_8px_rgba(45,90,39,0.3)]'
                        : 'bg-stone-200'
                    }`}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// Breathing Ripple Component - can be paused
function BreathingRipples({ isPaused }: { isPaused: boolean }) {
  if (isPaused) return null
  
  return (
    <>
      <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ripple" />
      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ripple-delayed" />
    </>
  )
}

function clean_html(text: string): string {
  if (!text) return ''
  // 移除 HTML 标签
  text = text.replace(/<[^>]*>/g, '')
  // 解码 HTML 实体
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&quot;/g, '"')
  // 移除多余空行（保留单个换行）
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export default function AshtangaTracker() {
  const {
    records: practiceHistory,
    options: practiceOptionsData,
    profile: userProfile,
    addRecord,
    updateRecord,
    deleteRecord,
    updateProfile,
    addOption,
    updateOption,
    deleteOption,
    exportData,
    importData,
    clearAllData
  } = usePracticeData()

  // ==================== 会员状态 ====================
  const { membership, isPro: membershipIsPro, refresh: refreshMembership } = useMembership()

  // ==================== 认证状态 ====================
  const { user, loading: authLoading } = useAuth()

  const [practiceOptions, setPracticeOptions] = useState<PracticeOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [customPracticeName, setCustomPracticeName] = useState("")
  const [isPracticing, setIsPracticing] = useLocalStorage('ashtanga_is_practicing', false)
  const [isPaused, setIsPaused] = useLocalStorage('ashtanga_is_paused', false)
  const [startTime, setStartTime] = useLocalStorage<number | null>('ashtanga_start_time', null)
  const [pauseStartTime, setPauseStartTime] = useLocalStorage<number | null>('ashtanga_pause_start_time', null)
  const [totalPausedTime, setTotalPausedTime] = useLocalStorage<number>('ashtanga_total_paused_time', 0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingOption, setEditingOption] = useState<PracticeOption | null>(null)
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [finalDuration, setFinalDuration] = useState("")
  const [activeTab, setActiveTab] = useState<'practice' | 'journal' | 'stats'>('practice')

  // ⭐ 读取 URL 参数，切换 Tab（客户端 only，只执行一次）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const tab = searchParams.get('tab')
    if (tab === 'stats') {
      setActiveTab('stats')
    } else if (tab === 'journal') {
      setActiveTab('journal')
    } else if (tab === 'practice') {
      setActiveTab('practice')
    }
    // 清除 URL 参数，避免刷新时再次触发
    if (tab) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // 只在组件挂载时执行一次

  const [showSettings, setShowSettings] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<'profile' | 'membership' | 'account' | 'data'>('profile')
  const [showAccountSync, setShowAccountSync] = useState(false)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [showFakeDoor, setShowFakeDoor] = useState<{ type: 'cloud' | 'pro' | 'voice' | 'photo', isOpen: boolean }>({ type: 'cloud', isOpen: false })
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDebugLogModal, setShowDebugLogModal] = useState(false)
  const [debugLogContent, setDebugLogContent] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportedData, setExportedData] = useState('')
  const [votedCloud, setVotedCloud] = useLocalStorage('voted_cloud_sync', false)

  // Auth Modal 状态
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPWAInstallTutorial, setShowPWAInstallTutorial] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login')

  // 数据冲突处理状态
  const [showDataConflict, setShowDataConflict] = useState(false)
  const [conflictLocalCount, setConflictLocalCount] = useState(0)
  const [conflictRemoteCount, setConflictRemoteCount] = useState(0)

  // 清空数据确认弹窗状态
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false)
  const [clearDataStep, setClearDataStep] = useState<1 | 2 | 3>(1)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 音频播放器状态
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)  // 0-100
  const [audioDuration, setAudioDuration] = useState(0)  // 总时长（秒）
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)  // 当前时间（秒）
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)  // 加载中状态
  const [audioError, setAudioError] = useState<string | null>(null)  // 加载错误
  const [seekStep, setSeekStep] = useState<number>(15)  // 快进/后退步长（默认15秒）
  const [audioDownloadProgress, setAudioDownloadProgress] = useState<number>(0)  // 下载进度（0-100）
  const [isUsingCache, setIsUsingCache] = useState<boolean>(false)  // 是否使用缓存

  // ⭐ 用于保存练习开始时间（在 handleConfirmEnd 重置 startTime state 后仍能使用）
  const startTimeRef = useRef<number | null>(null)

  const [exportLogs, setExportLogs] = useLocalStorage<{
    timestamp: string
    success: boolean
    error?: string
    userAgent: string
    recordDate?: string
  }[]>('ashtanga_export_logs', [])

  // ⭐ 页面可见性变化时刷新会员状态（从设置页返回时）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Practice] 页面重新可见，刷新会员状态')
        refreshMembership()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshMembership])

  // 小红书群邀请弹窗状态
  const [showXiaohongshuModal, setShowXiaohongshuModal] = useState(false)

  // 已读版本号（localStorage持久化）
  const [readInviteVersion, setReadInviteVersion] = useLocalStorage('xhs_invite_version', '')

  // 派生状态：判断是否显示红点（版本号不同时显示）
  const hasNewXhsMessage = readInviteVersion !== INVITE_VERSION

  // ==================== 同步状态 ====================
  const localDataForSync = {
    records: practiceHistory,
    options: practiceOptions,
    profile: userProfile
  }

  const { syncStatus, lastSyncTime, failedSyncIds, setFailedSyncIds, setLastSyncStatus, resolveConflict, syncStats, autoSync } = useSync(
    user,
    localDataForSync,
    async (data) => {
      // 同步完成后的回调：更新本地数据
      if (data.records) {
        console.log('🔄 同步完成，更新本地数据...')
        console.log('   云端记录数:', data.records.length)

        try {
          // ⭐ 保存当前正在编辑的记录ID（在清空数据前）
          const editingRecordId = editingRecord?.id

          // 清空本地数据
          clearAllData()
          console.log('   ✅ 本地数据已清空')

          // 导入云端数据（importData 需要 JSON 字符串）
          const jsonData = JSON.stringify(data)
          const importResult = importData(jsonData)

          if (importResult) {
            console.log('   ✅ 云端数据已导入')

            // ⭐ 重新设置正在编辑的记录（从新的记录列表中查找）
            if (editingRecordId) {
              const newEditingRecord = data.records.find((r: PracticeRecord) => r.id === editingRecordId)
              console.error('   🔍 [Sync] 查找编辑记录:', {
                editingRecordId,
                found: !!newEditingRecord,
                cloudRecordCount: data.records.length
              })
              if (newEditingRecord) {
                setEditingRecord(newEditingRecord)
                console.error('   ✅ [Sync] 已恢复编辑状态')
                toast.success('同步完成，编辑状态已恢复')
              } else {
                console.error('   ❌ [Sync] 编辑的记录在云端找不到，保持本地编辑状态')
                toast.warning('同步提示：新记录尚未上传到云端，继续编辑')
                // 不要关闭弹窗，让用户继续编辑
                // setEditingRecord(null)
              }
            }

            toast.success(`✅ 已同步${data.records.length}条云端数据`, {
              duration: 3000,
              position: 'top-center'
            })
          } else {
            throw new Error('导入云端数据失败')
          }
        } catch (error: any) {
          console.error('   ❌ 更新本地数据失败:', error)
          toast.error('❌ 同步数据失败，请重试', {
            duration: 3000,
            position: 'top-center'
          })
        }
      }
    },
    (localCount, remoteCount) => {
      // 检测到数据冲突
      setConflictLocalCount(localCount)
      setConflictRemoteCount(remoteCount)
      setShowDataConflict(true)
    }
  )

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // 跟踪子组件内部的弹窗状态（无法直接访问）
  const [childModalOpen, setChildModalOpen] = useState(false)

  // 派生状态：判断是否有需要隐藏导航栏的弹窗打开
  const hasAnyModalOpen = useMemo(() => {
    return (
      showEditModal ||
      editingOption !== null ||
      showAddModal ||
      showSettings ||
      childModalOpen ||  // 子组件的弹窗（包含确认删除等）
      editingRecord !== null ||  // 编辑记录弹窗
      showConfirmEnd ||  // 确认结束弹窗
      showCompletion    // 完成练习弹窗
    )
  }, [
    showEditModal,
    showEditModal,
    editingOption,
    showAddModal,
    showSettings,
    childModalOpen,
    editingRecord,
    showConfirmEnd,
    showCompletion
  ])

  // Initialize practice options from hook data
  useEffect(() => {
    // 先过滤掉id为"custom"和"guided_audio"的选项（如果存在），以及visible=false的选项
    const regularOptions = practiceOptionsData.filter(o => o.id !== "custom" && o.id !== "guided_audio" && o.visible !== false)

    // 检查是否已存在口令跟练选项
    const hasGuidedAudio = practiceOptionsData.some(o => o.id === "guided_audio")

    setPracticeOptions([
      // 在最前面添加口令跟练选项（如果不存在）
      ...(hasGuidedAudio ? [] : [{
        id: GUIDED_AUDIO_OPTION.id,
        label: GUIDED_AUDIO_OPTION.label,
        notes: GUIDED_AUDIO_OPTION.notes,
        isCustom: false,
        is_preset: true,
        can_edit: false
      }]),
      ...regularOptions.map(o => ({
        id: o.id,
        label: o.label,
        notes: o.notes,
        isCustom: o.is_custom,
        is_preset: o.is_preset,
        can_edit: o.can_edit
      })),
      // 始终在最后添加"自定义"按钮
      { id: "custom", label: "自定义", notes: null, isCustom: false }
    ])
  }, [practiceOptionsData])

  // Keep screen awake during practice
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    const requestWakeLock = async () => {
      if (isPracticing && "wakeLock" in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request("screen")
        } catch {
          // Wake Lock not supported or failed
        }
      }
    }

    if (isPracticing) {
      requestWakeLock()
    }

    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [isPracticing])

  // Timer logic - Timestamp based for background/lock screen support
  useInterval(() => {
    if (isPracticing && !isPaused && startTime) {
      const now = Date.now()
      const diff = Math.floor((now - startTime - (totalPausedTime || 0)) / 1000)
      setElapsedTime(Math.max(0, diff))
    }
  }, isPracticing && !isPaused ? 1000 : null)

  // Sync elapsed time on resume/mount
  useEffect(() => {
    if (isPracticing && startTime) {
      const now = Date.now()
      const pausedAt = isPaused ? (pauseStartTime || now) : now
      const currentTotalPaused = (totalPausedTime || 0) + (isPaused ? (now - (pauseStartTime || now)) : 0)
      const diff = Math.floor((pausedAt - startTime - (totalPausedTime || 0)) / 1000)
      setElapsedTime(Math.max(0, diff))
    }
  }, [])

  const handleOptionTap = (option: PracticeOption) => {
    const now = Date.now()
    const lastTap = lastTapRef.current

    // Check for double tap (within 300ms on the same option)
    if (lastTap && lastTap.id === option.id && now - lastTap.time < 300) {
      // Double tap - open edit modal (but not for custom button and preset options)
      lastTapRef.current = null
      // 预设选项不能编辑
      if (option.id !== "custom" && !option.is_preset && option.can_edit !== false) {
        setEditingOption(option)
        setShowEditModal(true)
      } else if (option.is_preset || option.can_edit === false) {
        toast('预设按钮暂不支持编辑')
      }
      return
    }

    // Single tap
    lastTapRef.current = { id: option.id, time: now }

    // Select the option
    if (option.id === "custom") {
      // 点击自定义按钮，打开自定义弹窗
      setShowCustomModal(true)
    } else {
      setSelectedOption(option.id)
      setCustomPracticeName("")
    }
  }

  const handleEditSave = (id: string, name: string, notes: string) => {
    // Update localStorage
    updateOption(id, name, notes)

    // Update local state
    setPracticeOptions(prev => prev.map(o =>
      o.id === id ? { ...o, label: name, notes } : o
    ))

    toast.success('已保存修改')
  }

  const handleEditDelete = async (id: string) => {
    // Cannot delete if only 2 non-custom options remain
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    if (nonCustomOptions.length <= 2) {
      toast.error('至少需要保留2个练习选项')
      return
    }

    // Update localStorage
    deleteOption(id)

    // Update local state
    setPracticeOptions(prev => prev.filter(o => o.id !== id))
    if (selectedOption === id) {
      setSelectedOption(null)
    }

    toast.success('已删除选项')

    // ⭐ 新增：如果已登录，从云端删除并触发同步
    if (user) {
      console.log('[handleEditDelete] 用户已登录，从云端删除选项...')
      try {
        // 调用 Supabase 删除选项
        const { error } = await supabase
          .from('practice_options')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (error) {
          console.error('[handleEditDelete] 云端删除失败:', error)
          toast.error('云端删除失败，选项仅在本设备删除')
        } else {
          console.log('[handleEditDelete] 云端删除成功')
          // 触发同步确保状态一致
          await autoSync()
        }
      } catch (err) {
        console.error('[handleEditDelete] 删除异常:', err)
        toast.error('删除同步失败，选项仅在本设备删除')
      }
    }
  }

  const handleCustomConfirm = (name: string, notes: string) => {
    // Check if we can add more options (max 4 for free users, excluding the "custom" button itself)
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom" && o.visible !== false)
    if (nonCustomOptions.length >= MAX_SLOTS_FREE) {
      // Options are full, show toast and start practice without saving
      toast.error(`当前版本只能添加${MAX_SLOTS_FREE}个练习选项`)
      setSelectedOption("custom-temp")
      setCustomPracticeName(name)
      setShowCustomModal(false)
      return
    }

    // Create a new permanent custom option and save to localStorage
    const result = addOption(name, name, notes)
    if (!result) {
      toast.error('添加选项失败，可能已达到上限')
      return
    }

    // Update local state will be handled by useEffect when practiceOptionsData changes
    setCustomPracticeName(name)
    setShowCustomModal(false)

    toast.success('已添加自定义选项')
  }

  const handleEditRecord = (id: string, data: Partial<PracticeRecord>) => {
    updateRecord(id, data, () => {
      // 编辑后触发同步
      if (user) {
        autoSync()
      }
    })
    toast.success('更新成功')
  }

  const handleDeleteRecord = async (id: string, skipConfirm = false) => {
    // Confirm before deleting (skip for draft records)
    if (!skipConfirm && !confirm('确定要删除这条记录吗？')) return

    // 1. 从本地状态移除
    deleteRecord(id)

    // 2. 软删除 Supabase 中的记录（设置 deleted_at）
    const success = await deletePracticeRecord(id)
    if (success) {
      // 只有正式记录才显示删除成功提示（草稿记录静默删除）
      if (!skipConfirm) {
        toast.success('已删除记录')
      }
      // 3. 触发同步（如果用户已登录）
      if (user) {
        autoSync()
      }
    } else {
      toast.error('删除同步失败，记录仅在本设备删除')
    }
  }

  const handleAddRecord = (record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>) => {
    const newRecord = addRecord(record)
    trackEvent('add_record', {
      type: record.type,
      duration: record.duration,
      date: record.date,
      has_breakthrough: !!record.breakthrough,
      has_notes: !!record.notes && record.notes.length > 0
    })

    // ⭐ 更新 Mixpanel User Profile（实时同步总数）
    setTimeout(() => {
      const recordsData = localStorage.getItem('ashtanga_records')
      if (recordsData) {
        try {
          const records = JSON.parse(recordsData)
          if (Array.isArray(records)) {
            const totalRecords = records.length
            const recordsWithNotes = records.filter((r: any) =>
              r.notes && r.notes.trim().length > 0
            ).length
            const recordsWithBreakthrough = records.filter((r: any) =>
              r.breakthrough && r.breakthrough.trim().length > 0
            ).length

            setUserProfile({
              total_records: totalRecords,
              records_with_notes: recordsWithNotes,
              records_with_breakthrough: recordsWithBreakthrough,
              notes_rate: totalRecords > 0 ? Math.round((recordsWithNotes / totalRecords) * 100) : 0,
              last_patch_at: new Date().toISOString()
            })
          }
        } catch (e) {
          console.error('[add_record] 更新 Mixpanel Profile 失败:', e)
        }
      }
    }, 100)

    // 只有非草稿记录才显示 toast
    if (record.type !== '草稿') {
      toast.success('补卡成功！')
    }
    // 延迟 500ms 同步，确保 localStorage 已完全更新
    // ⭐ 只有绑定邮箱的用户才同步到云端
    if (user?.email) {
      setTimeout(() => {
        autoSync()
      }, 500)
    }
    return newRecord
  }

  const handleAddOption = async (name: string, notes: string) => {
    // Check if we can add more options
    const visibleOptions = practiceOptions.filter(o => o.id !== "custom" && o.id !== "guided_audio" && o.visible !== false)
    if (visibleOptions.length >= MAX_SLOTS_FREE) {
      toast.error(`当前版本只能添加${MAX_SLOTS_FREE}个练习选项`)
      return
    }

    const result = addOption(name, name, notes)
    if (!result) {
      toast.error('添加选项失败，可能已达到上限')
      return
    }

    toast.success('已添加自定义选项')
    // 如果已登录，自动同步到云端
    if (user) {
      setTimeout(async () => {
        await autoSync()
      }, 500)
    }
  }

  const handleVoteCloud = () => {
    // Update the votedCloud state directly
    setVotedCloud(true)
  }

  const handleResolveConflict = (strategy: 'remote' | 'local' | 'merge') => {
    setShowDataConflict(false)
    if (resolveConflict) {
      resolveConflict(strategy)
    }
  }

  const handleExportDebugLog = async () => {
    // ⭐ 先发起 Supabase 连接测试（异步）
    let supabaseConnectionTest = { status: 'testing', latency: -1, error: null as string | null }
    try {
      const testStart = Date.now()
      // 执行一个简单的查询来测试连接
      const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
      const latency = Date.now() - testStart
      if (error) {
        supabaseConnectionTest = { status: 'error', latency, error: error.message }
      } else {
        supabaseConnectionTest = { status: 'success', latency, error: null }
      }
    } catch (e: any) {
      supabaseConnectionTest = { status: 'exception', latency: -1, error: e?.message || String(e) }
    }

    // ===== 1. Service Worker 状态 =====
    let serviceWorkerStatus: any = { supported: false, controller: null, state: null, scope: null }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      serviceWorkerStatus.supported = true
      const controller = navigator.serviceWorker.controller
      if (controller) {
        serviceWorkerStatus.controller = true
        serviceWorkerStatus.state = controller.state
        serviceWorkerStatus.scope = controller.scriptURL
      } else {
        serviceWorkerStatus.controller = false
      }
      // 尝试获取注册信息
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        serviceWorkerStatus.registrations = registrations.map(r => ({
          scope: r.scope,
          active: !!r.active,
          installing: !!r.installing,
          waiting: !!r.waiting,
          updateViaCache: r.updateViaCache
        }))
      } catch (e) {
        serviceWorkerStatus.registrationsError = String(e)
      }
    }

    // ===== 2. 环境信息 =====
    const environment = {
      userAgent: navigator.userAgent,
      browser: {
        language: navigator.language,
        languages: navigator.languages,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        pdfViewerEnabled: navigator.pdfViewerEnabled
      },
      deviceType: /mobile|tablet|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        orientation: window.screen.orientation?.type || 'unknown'
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        visualViewport: {
          width: window.visualViewport?.width,
          height: window.visualViewport?.height,
          scale: window.visualViewport?.scale
        }
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      exportTime: new Date().toISOString(),
      appVersion: '1.0.1'
    }

    // ===== 2. 网络状态 =====
    const networkInfo = {
      onLine: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
        saveData: (navigator as any).connection.saveData
      } : 'Not supported'
    }

    // ⭐ 2.5 Supabase 连接测试
    const supabaseConnection = {
      testStatus: supabaseConnectionTest.status,
      latency: supabaseConnectionTest.latency,
      error: supabaseConnectionTest.error,
      timestamp: new Date().toISOString()
    }

    // ===== 3. 认证状态 =====
    const authState = {
      isLoggedIn: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      lastSignInAt: user?.last_sign_in_at || null,
      createdAt: user?.created_at || null,
      appMetadata: user?.app_metadata || null,
      userMetadata: user?.user_metadata || null
    }

    // ===== 4. 同步状态 =====
    const syncState = {
      syncStatus,
      lastSyncTime,
      failedSyncIds: failedSyncIds || [],
      failedSyncCount: failedSyncIds?.length || 0,
      conflictLocalCount,
      conflictRemoteCount,
      showDataConflict
    }

    // ===== 5. 应用数据状态 =====
    const nonDraftRecords = practiceHistory.filter(r => r.type !== '草稿')
    const appState = {
      records: {
        totalCount: nonDraftRecords.length,
        withPhotos: nonDraftRecords.filter(r => r.photos?.length > 0).length,
        withNotes: nonDraftRecords.filter(r => r.notes?.trim()).length,
        withBreakthrough: nonDraftRecords.filter(r => r.breakthrough).length,
        totalDuration: nonDraftRecords.reduce((sum, r) => sum + (r.duration || 0), 0),
        averageDuration: nonDraftRecords.length > 0
          ? Math.round(nonDraftRecords.reduce((sum, r) => sum + (r.duration || 0), 0) / nonDraftRecords.length)
          : 0,
        dateRange: nonDraftRecords.length > 0 ? {
          earliest: nonDraftRecords[nonDraftRecords.length - 1]?.date,
          latest: nonDraftRecords[0]?.date
        } : null
      },
      options: {
        totalCount: practiceOptions.length,
        customCount: practiceOptions.filter(o => o.is_custom).length,
        systemCount: practiceOptions.filter(o => !o.is_custom).length,
        list: practiceOptions.map(o => ({
          id: o.id,
          label: o.label.substring(0, 50),
          hasNotes: !!o.notes,
          isCustom: o.is_custom
        }))
      },
      profile: {
        name: userProfile?.name || '未设置',
        hasSignature: !!userProfile?.signature,
        hasAvatar: !!userProfile?.avatar,
        isPro: userProfile?.is_pro || false
      }
    }

    // ===== 6. LocalStorage 完整分析 =====
    const allKeys = Object.keys(localStorage)
    const storageState = {
      totalKeys: allKeys.length,
      appKeys: allKeys.filter(key => key.startsWith('ashtanga_') || key.includes('practice')),
      otherKeys: allKeys.filter(key => !key.startsWith('ashtanga_') && !key.includes('practice')).slice(0, 20),
      keyDetails: allKeys
        .filter(key => key.startsWith('ashtanga_') || key.includes('practice'))
        .map(key => {
          try {
            const value = localStorage.getItem(key)
            return {
              key,
              size: value ? new Blob([value]).size : 0,
              type: value?.startsWith('{') || value?.startsWith('[') ? 'json' : 'string'
            }
          } catch (e) {
            return { key, size: 0, type: 'error', error: String(e) }
          }
        }),
      estimatedTotalSize: new Blob(Object.values(localStorage)).size
    }

    // ===== 7. 最近的练习记录（最近10条） =====
    // 注意：隐藏具体觉察内容，只保留是否有内容的标记，保护用户隐私
    const recentRecords = practiceHistory.slice(0, 10).map(r => ({
      id: r.id,
      date: r.date,
      type: r.type?.substring(0, 30),
      duration: r.duration,
      hasNotes: !!r.notes,
      notesLength: r.notes?.length || 0, // 只显示字数，不显示内容
      hasPhotos: !!r.photos?.length,
      photosCount: r.photos?.length || 0,
      hasBreakthrough: !!r.breakthrough,
      createdAt: r.created_at
    }))

    // ===== 8. 导出历史（最近10条） =====
    const recentExportLogs = (exportLogs || []).slice(-10).map(log => ({
      timestamp: log.timestamp,
      success: log.success,
      error: log.error,
      recordDate: log.recordDate,
      deviceType: log.userAgent ?
        (/mobile|tablet|android|iphone/i.test(log.userAgent) ? 'mobile' : 'desktop') : 'unknown'
    }))

    // ===== 9. 错误历史（从 localStorage 读取） =====
    let errorHistory: any[] = []
    try {
      const storedErrors = localStorage.getItem('__errorHistory')
      if (storedErrors) {
        errorHistory = JSON.parse(storedErrors)
      }
    } catch (e) {
      errorHistory = [{ error: '读取错误历史失败', details: String(e) }]
    }

    // ===== 10. 性能指标 =====
    const performanceInfo = {
      navigation: performance.getEntriesByType('navigation')[0] ? {
        domComplete: Math.round((performance.getEntriesByType('navigation')[0] as any).domComplete),
        loadEventEnd: Math.round((performance.getEntriesByType('navigation')[0] as any).loadEventEnd),
        domInteractive: Math.round((performance.getEntriesByType('navigation')[0] as any).domInteractive)
      } : 'Not available',
      memory: (performance as any).memory ? {
        usedJSHeapSize: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        totalJSHeapSize: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + ' MB'
      } : 'Not available'
    }

    // ===== 11. 当前应用状态 =====
    const currentAppState = {
      activeTab,
      isPracticing: false,
      showSettings,
      showAccountSync,
      showAuthModal,
      authMode,
      showDataConflict,
      showClearDataConfirm,
      clearDataStep,
      currentPath: window.location.pathname,
      currentHash: window.location.hash,
      // 练习状态
      selectedOption,
      isPaused,
      elapsedTime,
      totalPausedTime,
      // 选项状态（用于诊断新增选项问题）
      optionsStatus: {
        totalCount: practiceOptions.length,
        customCount: practiceOptions.filter(o => o.is_custom).length,
        systemCount: practiceOptions.filter(o => !o.is_custom).length,
        isFull: practiceOptions.filter(o => o.id !== "custom").length >= 8,
        canDelete: practiceOptions.filter(o => o.id !== "custom").length > 2,
        selectedOptionId: selectedOption,
        customPracticeName: customPracticeName || null
      },
      // 弹窗状态
      modals: {
        showImportModal: showImportModal,
        showExportModal: showExportModal,
        showDebugLogModal: showDebugLogModal,
        showCompletion: showCompletion,
        showFakeDoor: showFakeDoor.isOpen
      },
      // 数据存储状态
      storage: {
        hasLocalData: practiceHistory.length > 0,
        localStorageKeysCount: Object.keys(localStorage).length,
        sessionStorageKeysCount: Object.keys(sessionStorage).length
      }
    }

    // ===== 12. 同步日志（从 localStorage 读取） =====
    let syncLogs: any[] = []
    try {
      const storedLogs = localStorage.getItem('sync_logs')
      if (storedLogs) {
        syncLogs = JSON.parse(storedLogs)
      }
    } catch (e) {
      syncLogs = [{ action: '读取同步日志失败', error: String(e), timestamp: new Date().toISOString() }]
    }

    // ===== 13. 照片操作日志 =====
    let photoLogs: any[] = []
    try {
      const { getPhotoLogs, getPhotoErrorLogs } = await import('@/lib/photo-logger')
      photoLogs = {
        all: getPhotoLogs().slice(0, 50),
        errors: getPhotoErrorLogs().slice(0, 20),
        summary: {
          total: getPhotoLogs().length,
          errors: getPhotoErrorLogs().length,
        }
      }
    } catch (e) {
      photoLogs = { error: '读取照片日志失败', details: String(e) }
    }

    // 生成完整日志
    const debugLog = {
      _meta: {
        version: '2.3',
        exportTime: new Date().toISOString(),
        description: '熬汤日记调试日志 - 用于问题排查',
        gitVersion: getVersionInfo()
      },
      serviceWorkerStatus,
      environment,
      networkInfo,
      supabaseConnection,
      authState,
      syncState,
      appState,
      storageState,
      recentRecords,
      recentExportLogs,
      errorHistory,
      performanceInfo,
      currentAppState,
      syncLogs,
      photoLogs
    }

    // 转换为JSON字符串并显示在弹窗中
    const jsonString = JSON.stringify(debugLog, null, 2)
    setDebugLogContent(jsonString)
    setShowDebugLogModal(true)
  }

  const canDeleteOption = useMemo(() => {
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    return nonCustomOptions.length > 2
  }, [practiceOptions])

  const isOptionsFull = useMemo(() => {
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom" && o.id !== "guided_audio" && o.visible !== false)
    return nonCustomOptions.length >= MAX_SLOTS_FREE
  }, [practiceOptions])

  const handleStartPractice = async () => {
    if (selectedOption) {
      // 先进入练习界面（立即给用户反馈）
      const now = Date.now()
      setStartTime(now)
      startTimeRef.current = now // ⭐ 保存到 ref
      setIsPracticing(true)
      setIsPaused(false)
      setTotalPausedTime(0)
      setPauseStartTime(null)
      setElapsedTime(0)

      // 口令跟练模式：加载音频（使用 IndexedDB 缓存）
      if (selectedOption === 'guided_audio') {
        setIsAudioLoading(true)
        setAudioError(null)
        setAudioDownloadProgress(0)
        // 先暂停，等音频加载完成后再开始
        setIsPaused(true)

        try {
          // 检查是否有缓存
          const hasCache = await audioCache.isCacheValid()

          if (hasCache) {
            // 使用缓存
            console.log('[音频] 使用本地缓存')
            setIsUsingCache(true)
            const audioBuffer = await audioCache.getAudioBuffer()

            if (audioBuffer) {
              // 创建 Blob URL
              const blob = new Blob([audioBuffer], { type: 'audio/mp4' })
              const url = URL.createObjectURL(blob)

              const audio = new Audio()
              audio.src = url

              audio.addEventListener('loadedmetadata', () => {
                setAudioDuration(audio.duration)
                setIsAudioLoaded(true)
                setIsAudioLoading(false)
                setIsPaused(false)
                audio.play()
              })

              audio.addEventListener('timeupdate', () => {
                setAudioCurrentTime(audio.currentTime)
                setAudioProgress((audio.currentTime / audio.duration) * 100)
              })

              audio.addEventListener('ended', () => {
                handleEndRequest()
              })

              audio.addEventListener('error', (e) => {
                console.error('[音频] 缓存播放失败:', e)
                // 缓存可能损坏，清除后重试
                audioCache.clearCache()
                setAudioError('音频播放失败，请重试')
                setIsAudioLoading(false)
              })

              setAudioElement(audio)
            } else {
              throw new Error('缓存数据无效')
            }
          } else {
            // 从网络下载并缓存
            console.log('[音频] 从网络下载')
            setIsUsingCache(false)

            try {
              const arrayBuffer = await audioCache.downloadAndCache(
                GUIDED_AUDIO_OPTION.audio_src,
                (loaded, total) => {
                  if (total > 0) {
                    const progress = Math.round((loaded / total) * 100)
                    setAudioDownloadProgress(progress)
                  }
                }
              )

              // 创建 Blob URL 播放
              const blob = new Blob([arrayBuffer], { type: 'audio/mp4' })
              const url = URL.createObjectURL(blob)

              const audio = new Audio()
              audio.src = url

              audio.addEventListener('loadedmetadata', () => {
                setAudioDuration(audio.duration)
                setIsAudioLoaded(true)
                setIsAudioLoading(false)
                setIsPaused(false)
                audio.play()
              })

              audio.addEventListener('timeupdate', () => {
                setAudioCurrentTime(audio.currentTime)
                setAudioProgress((audio.currentTime / audio.duration) * 100)
              })

              audio.addEventListener('ended', () => {
                handleEndRequest()
              })

              audio.addEventListener('error', (e) => {
                console.error('[音频] 播放失败:', e)
                setIsAudioLoading(false)
                setAudioError('音频播放失败')
              })

              setAudioElement(audio)
            } catch (downloadErr) {
              console.error('[音频] 下载失败:', downloadErr)
              setAudioError('音频下载失败，请检查网络连接')
              setIsAudioLoading(false)
            }
          }
        } catch (err) {
          console.error('[音频] 加载失败:', err)
          setAudioError('音频加载失败')
          setIsAudioLoading(false)
        }
      }

      trackEvent('start_practice', { type: getSelectedLabel() })
    }
  }

  const handlePauseResume = () => {
    const now = Date.now()
    if (!isPaused) {
      // Pause
      setPauseStartTime(now)
      // 音频同步暂停
      if (audioElement && selectedOption === 'guided_audio') {
        audioElement.pause()
      }
    } else {
      // Resume
      if (pauseStartTime) {
        const pausedDuration = now - pauseStartTime
        setTotalPausedTime((totalPausedTime || 0) + pausedDuration)
      }
      setPauseStartTime(null)
      // 音频同步继续
      if (audioElement && selectedOption === 'guided_audio') {
        audioElement.play()
      }
    }
    setIsPaused(!isPaused)
    trackEvent(isPaused ? 'resume_practice' : 'pause_practice')
  }

  const getSelectedLabel = useCallback(() => {
    if ((selectedOption === "custom" || selectedOption === "custom-temp") && customPracticeName) {
      return customPracticeName
    }
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.label || ""
  }, [selectedOption, customPracticeName, practiceOptions])

  const getSelectedNotes = useCallback(() => {
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.notes || ""
  }, [selectedOption, practiceOptions])

  // 音频时间格式化
  const formatAudioTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 快进/后退功能
  const handleAudioSeek = (direction: 'forward' | 'backward') => {
    if (audioElement && isAudioLoaded) {
      const seconds = direction === 'forward' ? seekStep : -seekStep
      const newTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + seconds))
      audioElement.currentTime = newTime
      setAudioCurrentTime(newTime)
    }
  }

  // 步长选项
  const SEEK_STEP_OPTIONS = [10, 15, 30]

  const handleEndRequest = () => {
    setShowConfirmEnd(true)
  }

  const handleConfirmEnd = () => {
    setShowConfirmEnd(false)
    setFinalDuration(formatMinutes(elapsedTime))
    setShowCompletion(true)
    setIsPracticing(false)
    // Clear timer persistence
    setStartTime(null)
    // ⭐ 注意：不清空 startTimeRef，供 handleSavePractice 使用
    setPauseStartTime(null)
    setTotalPausedTime(0)

    // 清理音频资源
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      setAudioElement(null)
      setIsAudioLoaded(false)
      setAudioProgress(0)
      setAudioCurrentTime(0)
      setAudioDuration(0)
    }
  }

  const handleSavePractice = useCallback((notes: string, photos: string[], breakthrough?: string) => {
    console.log('handleSavePractice called', { notes, photos, breakthrough, isSaving })
    if (isSaving) {
      console.log('Already saving, returning')
      return
    }
    setIsSaving(true)
    console.log('setIsSaving(true) called')

    try {
      const selectedLabel = getSelectedLabel()
      console.log('getSelectedLabel returned:', selectedLabel)
      console.log('elapsedTime:', elapsedTime)

      // 将开始时间戳转换为 ISO 8601 格式（使用 ref，因为 startTime state 已被重置）
      const startTimeISO = startTimeRef.current
        ? new Date(startTimeRef.current).toISOString()
        : undefined

      // Create new practice record
      const record = addRecord({
        date: getLocalDateStr(),
        type: selectedLabel,
        duration: elapsedTime,
        notes: notes || "今日练习完成",
        breakthrough,
        start_time: startTimeISO, // ⭐ 记录练习开始时间（完整 ISO 格式）
      })

      // ⭐ 清空 ref（保存完成后）
      startTimeRef.current = null

      console.log('Record added:', record)

      trackEvent('finish_practice', {
        type: record.type,
        duration: record.duration,
        is_patch: false
      })

      // ⭐ 更新 Mixpanel User Profile（实时同步总数）
      const recordsData = localStorage.getItem('ashtanga_records')
      if (recordsData) {
        try {
          const records = JSON.parse(recordsData)
          if (Array.isArray(records)) {
            const totalRecords = records.length
            const recordsWithNotes = records.filter((r: any) =>
              r.notes && r.notes.trim().length > 0
            ).length
            const recordsWithBreakthrough = records.filter((r: any) =>
              r.breakthrough && r.breakthrough.trim().length > 0
            ).length

            setUserProfile({
              total_records: totalRecords,
              records_with_notes: recordsWithNotes,
              records_with_breakthrough: recordsWithBreakthrough,
              notes_rate: totalRecords > 0 ? Math.round((recordsWithNotes / totalRecords) * 100) : 0,
              last_practice_at: new Date().toISOString()
            })
          }
        } catch (e) {
          console.error('[finish_practice] 更新 Mixpanel Profile 失败:', e)
        }
      }

      // Reset UI and switch to journal tab
      console.log('Resetting UI and switching to journal tab')
      setShowCompletion(false)
      setSelectedOption(null)
      setCustomPracticeName("")
      setElapsedTime(0)
      setIsPaused(false)
      setActiveTab('journal') // Switch to 觉察日记 tab
      console.log('UI reset complete')

      // Show success toast
      console.log('Showing success toast')
      toast.success('✅ 打卡成功！', {
        duration: 2000,
        position: 'top-center'
      })

      // ⭐ 延迟 500ms 同步，确保 localStorage 已完全更新
      // 只有绑定邮箱的用户才同步到云端
      console.log('[handleSavePractice] 准备同步，user:', user?.email || '未登录')
      if (user?.email) {
        console.log('[handleSavePractice] 用户已绑定邮箱，启动同步')
        setTimeout(() => {
          console.log('[handleSavePractice] 执行 autoSync')
          autoSync()
        }, 500)
      } else {
        console.log('[handleSavePractice] 用户未绑定邮箱，跳过同步')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('❌ 保存失败，请重试', {
        duration: 3000,
        position: 'top-center'
      })
    } finally {
      setIsSaving(false)
      console.log('setIsSaving(false) called')
    }
  }, [elapsedTime, getSelectedLabel, addRecord, isSaving, autoSync, user])

  // Full-screen Timer View with Hero Transition
  if (isPracticing) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background flex flex-col"
      >
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="relative"
          >
            {/* Breathing Ripples - paused when timer is paused */}
            <div className="absolute inset-[-20px]">
              <BreathingRipples isPaused={isPaused} />
            </div>
            
            {/* Main circle with glassmorphism gradient border - scaled down 30% */}
            <div className={`w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full green-gradient p-[2px] shadow-[0_12px_48px_rgba(45,90,39,0.45)] ${!isPaused ? 'animate-breathe' : ''}`}>
              <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-[16px] flex flex-col items-center justify-center border border-white/30 relative">
                {/* Timer display - Minutes large, unit below */}
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-6xl font-light text-foreground tracking-wider font-serif">
                    {formatMinutes(elapsedTime)}
                  </span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-foreground text-lg font-serif">
                      分
                    </span>
                    {formatSeconds(elapsedTime) !== '00' && (
                      <span className="text-muted-foreground text-sm font-serif">
                        {formatSeconds(elapsedTime)}秒
                      </span>
                    )}
                  </div>
                </div>

                {/* Practice type and notes below */}
                <div className="flex flex-col items-center mt-2">
                  <span className="text-[14px] leading-snug text-center text-foreground font-serif">
                    {getSelectedLabel()}
                  </span>
                  {getSelectedNotes() && (
                    <span className="text-[11px] leading-snug text-center text-muted-foreground/70 font-serif mt-0.5">
                      {getSelectedNotes()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* 音频播放器进度条 - 仅在口令跟练模式显示，放在大圆圈和按钮之间 */}
        {selectedOption === 'guided_audio' && isAudioLoaded && !isAudioLoading && !audioError && (
          <motion.div
            className="w-full max-w-sm mx-auto px-6 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 进度条 */}
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>

            {/* 时间显示 */}
            <div className="flex justify-between text-xs text-muted-foreground mt-2 font-serif">
              <span>{formatAudioTime(audioCurrentTime)}</span>
              <span>{formatAudioTime(audioDuration)}</span>
            </div>
          </motion.div>
        )}

        {/* Control buttons - moved up 30% to avoid clipping on mobile */}
        <div className="px-6 pb-32">
          {/* 音频加载状态 - 仅在口令跟练模式显示，替代暂停/结束按钮 */}
          {selectedOption === 'guided_audio' && isAudioLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-3"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground mt-4 font-serif">
                {isUsingCache ? '从缓存读取...' : audioDownloadProgress > 0 ? `下载中 ${audioDownloadProgress}%` : '加载音频中...'}
              </p>
              {/* 下载进度条 */}
              {!isUsingCache && audioDownloadProgress > 0 && (
                <div className="w-48 h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${audioDownloadProgress}%` }}
                  />
                </div>
              )}
              {/* 第一次下载提示 */}
              {!isUsingCache && audioDownloadProgress > 0 && (
                <p className="text-xs text-muted-foreground/70 mt-3 font-serif text-center">
                  💡 首次下载需要一点时间，之后就能快速打开啦
                </p>
              )}
            </motion.div>
          )}

          {/* 音频错误状态 - 仅在口令跟练模式显示 */}
          {selectedOption === 'guided_audio' && audioError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <AlertCircle className="w-12 h-12 text-destructive mb-3" />
              <p className="text-sm text-destructive font-serif text-center">
                {audioError}
              </p>
              <button
                onClick={() => {
                  setAudioError(null)
                  loadAudioAndStart()
                }}
                className="mt-4 px-6 py-2 rounded-full green-gradient text-white text-sm font-serif"
              >
                重试
              </button>
            </motion.div>
          )}

          {/* 暂停/结束按钮 - 音频加载完成后显示 */}
          {(!selectedOption || selectedOption !== 'guided_audio' || (isAudioLoaded && !isAudioLoading && !audioError)) && (
          <>
          {/* 暂停/结束按钮 - 恢复原始样式 */}
          <div className="flex gap-4 justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-card/80 backdrop-blur-md border border-white/10 text-foreground font-serif shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-card transition-colors"
            >
              {isPaused ? (
                <>
                  <Play className="w-5 h-5" />
                  继续
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  暂停
                </>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEndRequest}
              className="px-8 py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif shadow-[0_4px_20px_rgba(45,90,39,0.2)] hover:opacity-90 transition-opacity"
            >
              结束
            </motion.button>
          </div>

          {/* 步长选择器 + 前进/后退按钮 - 仅在口令跟练模式显示 */}
          {selectedOption === 'guided_audio' && isAudioLoaded && !isAudioLoading && !audioError && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {/* 后退按钮 */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleAudioSeek('backward')}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-stone-400 hover:text-stone-600 transition-all active:green-gradient active:text-white"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </motion.button>

              {/* 步长选择器 */}
              <div className="flex items-center gap-1">
                {SEEK_STEP_OPTIONS.map((step) => (
                  <button
                    key={step}
                    onClick={() => setSeekStep(step)}
                    className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${
                      seekStep === step
                        ? 'green-gradient text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {step}秒
                  </button>
                ))}
              </div>

              {/* 前进按钮 */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleAudioSeek('forward')}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-stone-400 hover:text-stone-600 transition-all active:green-gradient active:text-white"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
          </>
          )}
        </div>

        <ConfirmEndDialog isOpen={showConfirmEnd} onClose={() => setShowConfirmEnd(false)} onConfirm={handleConfirmEnd} />

        <CompletionSheet
          isOpen={showCompletion}
          practiceType={getSelectedLabel()}
          duration={finalDuration}
          onSave={handleSavePractice}
          onClose={() => {
            setShowCompletion(false)
            setSelectedOption(null)
            setCustomPracticeName("")
            setElapsedTime(0)
            setIsPaused(false)
            setActiveTab('journal')
          }}
          addRecord={addRecord}
          updateRecord={updateRecord}
          deleteRecord={deleteRecord}
          autoSync={autoSync}
          onOpenVoiceFakeDoor={() => setShowFakeDoor({ type: 'voice', isOpen: true })}
          onOpenPhotoFakeDoor={() => setShowFakeDoor({ type: 'photo', isOpen: true })}
          user={user}
          userProfile={userProfile}
        />
      </motion.div>
    )
  }

  // Dashboard View
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Tab Content - includes header in scroll */}
      {activeTab === 'practice' && (
        <main className="flex-1 px-6 flex flex-col pb-32 overflow-y-auto">
          {/* Header - scrolls with content, can be clipped */}
          <header className="pt-12 pb-4 flex items-center justify-center">
            <div className="flex flex-row items-center gap-3">
              <img src="/icon.png" alt="熬汤日记" className="w-[34px] h-[34px] rounded-lg shadow-sm" />
              <div className="flex flex-col">
                <h1 className="text-lg font-serif text-foreground tracking-wide font-semibold">
                  熬汤日记
                  <span className="text-muted-foreground/50 font-normal">·呼吸</span>
                  <span className="text-muted-foreground/70 font-normal">·觉察</span>
                </h1>
                <p className="text-[9px] text-muted-foreground/50 font-serif tracking-wide leading-tight">
                  Practice, practice, and all is coming.
                </p>
              </div>
            </div>
          </header>
          {/* Selection Grid - Glassmorphism on selected */}
          <div className="grid grid-cols-3 gap-2 p-4">
            {practiceOptions.map((option) => {
              const isSelected = selectedOption === option.id
              const isCustomButton = option.id === "custom"

              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOptionTap(option)}
                  className={`
                    py-[6px] px-1 rounded-[20px] text-center font-serif transition-all duration-300
                    min-h-[72px] w-full flex flex-col items-center justify-center
                    ${
                      isSelected
                        ? "green-gradient text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                        : isCustomButton
                          ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                          : "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
                    }
                  `}
                >
                  <span className="text-[14px] leading-snug break-words w-full line-clamp-2 flex items-center justify-center gap-1">
                    {isCustomButton ? "+ 自定义" : (
                      <>
                        {option.label}
                        {option.is_preset && <Volume className="w-4 h-4" style={{ color: isSelected ? 'white' : 'rgba(74, 122, 68)' }} />}
                      </>
                    )}
                  </span>
                  {!isCustomButton && option.notes && (
                    <span className={`text-[11px] mt-0.5 leading-snug break-words w-full line-clamp-2 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {option.notes}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Hint text */}
          <p className="text-center text-xs text-muted-foreground font-serif mt-[-4px]">
            单击选择·双击编辑
          </p>

          {/* Spacer - takes up remaining space to center the button */}
          <div className="flex-1" />

          {/* Start Practice Button - vertically centered between grid and nav */}
          <div className="flex flex-col items-center justify-center py-6">
            <motion.div
              layout={false}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "loop"
              }}
              className={`
                w-36 h-36 rounded-full flex items-center justify-center relative overflow-hidden
                transition-colors duration-500
                ${selectedOption
                  ? "green-gradient cursor-pointer backdrop-blur-[16px] border border-white/30 shadow-[0_12px_48px_rgba(45,90,39,0.45)]"
                  : "bg-muted/50 backdrop-blur-sm"
                }
              `}
              onClick={selectedOption ? handleStartPractice : undefined}
              whileTap={selectedOption ? { scale: 0.95 } : {}}
            >
              {/* Meditation figure - green on light circle, cream on green circle */}
              <img 
                src={selectedOption ? "/icon-light.png" : "/icon-green.png"} 
                alt="" 
                className="w-24 h-24 transition-all duration-500 opacity-60"
              />
            </motion.div>
            <span className={`
              mt-3 text-sm font-serif text-center
              ${selectedOption ? "text-primary" : "text-muted-foreground"}
            `}>
              {selectedOption ? "开始练习" : "请选择练习类型"}
            </span>
          </div>
        </main>
      )}

      {activeTab === 'journal' && (
        <JournalTab
          practiceHistory={practiceHistory}
          practiceOptions={practiceOptions}
          profile={userProfile}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
          onAddRecord={handleAddRecord}
          onOpenFakeDoor={() => {
            // 无论是否登录，都直接打开账户与同步弹窗
            setShowAccountSync(true)
          }}
          onOpenVoiceFakeDoor={() => setShowFakeDoor({ type: 'voice', isOpen: true })}
          onOpenPhotoFakeDoor={() => setShowFakeDoor({ type: 'photo', isOpen: true })}
          onAddOption={handleAddOption}
          votedCloud={votedCloud}
          onLogExport={(log) => setExportLogs([...exportLogs, log])}
          editingRecord={editingRecord}
          onSetEditingRecord={setEditingRecord}
          showAddModal={showAddModal}
          onSetShowAddModal={setShowAddModal}
          syncStatus={syncStatus}
          user={user}
        />
      )}
      {activeTab === 'stats' && (
        <StatsTab
          practiceHistory={practiceHistory}
          profile={userProfile}
          membership={membership}
          onOpenSettings={() => setShowSettings(true)}
          onOpenMembership={() => {
            setSettingsInitialSection('membership')
            setShowSettings(true)
          }}
          onOpenFakeDoor={() => setShowFakeDoor({ type: 'pro', isOpen: true })}
          showXiaohongshuModal={showXiaohongshuModal}
          setShowXiaohongshuModal={setShowXiaohongshuModal}
          hasNewXhsMessage={hasNewXhsMessage}
          user={user}
          setReadInviteVersion={setReadInviteVersion}
          showPWAInstallTutorial={showPWAInstallTutorial}
          setShowPWAInstallTutorial={setShowPWAInstallTutorial}
        />
      )}
      <AnimatePresence>

        {!hasAnyModalOpen && (
          <motion.nav
            initial={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-4 pb-4 z-30"
          >
            <div className="flex justify-around items-center">
              <button
                onClick={() => {
                  console.log('[Tab] 点击今日练习, 当前:', activeTab)
                  setActiveTab('practice')
                }}
                className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'practice' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-serif">今日练习</span>
              </button>
              <button
                onClick={() => {
                  console.log('[Tab] 点击觉察日记, 当前:', activeTab)
                  setActiveTab('journal')
                }}
                className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'journal' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-serif">觉察日记</span>
              </button>
              <button
                onClick={() => {
                  console.log('[Tab] 点击我的数据, 当前:', activeTab)
                  setActiveTab('stats')
                }}
                className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs font-serif">我的数据</span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Custom Practice Modal */}
      <CustomPracticeModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onConfirm={handleCustomConfirm}
        isFull={isOptionsFull}
      />

      {/* Edit Option Modal */}
      <EditOptionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingOption(null)
        }}
        option={editingOption}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        canDelete={canDeleteOption && editingOption?.id !== "custom"}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSettingsInitialSection('profile') // 重置初始标签页
        }}
        initialSection={settingsInitialSection}
        profile={userProfile}
        onSave={async (profile) => {
          // 先保存到本地
          updateProfile(profile)
          // 如果已登录，自动同步到云端
          if (user) {
            toast.loading('正在同步到云端...', { id: 'sync-profile' })
            try {
              const result = await autoSync()
              toast.dismiss('sync-profile')
              if (result) {
                toast.success('✅ 资料已同步到云端')
              } else {
                toast.error('❌ 同步失败，请稍后重试')
              }
            } catch (e) {
              toast.dismiss('sync-profile')
              toast.error('❌ 同步失败')
            }
          }
        }}
        onOpenExport={() => {
          const data = exportData()
          setExportedData(data)
          setShowExportModal(true)
        }}
        onOpenImport={() => setShowImportModal(true)}
        onExportLog={handleExportDebugLog}
        onClearData={clearAllData}
        user={user}
        practiceHistory={practiceHistory}
        practiceOptionsData={practiceOptionsData}
        onShowClearDataConfirm={() => {
          setClearDataStep(1)
          setConfirmPhrase('')
          setShowClearDataConfirm(true)
        }}
        onOpenLoginModal={() => {
          setShowAuthModal(true)
          setAuthMode('login')
        }}
        onOpenRegisterModal={() => {
          setShowAuthModal(true)
          setAuthMode('register')
        }}
        membership={membership}
        onActivateMembership={() => {
          setShowActivateModal(true)
        }}
        onUpdateProfile={updateProfile}
      />

      {/* Activate Membership Modal */}
      <ActivateModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={() => {
          setShowActivateModal(false)
          refreshMembership()
        }}
      />

      {/* Account & Sync Modal */}
      <AccountSyncModal
        isOpen={showAccountSync}
        onClose={() => setShowAccountSync(false)}
        profile={userProfile}
        practiceHistory={practiceHistory}
        practiceOptionsData={practiceOptionsData}
        onOpenLoginModal={() => {
          setShowAuthModal(true)
          setAuthMode('login')
        }}
        onOpenRegisterModal={() => {
          setShowAuthModal(true)
          setAuthMode('register')
        }}
        onShowClearDataConfirm={() => {
          setShowClearDataConfirm(true)
          setClearDataStep(2) // 直接从 Step 2（输入确认词）开始
        }}
        onUpdateProfile={updateProfile}
        user={user}
      />

      {/* 清空数据确认弹窗 - 居中显示 */}
      {showClearDataConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setShowClearDataConfirm(false)}
          />
          {/* Modal - 居中显示 */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto">
              <div className="p-6 pb-10">
              {/* 第一层：警告 */}
              {clearDataStep === 1 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">⚠️ 危险操作警告</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      您正在尝试清空本地数据胶囊。
                    </p>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm font-serif text-red-700 font-medium mb-2">此操作将永久删除：</p>
                      <ul className="text-sm font-serif text-red-600 space-y-1 pl-4">
                        <li>• 所有练习记录</li>
                        <li>• 练习选项</li>
                        <li>• 个人信息</li>
                        <li>• 同步日志</li>
                      </ul>
                    </div>

                    <p className="text-sm font-serif text-red-600 text-center font-medium">
                      ⚠️ 此操作不可撤销！
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowClearDataConfirm(false)}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => setClearDataStep(2)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif"
                      >
                        继续操作
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 第二层：输入确认词 */}
              {clearDataStep === 2 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">⚠️ 二次确认</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      为防止误操作，请输入确认词。
                    </p>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-sm font-serif text-red-700 text-center mb-2">确认词：</p>
                      <p className="text-lg font-serif text-red-800 text-center font-bold">确认删除</p>
                    </div>

                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder="请输入确认词（不含引号）"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-secondary font-serif"
                      autoFocus
                    />

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setClearDataStep(1)}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => {
                          if (confirmPhrase === '确认删除') {
                            setClearDataStep(3)
                          } else {
                            toast.error('确认词输入错误，请重新输入')
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 第三层：完成 */}
              {clearDataStep === 3 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">✅ 数据已清空</h2>
                    <button onClick={() => setShowClearDataConfirm(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-serif text-foreground text-center leading-relaxed">
                      所有本地数据已成功删除。
                    </p>

                    <p className="text-sm font-serif text-muted-foreground text-center">
                      点击完成后将退出登录并返回首页。
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={async () => {
                          localStorage.clear()
                          if (user && clearAllData) {
                            await clearAllData()
                          }
                          setShowClearDataConfirm(false)
                          setClearDataStep(1)
                          await supabase.auth.signOut() // 确保退出登录
                          router.push('/')
                        }}
                        className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all font-serif"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(json) => {
          const result = importData(json)

          if (result) {
            toast.success('✅ 数据导入成功！', {
              duration: 3000,
              position: 'top-center'
            })
            trackEvent('import_data')
            setTimeout(() => {
              setShowImportModal(false)
              setShowSettings(false)
            }, 500)
          } else {
            toast.error('❌ 数据导入失败，请检查格式', {
              duration: 3000,
              position: 'top-center'
            })
          }
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={exportedData}
      />

      {/* Debug Log Modal */}
      <DebugLogModal
        isOpen={showDebugLogModal}
        onClose={() => setShowDebugLogModal(false)}
        logContent={debugLogContent}
      />

      {/* Completion Sheet */}
      <CompletionSheet
        isOpen={showCompletion}
        practiceType={getSelectedLabel()}
        duration={finalDuration}
        onSave={handleSavePractice}
        onClose={() => {
          setShowCompletion(false)
          setSelectedOption(null)
          setCustomPracticeName("")
          setElapsedTime(0)
          setIsPaused(false)
          setActiveTab('journal')
        }}
        addRecord={addRecord}
        updateRecord={updateRecord}
        deleteRecord={deleteRecord}
        autoSync={autoSync}
        onOpenVoiceFakeDoor={() => setShowFakeDoor({ type: 'voice', isOpen: true })}
        onOpenPhotoFakeDoor={() => setShowFakeDoor({ type: 'photo', isOpen: true })}
        user={user}
        userProfile={userProfile}
      />

      {/* Fake Door Modal */}
      <FakeDoorModal
        type={showFakeDoor.type}
        isOpen={showFakeDoor.isOpen}
        onClose={() => setShowFakeDoor({ ...showFakeDoor, isOpen: false })}
        onVote={handleVoteCloud}
      />

      {/* 小红书群邀请弹窗 */}
      <XiaohongshuInviteModal
        isOpen={showXiaohongshuModal}
        onClose={() => {
          setShowXiaohongshuModal(false)
          // 关闭时再次确保标记为已读（双重保险）
          setReadInviteVersion(INVITE_VERSION)
        }}
      />

      {/* Auth Modal - 登录/注册/忘记密码 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onAuthSuccess={() => setShowAuthModal(false)}
        onModeChange={(newMode) => setAuthMode(newMode)}
      />

      {/* Data Conflict Modal - 数据冲突处理 */}
      <DataConflictModal
        isOpen={showDataConflict}
        localCount={conflictLocalCount}
        remoteCount={conflictRemoteCount}
        onSelect={handleResolveConflict}
      />
    </div>
  )
}
