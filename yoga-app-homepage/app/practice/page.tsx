"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { BookOpen, BarChart3, Calendar, X, Camera, Pause, Play, Trash2, User, Settings, ChevronLeft, ChevronRight, ChevronUp, Cloud, Phone, Mail, Download, Upload, Plus, Share2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getAllPracticeRecords, createPracticeRecord, updatePracticeRecord, deletePracticeRecord, getUserProfile, getPracticeStatistics } from '../../lib/database'
import { uploadPhoto, validatePhotoFile } from '../../lib/storage'

// Type definitions
interface PracticeOption {
  id: string
  label: string
  labelZh: string
  notes?: string
  isCustom?: boolean
}

interface PracticeRecord {
  id: number
  date: string
  type: string
  duration: number
  notes: string
  photos: string[]
  breakthrough?: string // Optional breakthrough/unlock title (max 20 chars)
}

interface UserProfile {
  name: string
  signature: string
  avatar: string | null
  phone?: string
  email?: string
  isPro?: boolean
}

// Default practice options - replaced 月亮日 with 简单练习
const defaultPracticeOptions: PracticeOption[] = [
  { id: "primary-mysore", label: "Primary Mysore", labelZh: "一序列Mysore", notes: "自主练习" },
  { id: "primary-led", label: "Primary Led", labelZh: "一序列口令课", notes: "跟随口令" },
  { id: "intermediate-mysore", label: "Intermediate Mysore", labelZh: "二序列Mysore", notes: "进阶练习" },
  { id: "intermediate-led", label: "Intermediate Led", labelZh: "二序列口令课", notes: "进阶口令" },
  { id: "simple-practice", label: "Simple Practice", labelZh: "简单练习", notes: "轻柔练习" },
]

// Mock practice data for Journal and Stats - with placeholder photo colors
const mockPracticeHistory: PracticeRecord[] = [
  { id: 1, date: "2026-01-18", type: "Primary Mysore", duration: 5400, notes: "感觉身体很轻盈，呼吸很顺畅。今天的练习让我感受到了内在的平静。", photos: ["#2D5A27", "#E8D5B7", "#D1D5DB"], breakthrough: "马里奇D终于扣上了" },
  { id: 2, date: "2026-01-17", type: "Primary Led", duration: 4800, notes: "跟着口令练习，专注力很好。", photos: ["#2D5A27"] },
  { id: 3, date: "2026-01-15", type: "Primary Mysore", duration: 5100, notes: "早晨5点起床练习，身体有些僵硬但逐渐打开。", photos: [], breakthrough: "头倒立稳定5分钟" },
  { id: 4, date: "2026-01-14", type: "简单练习", duration: 1800, notes: "轻柔地伸展。", photos: ["#E8D5B7", "#D1D5DB"] },
  { id: 5, date: "2026-01-12", type: "Intermediate Mysore", duration: 6000, notes: "尝试了一些二序列的体式，很有挑战性。", photos: [], breakthrough: "Pasasana双侧完成" },
  { id: 6, date: "2026-01-10", type: "Primary Mysore", duration: 5400, notes: "稳定的练习日。", photos: ["#2D5A27", "#E8D5B7"] },
  { id: 7, date: "2026-01-08", type: "Primary Led", duration: 4500, notes: "呼吸节奏很好。", photos: [] },
  { id: 8, date: "2026-01-05", type: "Primary Mysore", duration: 5700, notes: "深度练习，感受到了身心的连接。", photos: ["#D1D5DB"] },
  { id: 9, date: "2026-01-03", type: "简单练习", duration: 1200, notes: "休息日简单活动", photos: [] },
  { id: 10, date: "2025-12-28", type: "Primary Mysore", duration: 5200, notes: "年末练习。", photos: [] },
  { id: 11, date: "2025-12-25", type: "Primary Led", duration: 4600, notes: "圣诞节特别课程。", photos: [] },
  { id: 12, date: "2025-12-20", type: "Intermediate Mysore", duration: 5800, notes: "冬至前的深度练习。", photos: [] },
]

// Format minutes for timer display (e.g., "15 min")
function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}`
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

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const goToPreviousMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    if (nextMonth <= today) {
      setViewDate(nextMonth)
    }
  }

  const canGoNext = new Date(currentYear, currentMonth + 1, 1) <= today

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const date = new Date(dateStr)
    if (date <= today) {
      onChange(dateStr)
      setIsOpen(false)
    }
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
                  disabled={!canGoNext}
                  className={`p-2 transition-colors ${canGoNext ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30'}`}
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
                  const isFuture = new Date(dateStr) > today

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      disabled={isFuture}
                      className={`
                        aspect-square rounded-full flex items-center justify-center text-sm font-serif transition-all
                        ${isSelected
                          ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                          : isFuture
                            ? 'text-muted-foreground/30 cursor-not-allowed'
                            : 'text-foreground hover:bg-secondary'
                        }
                      `}
                    >
                      {day}
                    </button>
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
      onConfirm(practiceName.slice(0, 10), notes.slice(0, 15))
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
              <h2 className="text-lg font-serif text-foreground">自定义练习</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isFull ? (
              <div className="text-center py-8">
                <p className="text-foreground font-serif mb-2">选项已满（最多9个）</p>
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
                    备注 <span className="text-muted-foreground text-xs">（最多15字）</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 15))}
                    placeholder="简短描述..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/15</div>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={!practiceName.trim()}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] backdrop-blur-sm"
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
      setName(option.labelZh)
      setNotes(option.notes || "")
    }
  }, [option])

  const handleSave = () => {
    if (option && name.trim()) {
      onSave(option.id, name.slice(0, 10), notes.slice(0, 15))
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
                    className="flex-1 py-3 rounded-full bg-destructive text-destructive-foreground font-serif transition-all hover:opacity-90 active:scale-[0.98]"
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
                    备注 <span className="text-muted-foreground text-xs">（最多15字）</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 15))}
                    placeholder="简短描述..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/15</div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
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

// Edit Record Modal (for editing/deleting practice records)
function EditRecordModal({
  isOpen,
  onClose,
  record,
  onSave,
  onDelete,
}: {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  onSave: (id: number, notes: string, photos: string[], breakthrough?: string) => void
  onDelete: (id: number) => void
}) {
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (record) {
      setNotes(record.notes)
      // 过滤掉blob URL，只保留Supabase URL
      setPhotos(record.photos.filter(photo => !photo.startsWith('blob:')))
      setBreakthroughEnabled(!!record.breakthrough)
      setBreakthroughText(record.breakthrough || "")
    }
  }, [record])

  const handleSave = () => {
    if (record) {
      onSave(record.id, notes, photos, breakthroughEnabled ? breakthroughText : undefined)
      onClose()
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (record) {
      onDelete(record.id)
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || photos.length >= 3) return

    const filesArray = Array.from(files).slice(0, 3 - photos.length)
    console.log('[EditRecordModal] 📸 开始上传照片...', filesArray.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(2) + 'MB' })))

    // 验证所有文件
    const validationResults = filesArray.map(file => validatePhotoFile(file))
    const firstError = validationResults.find(r => !r.valid)

    if (firstError) {
      console.error('[EditRecordModal] ❌ 文件验证失败:', firstError.error)
      setUploadError(firstError.error || '文件验证失败')
      setTimeout(() => setUploadError(null), 3000)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 生成文件夹路径（年-月/年-月-日格式）
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const folderPath = `${year}-${month}/${year}-${month}-${day}`

      console.log('[EditRecordModal] 📁 目标路径:', folderPath)

      // 上传所有文件
      const uploadPromises = filesArray.map(file => uploadPhoto(file, folderPath))
      const results = await Promise.all(uploadPromises)

      console.log('[EditRecordModal] ✅ 上传结果:', results)

      // 过滤掉上传失败的，只保留成功的URL
      const successfulUrls = results.filter(r => r !== null).map(r => r!.url)

      if (successfulUrls.length > 0) {
        console.log('[EditRecordModal] 🎉 成功上传', successfulUrls.length, '张照片')
        setPhotos([...photos, ...successfulUrls])
      } else {
        console.error('[EditRecordModal] ❌ 所有照片上传失败')
        setUploadError('上传失败，请重试')
        setTimeout(() => setUploadError(null), 3000)
      }
    } catch (error) {
      console.error('[EditRecordModal] ❌ 上传异常:', error)
      setUploadError('上传失败，请检查网络连接')
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setUploading(false)
      console.log('[EditRecordModal] ✓ 上传流程结束')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  return (
    <AnimatePresence>
      {isOpen && record && (
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">编辑记录</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-4">
                <p className="text-center font-serif text-foreground">确定要删除这条记录吗？</p>
                <p className="text-center text-sm text-muted-foreground font-serif">{formatDate(record.date)} · {record.type}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 rounded-full bg-destructive text-destructive-foreground font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Read-only info */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">日期</label>
                    <div className="px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif">{formatDate(record.date)}</div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">类型</label>
                    <div className="px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif">{record.type}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">时长</label>
                  <div className="px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif">{formatDuration(record.duration)}</div>
                </div>

                {/* Breakthrough Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-serif text-sm transition-all ${
                      breakthroughEnabled
                        ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-[0_4px_15px_rgba(230,126,34,0.3)]'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    解锁/突破
                  </button>
                  
                  <AnimatePresence>
                    {breakthroughEnabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3">
                          <input
                            type="text"
                            value={breakthroughText}
                            onChange={(e) => setBreakthroughText(e.target.value.slice(0, 20))}
                            placeholder="记录这天的成就"
                            className="w-full px-4 py-3 rounded-2xl bg-[#fef3e2] border border-[#e67e22]/30 text-foreground placeholder:text-[#e67e22]/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/30 transition-all font-serif"
                          />
                          <div className="text-right text-xs text-[#e67e22]/70 mt-1">{breakthroughText.length}/20</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Editable notes */}
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                    笔记 <span className="text-muted-foreground/60">（最多2000字）</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                    placeholder="今天的练习感受如何？"
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif"
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/2000</div>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">照片（最多3张）</label>
                  <div className="flex gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden">
                        <img
                          src={photo || "/placeholder.svg"}
                          alt={`照片 ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load photo:', photo)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                          uploading
                            ? 'bg-muted/50 border-muted-foreground/20 cursor-not-allowed'
                            : 'bg-secondary border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                        }`}
                      >
                        {uploading ? (
                          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6" />
                        )}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </div>
                  {/* 上传状态提示 */}
                  <AnimatePresence>
                    {uploading && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 text-xs text-muted-foreground"
                      >
                        正在上传照片...
                      </motion.div>
                    )}
                    {uploadError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 text-xs text-red-500"
                      >
                        {uploadError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  保存修改
                </button>

                <button
                  onClick={handleDeleteClick}
                  className="w-full py-3 rounded-full bg-transparent text-destructive font-serif transition-all hover:bg-destructive/10 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除记录
                </button>
              </div>
            )}
          </motion.div>
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
}: {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  profile: UserProfile
  totalPracticeCount: number
  thisMonthDays: number
  totalHours: number
}) {
  const [editableNotes, setEditableNotes] = useState("")
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  useEffect(() => {
    if (record) {
      setEditableNotes(record.notes || "今日练习完成")
    }
  }, [record])

  if (!record) return null

  // 过滤掉blob URL，只保留Supabase URL
  const validPhotos = record.photos.filter(photo => !photo.startsWith('blob:'))
  const hasPhoto = validPhotos.length > 0
  const heroPhotoUrl = hasPhoto ? validPhotos[0] : null
  const formattedDate = new Date(record.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')
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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <div 
              className="bg-background rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
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

              {/* Hero Image - Only first photo, centered, flexible aspect ratio */}
              {heroPhotoUrl && (
                <div className="px-5 pt-4">
                  <img
                    src={heroPhotoUrl}
                    alt="练习照片"
                    className="w-full aspect-[4/3] rounded-2xl object-cover"
                    onError={(e) => {
                      console.error('Failed to load hero photo:', heroPhotoUrl)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Reflection Text - Editable Notes with elegant serif font */}
              <div className="px-5 py-4">
                {isEditingNotes ? (
                  <textarea
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    onBlur={() => setIsEditingNotes(false)}
                    autoFocus
                    rows={3}
                    className="w-full text-sm text-foreground font-serif leading-relaxed bg-transparent focus:outline-none resize-none"
                  />
                ) : (
                  <p
                    onClick={() => setIsEditingNotes(true)}
                    className="text-sm text-foreground font-serif leading-relaxed cursor-text hover:bg-secondary/30 rounded-lg p-1 -m-1 transition-colors"
                  >
                    {editableNotes || "点击编辑笔记..."}
                  </p>
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
                    <div className="text-[10px] text-muted-foreground font-serif">熬汤时长</div>
                  </div>
                </div>

                {/* Identity Footer: Avatar+Name (Left) | Brand Watermark (Right - plain text) */}
                <div className="flex items-center justify-between pt-3">
                  {/* Left: Avatar and Name */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center overflow-hidden">
                      {profile.avatar ? (
                        <img src={profile.avatar || "/placeholder.svg"} alt="头像" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-serif text-[#e67e22]">{profile.name}</span>
                  </div>

                  {/* Right: Brand Watermark - Plain text, no background */}
                  <span className="text-xs font-serif text-muted-foreground">熬汤日记</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    alert("分享图片功能开发中...")
                    onClose()
                  }}
                  className="flex-1 py-3 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
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
                      ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
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

// Add Record Modal (补录练习) - Now using Zen Date Picker and Custom Select
function AddRecordModal({
  isOpen,
  onClose,
  onSave,
  practiceOptions,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (record: Omit<PracticeRecord, 'id'>) => void
  practiceOptions: PracticeOption[]
}) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [type, setType] = useState("")
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const typeOptions = useMemo(() => {
    return practiceOptions
      .filter(o => o.id !== "custom")
      .map(o => ({ value: o.labelZh, label: o.labelZh }))
  }, [practiceOptions])

  const handleSave = () => {
    if (date && type) {
      onSave({
        date,
        type,
        duration: duration * 60, // Convert to seconds
        notes,
        photos,
        breakthrough: breakthroughEnabled ? breakthroughText : undefined,
      })
      // Reset form
      setDate(new Date().toISOString().split('T')[0])
      setType("")
      setDuration(60)
      setNotes("")
      setPhotos([])
      setBreakthroughEnabled(false)
      setBreakthroughText("")
      onClose()
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || photos.length >= 3) return

    const filesArray = Array.from(files).slice(0, 3 - photos.length)
    console.log('[AddRecordModal] 📸 开始上传照片...', filesArray.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(2) + 'MB' })))

    // 验证所有文件
    const validationResults = filesArray.map(file => validatePhotoFile(file))
    const firstError = validationResults.find(r => !r.valid)

    if (firstError) {
      console.error('[AddRecordModal] ❌ 文件验证失败:', firstError.error)
      setUploadError(firstError.error || '文件验证失败')
      setTimeout(() => setUploadError(null), 3000)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 生成文件夹路径（年-月/年-月-日格式）
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const folderPath = `${year}-${month}/${year}-${month}-${day}`

      console.log('[AddRecordModal] 📁 目标路径:', folderPath)

      // 上传所有文件
      const uploadPromises = filesArray.map(file => uploadPhoto(file, folderPath))
      const results = await Promise.all(uploadPromises)

      console.log('[AddRecordModal] ✅ 上传结果:', results)

      // 过滤掉上传失败的，只保留成功的URL
      const successfulUrls = results.filter(r => r !== null).map(r => r!.url)

      if (successfulUrls.length > 0) {
        console.log('[AddRecordModal] 🎉 成功上传', successfulUrls.length, '张照片')
        setPhotos([...photos, ...successfulUrls])
      } else {
        console.error('[AddRecordModal] ❌ 所有照片上传失败')
        setUploadError('上传失败，请重试')
        setTimeout(() => setUploadError(null), 3000)
      }
    } catch (error) {
      console.error('[AddRecordModal] ❌ 上传异常:', error)
      setUploadError('上传失败，请检查网络连接')
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setUploading(false)
      console.log('[AddRecordModal] ✓ 上传流程结束')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">补录练习</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Custom Zen Date picker */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习日期</label>
                <ZenDatePicker
                  value={date}
                  onChange={setDate}
                  maxDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Practice type - Custom Select Component */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习类型</label>
                <ZenSelect
                  value={type}
                  onChange={setType}
                  options={typeOptions}
                  placeholder="选择类型"
                />
              </div>

              {/* Duration - Clean input without spinners */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习时长（分钟）</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={duration}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setDuration(Math.min(300, parseInt(val) || 0))
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                />
              </div>

              {/* Breakthrough Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-serif text-sm transition-all ${
                    breakthroughEnabled
                      ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-[0_4px_15px_rgba(230,126,34,0.3)]'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  解锁/突破
                </button>
                
                <AnimatePresence>
                  {breakthroughEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        <input
                          type="text"
                          value={breakthroughText}
                          onChange={(e) => setBreakthroughText(e.target.value.slice(0, 20))}
                          placeholder="记录这天的成就"
                          className="w-full px-4 py-3 rounded-2xl bg-[#fef3e2] border border-[#e67e22]/30 text-foreground placeholder:text-[#e67e22]/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/30 transition-all font-serif"
                        />
                        <div className="text-right text-xs text-[#e67e22]/70 mt-1">{breakthroughText.length}/20</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                  笔记 <span className="text-muted-foreground/60">（可选）</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="今天的练习感受如何？"
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">照片（最多3张）</label>
                <div className="flex gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden">
                      <img src={photo || "/placeholder.svg"} alt={`照片 ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                        uploading
                          ? 'bg-muted/50 border-muted-foreground/20 cursor-not-allowed'
                          : 'bg-secondary border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </div>
                {/* 上传状态提示 */}
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      正在上传照片...
                    </motion.div>
                  )}
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-red-500"
                    >
                      {uploadError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleSave}
                disabled={!date || !type}
                className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              >
                保存记录
              </button>
            </div>
          </motion.div>
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
}: {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
}) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [phone, setPhone] = useState(profile.phone || "")
  const [email, setEmail] = useState(profile.email || "")
  const [activeSection, setActiveSection] = useState<'profile' | 'account' | 'data'>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
    setPhone(profile.phone || "")
    setEmail(profile.email || "")
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatar(url)
    }
  }

  const handleSave = () => {
    onSave({ ...profile, name, signature, avatar, phone, email })
    onClose()
  }

  const handleExport = () => {
    // Simulate export
    alert("数据导出功能开发中...")
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">设置</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveSection('profile')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'profile' 
                    ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' 
                    : 'bg-secondary text-foreground'
                }`}
              >
                编辑资料
              </button>
              <button
                onClick={() => setActiveSection('account')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'account' 
                    ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' 
                    : 'bg-secondary text-foreground'
                }`}
              >
                账号绑定
              </button>
              <button
                onClick={() => setActiveSection('data')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'data' 
                    ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' 
                    : 'bg-secondary text-foreground'
                }`}
              >
                数据管理
              </button>
            </div>

            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center"
                  >
                    {avatar ? (
                      <img src={avatar || "/placeholder.svg"} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground font-serif mt-2">点击更换头像</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">昵称</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="输入昵称..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-sm font-serif text-foreground mb-2">个性签名</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="例如：练习阿斯汤加 3 年"
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  保存设置
                </button>
              </div>
            )}

            {/* Account Binding Section */}
            {activeSection === 'account' && (
              <div className="space-y-4">
                {/* Phone Binding */}
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-serif text-foreground">手机号绑定</div>
                      <div className="text-xs text-muted-foreground font-serif">
                        {phone ? `已绑定: ${phone}` : '未绑定'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="输入手机号..."
                    className="w-full px-4 py-3 rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                </div>

                {/* Email Binding */}
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-serif text-foreground">邮箱绑定</div>
                      <div className="text-xs text-muted-foreground font-serif">
                        {email ? `已绑定: ${email}` : '未绑定'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="输入邮箱..."
                    className="w-full px-4 py-3 rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  保存绑定
                </button>
              </div>
            )}

            {/* Data Management Section */}
            {activeSection === 'data' && (
              <div className="space-y-4">
                {/* Export */}
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-serif text-foreground">导出记录</div>
                      <div className="text-xs text-muted-foreground font-serif">
                        导出所有练习记录为文件
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full py-3 rounded-xl bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:shadow-[0_4px_20px_rgba(45,90,39,0.35)] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    导出数据
                  </button>
                </div>

                {/* Import */}
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-serif text-foreground">导入记录</div>
                      <div className="text-xs text-muted-foreground font-serif">
                        从文件恢复练习记录
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('导入功能开发中...')}
                    className="w-full py-3 rounded-xl bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:shadow-[0_4px_20px_rgba(45,90,39,0.35)] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导入数据
                  </button>
                </div>

                <p className="text-xs text-muted-foreground font-serif text-center px-4">
                  仅包含练习记录、文字和图片，不含统计数据
                </p>
              </div>
            )}
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
                className="flex-1 py-3 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
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

// Completion Sheet
function CompletionSheet({
  isOpen,
  practiceType,
  duration,
  onSave,
}: {
  isOpen: boolean
  practiceType: string
  duration: string
  onSave: (notes: string, photos: string[], breakthrough?: string) => void
}) {
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || photos.length >= 3) return

    const filesArray = Array.from(files).slice(0, 3 - photos.length)
    console.log('📸 开始上传照片...', filesArray.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(2) + 'MB' })))

    // 验证所有文件
    const validationResults = filesArray.map(file => validatePhotoFile(file))
    const firstError = validationResults.find(r => !r.valid)

    if (firstError) {
      console.error('❌ 文件验证失败:', firstError.error)
      setUploadError(firstError.error || '文件验证失败')
      // 3秒后自动清除错误提示
      setTimeout(() => setUploadError(null), 3000)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 生成文件夹路径（年-月/年-月-日格式）
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const folderPath = `${year}-${month}/${year}-${month}-${day}`

      console.log('📁 目标路径:', folderPath)

      // 上传所有文件
      const uploadPromises = filesArray.map(file => uploadPhoto(file, folderPath))
      const results = await Promise.all(uploadPromises)

      console.log('✅ 上传结果:', results)

      // 过滤掉上传失败的，只保留成功的URL
      const successfulUrls = results.filter(r => r !== null).map(r => r!.url)

      if (successfulUrls.length > 0) {
        console.log('🎉 成功上传', successfulUrls.length, '张照片')
        setPhotos([...photos, ...successfulUrls])
      } else {
        console.error('❌ 所有照片上传失败')
        setUploadError('上传失败，请重试')
        setTimeout(() => setUploadError(null), 3000)
      }
    } catch (error) {
      console.error('❌ 上传异常:', error)
      setUploadError('上传失败，请检查网络连接')
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setUploading(false)
      console.log('✓ 上传流程结束')
      // 清空文件输入，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave(notes, photos, breakthroughEnabled ? breakthroughText : undefined)
    setNotes("")
    setPhotos([])
    setBreakthroughEnabled(false)
    setBreakthroughText("")
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[70] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-xl font-serif text-foreground text-center mb-6">练习完成</h2>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">类型</label>
                  <div className="px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif">{practiceType}</div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">时长</label>
                  <div className="px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif">{duration} 分钟</div>
                </div>
              </div>

              {/* Breakthrough Toggle */}
              <div>
                <button
                  onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-serif text-sm transition-all ${
                    breakthroughEnabled
                      ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-[0_4px_15px_rgba(230,126,34,0.3)]'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  解锁/突破
                </button>
                
                {/* Conditional Breakthrough Input */}
                <AnimatePresence>
                  {breakthroughEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        <input
                          type="text"
                          value={breakthroughText}
                          onChange={(e) => setBreakthroughText(e.target.value.slice(0, 20))}
                          placeholder="记录今天的成就（如：马里奇D终于扣上了）"
                          className="w-full px-4 py-3 rounded-2xl bg-[#fef3e2] border border-[#e67e22]/30 text-foreground placeholder:text-[#e67e22]/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/30 transition-all font-serif"
                        />
                        <div className="text-right text-xs text-[#e67e22]/70 mt-1">{breakthroughText.length}/20</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                  觉察 / 笔记 <span className="text-muted-foreground/60">（最多2000字）</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="今天的练习感受如何？有什么觉察或洞见..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/2000</div>
              </div>

              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">上传照片（最多3张）</label>
                <div className="flex gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden">
                      <img src={photo || "/placeholder.svg"} alt={`练习照片 ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                        uploading
                          ? 'bg-muted/50 border-muted-foreground/20 cursor-not-allowed'
                          : 'bg-secondary border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </div>
                {/* 上传状态提示 */}
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      正在上传照片...
                    </motion.div>
                  )}
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-red-500"
                    >
                      {uploadError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
              >
                保存练习
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Color Block Fullscreen Viewer (simulates photo viewer)
function ColorBlockViewer({
  isOpen,
  color,
  onClose,
}: {
  isOpen: boolean
  color: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ backgroundColor: color }}
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10 bg-black/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <p className="text-white/60 font-serif text-sm">点击任意位置关闭</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Monthly Heatmap for Journal - Now with CIRCLES instead of squares
function MonthlyHeatmap({ 
  practiceHistory, 
  onDayClick,
  isSynced,
  onSync,
  onAddRecord
}: { 
  practiceHistory: PracticeRecord[]
  onDayClick: (dateStr: string) => void
  isSynced: boolean
  onSync: () => void
  onAddRecord: () => void
}) {
  const today = new Date('2026-01-18')
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
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    if (nextMonth <= today) {
      setViewDate(nextMonth)
    }
  }

  const canGoNext = new Date(currentYear, currentMonth + 1, 1) <= today

  const handleDayClick = (day: number | null) => {
    if (day === null) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
          <SyncStatusIcon isSynced={isSynced} onSync={onSync} />
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
            disabled={!canGoNext}
            className={`p-1 transition-colors ${canGoNext ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Right: Add Button - aligned with calendar last column */}
        <div className="w-[calc((100%-12px)/7)] flex justify-center">
          <button 
            onClick={onAddRecord}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.2)] flex items-center justify-center text-white"
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
          const isPast = day ? new Date(dateStr) <= today : false
          
          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!practiced}
              className={`aspect-square rounded-full flex items-center justify-center text-[9px] font-serif transition-all ${
                practiced 
                  ? 'bg-gradient-to-br from-[rgba(45,90,39,0.9)] to-[rgba(74,122,68,0.75)] backdrop-blur-sm border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.3)] text-white cursor-pointer hover:shadow-[0_2px_12px_rgba(45,90,39,0.45)]' 
                  : day === null 
                    ? 'bg-transparent' 
                    : isPast 
                      ? 'bg-background text-foreground' 
                      : 'bg-background text-muted-foreground/50'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Sync Button - Cream cloud icon with colored status dot below
function SyncButton({ isSynced, onSync }: { isSynced: boolean; onSync: () => void }) {
  const [isSpinning, setIsSpinning] = useState(false)
  
  const handleClick = () => {
    setIsSpinning(true)
    onSync()
    setTimeout(() => setIsSpinning(false), 800)
  }
  
  return (
    <button
      onClick={handleClick}
      className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.2)] flex items-center justify-center"
    >
      {/* Cloud icon - cream colored, spins on click */}
      <motion.div
        animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <Cloud className="w-4 h-4 text-[#FAF7F2]" />
      </motion.div>
      {/* Status dot - small, inside button at bottom center */}
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 ${isSynced ? 'bg-green-400' : 'bg-red-400'}`} />
    </button>
  )
}

// Legacy Sync Status Icon (kept for compatibility)
function SyncStatusIcon({ isSynced, onSync }: { isSynced: boolean; onSync: () => void }) {
  return <SyncButton isSynced={isSynced} onSync={onSync} />
}

// Journal Tab Component with Timeline - Split interaction zones
function JournalTab({
  practiceHistory,
  practiceOptions,
  profile,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
}: {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  profile: UserProfile
  onEditRecord: (id: number, notes: string, photos: string[], breakthrough?: string) => void
  onDeleteRecord: (id: number) => void
  onAddRecord: (record: Omit<PracticeRecord, 'id'>) => void
}) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerColor, setViewerColor] = useState("")
  const [isSynced, setIsSynced] = useState(true)
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null)
  const [sharingRecord, setSharingRecord] = useState<PracticeRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Handle scroll to show/hide back-to-top button (threshold: 400px)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400)
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Calculate vanity metrics for share card
  const totalPracticeCount = practiceHistory.length
  const today = new Date('2026-01-18')
  const thisMonthDays = useMemo(() => {
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    return practiceHistory.filter(r => {
      const d = new Date(r.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.duration > 0
    }).length
  }, [practiceHistory, today])
  const totalHours = useMemo(() => {
    return Math.round(practiceHistory.reduce((acc, r) => acc + r.duration, 0) / 3600)
  }, [practiceHistory])

  const openColorViewer = (color: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setViewerColor(color)
    setViewerOpen(true)
  }

  const handleSync = () => {
    setIsSynced(!isSynced)
  }

  const handleDayClick = (dateStr: string) => {
    const ref = recordRefs.current[dateStr]
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

  // Left click -> Edit record
  const handleLeftClick = (record: PracticeRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRecord(record)
  }

  // Right click -> Share card
  const handleRightClick = (record: PracticeRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setSharingRecord(record)
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24 pt-12 relative">
      {/* Calendar with integrated header */}
      <div className="px-6">
        <MonthlyHeatmap 
          practiceHistory={practiceHistory} 
          onDayClick={handleDayClick}
          isSynced={isSynced}
          onSync={handleSync}
          onAddRecord={() => setShowAddModal(true)}
        />
      </div>
      
      {/* Timeline - continuous, split click zones */}
      <div className="px-6">
        {practiceHistory.map((practice, index) => (
          <motion.div
            key={practice.id}
            ref={(el) => { recordRefs.current[practice.date] = el }}
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
            className="flex flex-col rounded-lg -mx-4 px-4"
          >
            {/* Single Row Layout - Date-Anchored Alignment with Symmetrical Spacing */}
            <div className="flex items-start rounded-lg">
              {/* Left Column: 3-line stack (Date, Duration, Type) - Right-aligned with breathing room */}
              <button
                onClick={(e) => handleLeftClick(practice, e)}
                className="w-[85px] flex-shrink-0 pr-4 pt-3 pb-3 text-right hover:bg-secondary/30 rounded-l-lg transition-colors"
                style={{ borderRadius: '0.5rem 0 0 0.5rem' }}
              >
                <div className="text-xl font-serif font-bold text-foreground leading-none">{formatDate(practice.date)}</div>
                {practice.duration > 0 && (
                  <div className="text-sm text-muted-foreground font-serif mt-1">{formatDuration(practice.duration)}</div>
                )}
                <div className="text-sm text-muted-foreground/70 font-serif mt-0.5">{practice.type}</div>
              </button>
              
              {/* Center: Vertical line with Dot - balanced whitespace on both sides */}
              <div className="w-[1px] bg-border flex-shrink-0 self-stretch relative">
                <div className={`absolute mt-[16px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${practice.breakthrough ? 'bg-gradient-to-br from-[#e67e22] to-[#f39c12] shadow-[0_2px_8px_rgba(230,126,34,0.4)]' : 'bg-gradient-to-br from-[rgba(45,90,39,0.9)] to-[rgba(74,122,68,0.8)] shadow-[0_2px_8px_rgba(45,90,39,0.4)]'}`} />
              </div>
              
              {/* Right Column: Content - Left-aligned with matching breathing room */}
              <div className="flex-1 pl-4 pt-3 pb-3">
                {/* First line: Breakthrough OR Notes - must align with Date */}
                {practice.breakthrough ? (
                  <div className="flex items-center gap-1.5 leading-none">
                    <Sparkles className="w-4 h-4 text-[#e67e22]" />
                    <span className="text-base font-serif font-bold text-[#e67e22] leading-none">{practice.breakthrough}</span>
                  </div>
                ) : null}
                {/* Notes area - Click for Share Card */}
                <button
                  onClick={(e) => handleRightClick(practice, e)}
                  className={`w-full text-left hover:bg-secondary/30 rounded-lg transition-colors ${practice.breakthrough ? 'mt-1.5' : ''}`}
                  style={{ borderRadius: '0 0.5rem 0.5rem 0' }}
                >
                  <p className={`text-base text-foreground font-serif leading-relaxed line-clamp-4 ${!practice.breakthrough ? 'leading-none first-line:leading-none' : ''}`}>
                    {practice.notes}
                  </p>
                </button>
                {/* Photos - Click to view */}
                {practice.photos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
                    {practice.photos
                      .filter(photo => !photo.startsWith('blob:')) // 过滤掉blob URL
                      .map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(photo, '_blank')
                          }}
                          className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border"
                        >
                          <img
                            src={photo}
                            alt={`练习照片 ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load photo:', photo)
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <ColorBlockViewer
        isOpen={viewerOpen}
        color={viewerColor}
        onClose={() => setViewerOpen(false)}
      />

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={onEditRecord}
        onDelete={onDeleteRecord}
      />

      <ShareCardModal
        isOpen={!!sharingRecord}
        onClose={() => setSharingRecord(null)}
        record={sharingRecord}
        profile={profile}
        totalPracticeCount={totalPracticeCount}
        thisMonthDays={thisMonthDays}
        totalHours={totalHours}
      />

      <AddRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={onAddRecord}
        practiceOptions={practiceOptions}
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
            className="fixed bottom-32 right-10 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(45,90,39,0.4)] flex items-center justify-center text-white hover:shadow-[0_8px_40px_rgba(45,90,39,0.5)] transition-shadow active:scale-95"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// PRO Badge Component
function ProBadge({ isPro }: { isPro: boolean }) {
  return (
    <span className={`ml-2 px-2 py-0.5 text-[10px] font-serif rounded ${
      isPro 
        ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white' 
        : 'bg-muted text-muted-foreground'
    }`}>
      PRO
    </span>
  )
}

// Stats Tab Component with Profile and Heatmap - Removed title, added PRO badge
function StatsTab({ 
  practiceHistory, 
  profile, 
  onOpenSettings 
}: { 
  practiceHistory: PracticeRecord[]
  profile: UserProfile
  onOpenSettings: () => void
}) {
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('month')
  const [dateOffset, setDateOffset] = useState(0)
  
  const today = new Date('2026-01-19')

  // Generate heatmap data for the year
  const heatmapData = useMemo(() => {
    const data: Record<string, boolean> = {}
    practiceHistory.forEach((p) => {
      data[p.date] = true
    })
    // Add some random historical data for demo
    const startDate = new Date('2025-01-01')
    const endDate = new Date('2026-01-19')
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (!data[dateStr] && Math.random() > 0.7) {
        data[dateStr] = true
      }
    }
    return data
  }, [practiceHistory])
  
  // Calculate stats - Current month only (from 1st to today)
  const currentMonthStats = useMemo(() => {
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    let practiceDays = 0
    let totalMinutes = 0
    
    practiceHistory.forEach((record) => {
      const date = new Date(record.date)
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && date <= today) {
        if (record.duration > 0) {
          practiceDays++
          totalMinutes += Math.floor(record.duration / 60)
        }
      }
    })
    
    const avgDuration = practiceDays > 0 ? Math.round(totalMinutes / practiceDays) : 0
    
    return { practiceDays, totalMinutes, avgDuration }
  }, [practiceHistory, today])

  // Total stats (all time)
  const totalStats = useMemo(() => {
    let totalDays = 0
    let totalSeconds = 0
    
    practiceHistory.forEach((record) => {
      if (record.duration > 0) {
        totalDays++
        totalSeconds += record.duration
      }
    })
    
    return {
      totalDays,
      totalHours: Math.round(totalSeconds / 3600),
    }
  }, [practiceHistory])

  // Generate flowing dots based on view mode
  const flowingDots = useMemo(() => {
    const daysCount = viewMode === 'month' ? 30 : viewMode === 'quarter' ? 90 : 365
    const daysOffset = viewMode === 'month' ? dateOffset * 30 : viewMode === 'quarter' ? dateOffset * 90 : dateOffset * 365
    const result: string[] = []
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i - daysOffset)
      result.push(d.toISOString().split('T')[0])
    }
    return result
  }, [viewMode, dateOffset, today])

  // Dynamic text based on view
  const dynamicText = useMemo(() => {
    switch (viewMode) {
      case 'month': return '觉察每个当下'
      case 'quarter': return '呼吸串联身体'
      case 'year': return '练习是连贯的珍珠'
    }
  }, [viewMode])

  // Dot sizes based on view
  const dotConfig = useMemo(() => {
    switch (viewMode) {
      case 'month': return { size: 'w-10 h-10', gap: 'gap-4', rounded: 'rounded-xl' }
      case 'quarter': return { size: 'w-6 h-6', gap: 'gap-2', rounded: 'rounded-lg' }
      case 'year': return { size: 'w-3 h-3', gap: 'gap-1.5', rounded: 'rounded-sm' }
    }
  }, [viewMode])

  const canGoNext = dateOffset > 0

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4">
      {/* Header - only settings icon */}
      <div className="px-6 flex items-center justify-end mb-4 pt-10">
        <button 
          onClick={onOpenSettings}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6">
        {/* Profile Section with PRO Badge - NOW FIRST */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center mb-3 overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar || "/placeholder.svg"} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
          <div className="flex items-center">
            <h2 className="text-xl font-serif text-[#e67e22]">{profile.name}</h2>
            <ProBadge isPro={profile.isPro || false} />
          </div>
          <p className="text-xs font-mono text-gray-400">UID: 00000001</p>
          <p className="text-sm text-muted-foreground font-serif">{profile.signature}</p>
        </div>

        {/* Stats Cards - NOW SECOND */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{currentMonthStats.practiceDays}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">本月天数</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.totalHours}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">总小时</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{currentMonthStats.avgDuration}</div>
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
              {(['month', 'quarter', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setDateOffset(0) }}
                  className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${
                    viewMode === mode
                      ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {mode === 'month' ? '30' : mode === 'quarter' ? '90' : '365'}
                </button>
              ))}
            </div>
          </div>

          {/* Flowing Dots Grid - Breathing Fade animation */}
          <div className="p-4 pt-2">
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
                className={`flex flex-wrap justify-center ${dotConfig.gap}`}
              >
                {flowingDots.map((dateStr) => (
                  <button
                    key={dateStr}
                    onClick={() => {
                      // Could open share card for this date
                    }}
                    className={`${dotConfig.size} ${dotConfig.rounded} transition-colors ${
                      heatmapData[dateStr] 
                        ? 'bg-gradient-to-br from-[rgba(45,90,39,0.9)] to-[rgba(74,122,68,0.8)] shadow-[0_2px_8px_rgba(45,90,39,0.3)]' 
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

export default function AshtangaTracker() {
  const [practiceOptions, setPracticeOptions] = useState<PracticeOption[]>(() => {
    // Initialize with default options plus custom "自定义" option
    return [...defaultPracticeOptions, { id: "custom", label: "Custom", labelZh: "自定义" }]
  })
  const [practiceHistory, setPracticeHistory] = useState<PracticeRecord[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [customPracticeName, setCustomPracticeName] = useState("")
  const [isPracticing, setIsPracticing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOption, setEditingOption] = useState<PracticeOption | null>(null)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [finalDuration, setFinalDuration] = useState("")
  const [activeTab, setActiveTab] = useState<'practice' | 'journal' | 'stats'>('practice')
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "瑜伽练习者",
    signature: "练习阿斯汤加 3 年",
    avatar: null,
    isPro: false,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load practice records
        const records = await getAllPracticeRecords()
        if (records.length > 0) {
          setPracticeHistory(records)
        }

        // Load user profile
        const profile = await getUserProfile()
        if (profile) {
          setUserProfile(profile)
        }
      } catch (error) {
        // Silently handle network errors - app will work with local state
        console.warn('Failed to load data from Supabase, using local state:', error)
      }
    }

    loadData()
  }, [])

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

  // Timer logic
  useEffect(() => {
    if (isPracticing && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPracticing, isPaused])

  const handleOptionTap = (option: PracticeOption) => {
    const now = Date.now()
    const lastTap = lastTapRef.current
    
    // Check for double tap (within 300ms on the same option)
    if (lastTap && lastTap.id === option.id && now - lastTap.time < 300) {
      // Double tap - open edit modal (but not for custom button)
      lastTapRef.current = null
      if (option.id !== "custom") {
        setEditingOption(option)
        setShowEditModal(true)
      }
      return
    }
    
    // Single tap
    lastTapRef.current = { id: option.id, time: now }
    
    // Handle custom option
    if (option.id === "custom") {
      setShowCustomModal(true)
      return
    }
    
    // Select the option
    setSelectedOption(option.id)
    setCustomPracticeName("")
  }

  const handleCustomConfirm = (name: string, notes: string) => {
    // Check if we can add more options (max 9, excluding the "custom" button itself)
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    if (nonCustomOptions.length >= 8) {
      // Options are full, just start practice without saving
      setSelectedOption("custom-temp")
      setCustomPracticeName(name)
      setShowCustomModal(false)
      return
    }
    
    // Create a new permanent custom option
    const newOption: PracticeOption = {
      id: `custom-${Date.now()}`,
      label: name,
      labelZh: name,
      notes: notes,
      isCustom: true,
    }
    
    // Insert before the "custom" button
    const updatedOptions = [...practiceOptions]
    const customIndex = updatedOptions.findIndex(o => o.id === "custom")
    updatedOptions.splice(customIndex, 0, newOption)
    setPracticeOptions(updatedOptions)
    
    // Select the new option
    setSelectedOption(newOption.id)
    setCustomPracticeName(name)
    setShowCustomModal(false)
  }

  const handleEditSave = (id: string, name: string, notes: string) => {
    setPracticeOptions(prev => prev.map(o => 
      o.id === id ? { ...o, labelZh: name, label: name, notes } : o
    ))
  }

  const handleEditDelete = (id: string) => {
    // Cannot delete if only 2 non-custom options remain
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    if (nonCustomOptions.length <= 2) {
      return
    }
    
    setPracticeOptions(prev => prev.filter(o => o.id !== id))
    if (selectedOption === id) {
      setSelectedOption(null)
    }
  }

const handleEditRecord = async (id: number, notes: string, photos: string[], breakthrough?: string) => {
  // Update in Supabase
  const updated = await updatePracticeRecord(id, { notes, photos, breakthrough })

  if (updated) {
    // Update local state
    setPracticeHistory(prev => prev.map(r =>
      r.id === id ? updated : r
    ))
  } else {
    alert('更新失败，请检查网络连接')
  }
  }

  const handleDeleteRecord = async (id: number) => {
  // Confirm before deleting
  if (!confirm('确定要删除这条记录吗？')) return

  // Delete from Supabase
  const success = await deletePracticeRecord(id)

  if (success) {
    // Update local state
    setPracticeHistory(prev => prev.filter(r => r.id !== id))
  } else {
    alert('删除失败，请检查网络连接')
  }
  }

  const handleAddRecord = (record: Omit<PracticeRecord, 'id'>) => {
    const newId = Math.max(...practiceHistory.map(r => r.id), 0) + 1
    const newRecord: PracticeRecord = { ...record, id: newId }
    // Insert in chronological order (newest first)
    const updated = [newRecord, ...practiceHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    setPracticeHistory(updated)
  }

  const canDeleteOption = useMemo(() => {
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    return nonCustomOptions.length > 2
  }, [practiceOptions])

  const isOptionsFull = useMemo(() => {
    const nonCustomOptions = practiceOptions.filter(o => o.id !== "custom")
    return nonCustomOptions.length >= 8
  }, [practiceOptions])

  const handleStartPractice = () => {
    if (selectedOption) {
      setIsPracticing(true)
      setIsPaused(false)
      setElapsedTime(0)
    }
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
  }

  const getSelectedLabel = useCallback(() => {
    if ((selectedOption === "custom" || selectedOption === "custom-temp") && customPracticeName) {
      return customPracticeName
    }
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.labelZh || option?.label || ""
  }, [selectedOption, customPracticeName, practiceOptions])

  const handleEndRequest = () => {
    setShowConfirmEnd(true)
  }

  const handleConfirmEnd = () => {
    setShowConfirmEnd(false)
    setFinalDuration(formatMinutes(elapsedTime))
    setShowCompletion(true)
    setIsPracticing(false)
  }

  const handleSavePractice = useCallback(async (notes: string, photos: string[], breakthrough?: string) => {
    // Create new practice record
    const newRecord: Omit<PracticeRecord, 'id' | 'created_at'> = {
      date: new Date().toISOString().split('T')[0],
      type: getSelectedLabel(),
      duration: elapsedTime,
      notes: notes || "今日练习完成",
      photos,
      breakthrough,
    }

    // Save to Supabase
    const savedRecord = await createPracticeRecord(newRecord)

    if (savedRecord) {
      // Add to local state
      setPracticeHistory(prev => [savedRecord, ...prev])

      // Reset UI and switch to journal tab
      setShowCompletion(false)
      setSelectedOption(null)
      setCustomPracticeName("")
      setElapsedTime(0)
      setIsPaused(false)
      setActiveTab('journal') // Switch to 觉察日记 tab
    } else {
      // Handle error - show alert
      alert('保存失败，请检查网络连接')
    }
  }, [elapsedTime, getSelectedLabel])

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
            
            {/* Main circle with glassmorphism gradient border */}
            <div className={`w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] p-[2px] shadow-[0_12px_48px_rgba(45,90,39,0.45)] ${!isPaused ? 'animate-breathe' : ''}`}>
              <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-[16px] flex flex-col items-center justify-center border border-white/30">
                {/* Timer display - Minutes only, using serif font */}
                <span className="text-6xl sm:text-7xl font-light text-foreground tracking-wider font-serif">
                  {formatMinutes(elapsedTime)}
                </span>
                <span className="text-muted-foreground text-xs font-serif mt-1">分钟</span>

                {/* Practice type below */}
                <span className="text-muted-foreground text-sm font-serif mt-4">{getSelectedLabel()}</span>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Control buttons */}
        <div className="px-6 pb-12">
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
              className="px-8 py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif shadow-[0_4px_20px_rgba(45,90,39,0.2)] hover:opacity-90 transition-opacity backdrop-blur-sm border border-white/10"
            >
              结束
            </motion.button>
          </div>
        </div>

        <ConfirmEndDialog isOpen={showConfirmEnd} onClose={() => setShowConfirmEnd(false)} onConfirm={handleConfirmEnd} />

        <CompletionSheet
          isOpen={showCompletion}
          practiceType={getSelectedLabel()}
          duration={finalDuration}
          onSave={handleSavePractice}
        />
      </motion.div>
    )
  }

  // Dashboard View
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - only show on practice tab */}
      {activeTab === 'practice' && (
        <header className="pt-14 pb-6 px-6 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img src="/icon.png" alt="熬汤日记" className="w-8 h-8 rounded-lg" />
            <h1 className="text-2xl font-serif text-foreground tracking-wide">熬汤日记·觉察呼吸</h1>
          </div>
        </header>
      )}

      {/* Tab Content */}
      {activeTab === 'practice' && (
        <main className="flex-1 px-6 flex flex-col pb-32 overflow-y-auto">
          {/* Selection Grid - Glassmorphism on selected */}
          <div className="grid grid-cols-3 gap-3">
            {practiceOptions.map((option) => {
              const isSelected = selectedOption === option.id
              const isCustomButton = option.id === "custom"

              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOptionTap(option)}
                  className={`
                    py-3 px-2 rounded-[20px] text-center font-serif transition-all duration-200
                    min-h-[72px] flex flex-col items-center justify-center
${
                                      isSelected
                                        ? "bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_32px_rgba(45,90,39,0.4)]"
                                        : isCustomButton
                                          ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                                          : "bg-background text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                                    }
                  `}
                >
                  <span className="text-sm leading-tight">{isCustomButton ? "+ 自定义" : option.labelZh}</span>
                  {!isCustomButton && option.notes && (
                    <span className={`text-xs mt-1 leading-tight ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {option.notes}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Hint text */}
          <p className="text-center text-xs text-muted-foreground font-serif mt-3">
            单击选择，双击编辑
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
                                  ? "bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] cursor-pointer backdrop-blur-[16px] border border-white/30 shadow-[0_12px_48px_rgba(45,90,39,0.45)]"
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
        />
      )}
      {activeTab === 'stats' && (
        <StatsTab 
          practiceHistory={practiceHistory} 
          profile={userProfile}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-4 pb-8 z-30">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('practice')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'practice' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-serif">今日练习</span>
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'journal' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-serif">觉察日记</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-serif">我的数据</span>
          </button>
        </div>
      </nav>

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
        onClose={() => setShowSettings(false)}
        profile={userProfile}
        onSave={setUserProfile}
      />

      {/* Completion Sheet */}
      <CompletionSheet
        isOpen={showCompletion}
        practiceType={getSelectedLabel()}
        duration={finalDuration}
        onSave={handleSavePractice}
      />
    </div>
  )
}
