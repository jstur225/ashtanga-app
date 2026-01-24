"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useLocalStorage, useInterval } from 'react-use';
import { motion, AnimatePresence } from "framer-motion"
import { usePracticeData, type PracticeRecord, type PracticeOption, type UserProfile } from "@/hooks/usePracticeData"
import { BookOpen, BarChart3, Calendar, X, Camera, Pause, Play, Trash2, User, Settings, ChevronLeft, ChevronRight, ChevronUp, Cloud, Download, Upload, Plus, Share2, Sparkles, Check, Copy, ClipboardPaste } from "lucide-react"
import { FakeDoorModal } from "@/components/FakeDoorModal"
import { ImportModal } from "@/components/ImportModal"
import { ExportModal } from "@/components/ExportModal"
import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'
import { captureWithFallback, formatErrorForUser } from '@/lib/screenshot'

// Helper functions
function getLocalDateStr() {
  const now = new Date()
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
  practiceOptions,
  practiceHistory = [],
}: {
  isOpen: boolean
  onClose: () => void
  record: PracticeRecord | null
  onSave: (id: string, data: Partial<PracticeRecord>) => void
  onDelete: (id: string) => void
  practiceOptions: PracticeOption[]
  practiceHistory?: PracticeRecord[]
}) {
  const [notes, setNotes] = useState("")
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 新增：日期、类型、时长的状态
  const [date, setDate] = useState("")
  const [type, setType] = useState("")
  const [duration, setDuration] = useState(60)

  // 新增：子模态框状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  // 日期显示格式化
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "选择日期"
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  useEffect(() => {
    if (record) {
      setNotes(record.notes)
      setBreakthroughEnabled(!!record.breakthrough)
      setBreakthroughText(record.breakthrough || "")
      setDate(record.date)
      setType(record.type)
      setDuration(Math.floor(record.duration / 60)) // 转换为分钟
    }
  }, [record])

  const handleSave = () => {
    if (record) {
      onSave(record.id, {
        notes,
        breakthrough: breakthroughEnabled ? breakthroughText : undefined,
        date,
        type,
        duration: duration * 60, // 转换为秒
      })
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
                {/* Date & Type - 可编辑 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">日期</label>
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif text-left transition-all hover:bg-secondary/80 active:scale-[0.98] text-sm"
                    >
                      {formatDateDisplay(date)}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习类型</label>
                    <button
                      onClick={() => setShowTypeSelector(true)}
                      className={`
                        w-full px-3 py-2.5 rounded-xl font-serif text-left transition-all active:scale-[0.98] text-sm
                        ${type
                          ? 'bg-gradient-to-br from-[rgba(45,90,39,0.15)] to-[rgba(74,122,68,0.1)] text-primary border border-primary/20'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }
                      `}
                    >
                      {type ? type.split(' ')[0] : "选择类型"}
                    </button>
                  </div>
                </div>

                {/* Duration & Breakthrough Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习时长 (分钟)</label>
                    <input
                      type="number"
                      value={duration || ''}
                      onChange={(e) => setDuration(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="输入时长"
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-serif text-muted-foreground mb-1.5">突破时刻</label>
                    <button
                      type="button"
                      onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
                      className={`w-full flex items-center justify-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
                        breakthroughEnabled
                          ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                          : 'bg-secondary border-transparent text-muted-foreground'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${breakthroughEnabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-serif">解锁/突破</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {breakthroughEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1">
                        <label className="block text-xs font-serif text-muted-foreground mb-1.5">觉察/笔记</label>
                        <input
                          type="text"
                          value={breakthroughText}
                          onChange={(e) => setBreakthroughText(e.target.value)}
                          placeholder="记录今天的里程碑..."
                          maxLength={20}
                          className="w-full px-3 py-2.5 rounded-xl bg-orange-50 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-orange-300/50 transition-all border border-orange-200 text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Editable notes */}
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                    觉察/笔记 <span className="text-muted-foreground/60">（最多2000字）</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                    placeholder="今天的练习感受如何？"
                    rows={5}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif text-sm"
                  />
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

          {/* DatePicker Modal */}
          <DatePickerModal
            isOpen={showDatePicker}
            onClose={(selectedDate) => {
              if (selectedDate) {
                setDate(selectedDate)
              }
              setShowDatePicker(false)
            }}
            maxDate={new Date().toISOString().split('T')[0]}
            practiceHistory={practiceHistory}
          />

          {/* TypeSelector Modal */}
          <TypeSelectorModal
            isOpen={showTypeSelector}
            onClose={(selectedType) => {
              if (selectedType && selectedType !== "__custom__") {
                setType(selectedType)
              }
              setShowTypeSelector(false)
            }}
            practiceOptions={practiceOptions}
            selectedType={type}
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
}) {
  const [editableNotes, setEditableNotes] = useState("")
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [originalNotes, setOriginalNotes] = useState("")

  useEffect(() => {
    if (record) {
      const notes = record.notes || "今日练习完成"
      setEditableNotes(notes)
      setOriginalNotes(notes)
    }
  }, [record])

  const isNotesModified = editableNotes !== originalNotes

  // 图片导出功能
  const handleExportImage = async () => {
    const element = document.getElementById('share-card-content')
    if (!element) {
      toast.error('未找到分享卡片内容')
      return
    }

    try {
      toast.loading('正在生成图片...', { id: 'export' })

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
        practice_type: record?.type,
        has_breakthrough: !!record?.breakthrough,
        has_notes: editableNotes !== originalNotes,
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
        practice_type: record?.type,
        has_breakthrough: !!record?.breakthrough,
        has_notes: editableNotes !== originalNotes,
        export_method: 'error',
        export_success: false
      })
      toast.dismiss('export')
      toast.error('导出失败，请重试')
    }
  }

  if (!record) return null

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
            <div className="flex flex-col gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              {/* Share Card Content (for screenshot) */}
              <div
                id="share-card-content"
                className="bg-background rounded-3xl shadow-2xl overflow-hidden"
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

              {/* Reflection Text - Editable Notes with elegant serif font */}
              <div className="px-5 py-6">
                {isEditingNotes ? (
                  <textarea
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    onBlur={() => setIsEditingNotes(false)}
                    autoFocus
                    rows={4}
                    className="w-full text-sm text-foreground font-serif leading-relaxed bg-transparent focus:outline-none resize-none"
                  />
                ) : (
                  <p
                    onClick={() => setIsEditingNotes(true)}
                    className="text-sm text-foreground font-serif leading-relaxed cursor-text hover:bg-secondary/30 rounded-lg p-1 -m-1 transition-colors whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto"
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
            </div>

            {/* Actions (outside screenshot area) */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
              >
                返回
              </button>
              <button
                onClick={() => {
                  console.log('按钮点击 - isNotesModified:', isNotesModified)
                  console.log('editableNotes:', editableNotes)
                  console.log('originalNotes:', originalNotes)

                  if (isNotesModified) {
                    console.log('走保存文案分支')
                    // 保存文案，但不关闭模态框
                    if (record) {
                      onEditRecord(record.id, editableNotes, [], record.breakthrough)
                      setOriginalNotes(editableNotes) // 更新原始文案
                    }
                  } else {
                    console.log('走导出图片分支')
                    // 导出图片
                    handleExportImage()
                  }
                }}
                className="flex-1 py-3 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                {isNotesModified ? '保存' : '保存图片'}
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
      onClose(dateStr)
    }
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[80vh] overflow-y-auto"
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
                disabled={!canGoNext}
                className={`p-2 transition-colors ${
                  canGoNext
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'text-muted-foreground/30'
                }`}
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
                const isFuture = new Date(dateStr) > today

                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    disabled={isFuture}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      aspect-square rounded-full flex items-center justify-center
                      text-[9px] font-serif transition-all
                      ${hasPractice && !isFuture
                        ? 'bg-gradient-to-br from-[rgba(45,90,39,0.9)] to-[rgba(74,122,68,0.75)] backdrop-blur-sm border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.3)] text-white cursor-pointer hover:shadow-[0_2px_12px_rgba(45,90,39,0.45)]'
                        : isFuture
                          ? 'bg-background text-muted-foreground/50 cursor-not-allowed'
                          : 'bg-background text-foreground cursor-pointer hover:bg-secondary'
                      }
                    `}
                  >
                    {day}
                  </motion.button>
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
    if (option.id === "custom") {
      // 点击自定义按钮，通知父组件
      onClose("__custom__")
    } else {
      // 点击普通按钮，返回 labelZh + notes 组合以区分同名选项
      const typeValue = option.notes
        ? `${option.labelZh || option.label} ${option.notes}`
        : (option.labelZh || option.label)
      onClose(typeValue)
    }
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[32px] z-[80] flex flex-col max-h-[70vh] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
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
                {practiceOptions.map((option) => {
                  // 使用 labelZh + notes 组合来精确匹配，避免同名选项同时高亮
                  const optionTypeValue = option.notes
                    ? `${option.labelZh || option.label} ${option.notes}`
                    : (option.labelZh || option.label)
                  const isSelected = selectedType === optionTypeValue
                  const isCustomButton = option.id === "custom"

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
                            ? "bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                            : isCustomButton
                              ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                              : "bg-card text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                        }
                      `}
                    >
                      <span className="text-[14px] leading-snug break-words w-full line-clamp-2">
                        {isCustomButton ? "+ 自定义" : option.labelZh}
                      </span>
                      {!isCustomButton && option.notes && (
                        <span className={`
                          text-[11px] mt-1 leading-snug break-words w-full line-clamp-1
                          ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}
                        `}>
                          {option.notes}
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

// Add Practice Modal (添加练习) - 使用DatePickerModal和TypeSelectorModal
function AddPracticeModal({
  isOpen,
  onClose,
  onSave,
  practiceOptions,
  practiceHistory = [],
  onAddOption,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>) => void
  practiceOptions: PracticeOption[]
  practiceHistory?: PracticeRecord[]
  onAddOption?: (name: string, notes: string) => void
}) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [type, setType] = useState("")
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState("")
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")

  // 子模态框状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)

  // 日期显示格式化
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "选择日期"
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const typeOptions = useMemo(() => {
    return practiceOptions
      .filter(o => o.id !== "custom")
      .map(o => ({ value: o.labelZh || o.label, label: o.labelZh || o.label }))
  }, [practiceOptions])

  // 处理自定义练习确认
  const handleCustomPracticeConfirm = (name: string, notes: string) => {
    console.log('handleCustomPracticeConfirm called with:', name, notes)
    console.log('onAddOption function:', onAddOption)
    // 调用父组件的 addOption 方法保存到 localStorage
    if (onAddOption) {
      console.log('calling onAddOption...')
      onAddOption(name, notes)
      console.log('onAddOption called')
      // 设置选中的类型
      setType(name)
      // 延迟关闭弹窗，确保用户看到toast提示和选项保存完成
      setTimeout(() => {
        setShowCustomModal(false)
      }, 800)
    } else {
      console.log('onAddOption is undefined!')
      setType(name)
      setShowCustomModal(false)
    }
  }

  const handleSave = () => {
    if (date && type) {
      onSave({
        date,
        type,
        duration: duration * 60, // Convert to seconds
        notes: notes || "今日练习完成",
        breakthrough: breakthroughEnabled ? breakthroughText : undefined,
      })
      // Reset form
      setDate(new Date().toISOString().split('T')[0])
      setType("")
      setDuration(60)
      setNotes("")
      setBreakthroughEnabled(false)
      setBreakthroughText("")
      onClose()
    }
  }

  return (
    <>
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[70] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground font-semibold">🧘‍♀️添加练习</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Date & Type - 使用按钮触发模态框 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">日期</label>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif text-left transition-all hover:bg-secondary/80 active:scale-[0.98] text-sm"
                  >
                    {formatDateDisplay(date)}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习类型</label>
                  <button
                    onClick={() => setShowTypeSelector(true)}
                    className={`
                      w-full px-3 py-2.5 rounded-xl font-serif text-left transition-all active:scale-[0.98] text-sm
                      ${type
                        ? 'bg-gradient-to-br from-[rgba(45,90,39,0.15)] to-[rgba(74,122,68,0.1)] text-primary border border-primary/20'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }
                    `}
                  >
                    {type ? type.split(' ')[0] : "选择类型"}
                  </button>
                </div>
              </div>

              {/* Duration & Breakthrough Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5">练习时长 (分钟)</label>
                  <input
                    type="number"
                    value={duration || ''}
                    onChange={(e) => setDuration(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="输入时长"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-serif text-muted-foreground mb-1.5 opacity-0">突破时刻</label>
                  <button
                    onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
                    className={`w-full flex items-center justify-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
                      breakthroughEnabled
                        ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                        : 'bg-secondary border-transparent text-muted-foreground'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${breakthroughEnabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-serif">解锁/突破</span>
                  </button>
                </div>
              </div>

              {/* Breakthrough Input - Expandable */}
              <AnimatePresence>
                {breakthroughEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1">
                      <label className="block text-xs font-serif text-muted-foreground mb-1.5">突破内容</label>
                      <input
                        type="text"
                        value={breakthroughText}
                        onChange={(e) => setBreakthroughText(e.target.value)}
                        placeholder="记录今天的里程碑..."
                        maxLength={20}
                        className="w-full px-3 py-2.5 rounded-xl bg-orange-50 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-orange-300/50 transition-all border border-orange-200 text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-2">
                  觉察/笔记 <span className="text-muted-foreground/60">（最多2000字）</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="记录呼吸、体感和觉察..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!date || !type}
                className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                保存练习
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* 子模态框：日期选择器 - z-[80] */}
  <DatePickerModal
    isOpen={showDatePicker}
    onClose={(selectedDate) => {
      if (selectedDate) {
        setDate(selectedDate)
      }
      setShowDatePicker(false)
    }}
    maxDate={new Date().toISOString().split('T')[0]}
    practiceHistory={practiceHistory}
  />

  {/* 子模态框：类型选择器 - z-[80] */}
  <TypeSelectorModal
    isOpen={showTypeSelector}
    onClose={(selectedType) => {
      if (selectedType === "__custom__") {
        // 点击自定义按钮，清空当前选择
        setType("")
        setShowCustomModal(true)
      } else if (selectedType) {
        setType(selectedType)
      }
      setShowTypeSelector(false)
    }}
    practiceOptions={practiceOptions}
    selectedType={type}
  />

  {/* Custom Practice Modal - 自定义练习弹窗 */}
  <CustomPracticeModal
    isOpen={showCustomModal}
    onClose={() => setShowCustomModal(false)}
    onConfirm={handleCustomPracticeConfirm}
    isFull={false}
  />
  </>
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
}: {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  onOpenExport: () => void
  onOpenImport: () => void
  onExportLog?: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [activeSection, setActiveSection] = useState<'profile' | 'data'>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    onSave({ ...profile, name, signature, avatar })
    onClose()
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
                个人资料
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
                </>
              )}

              {activeSection === 'data' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 mb-2">
                    <p className="text-xs text-orange-600 font-serif leading-relaxed">
                      隐私安全原因，所有数据保存在本地。卸载浏览器或清除缓存前，一定要备份。
                    </p>
                  </div>

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
                      onClick={onExportLog}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-500">
                          <Copy className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-serif text-foreground">运行日志</div>
                          <div className="text-[10px] text-muted-foreground font-serif">如遇问题，请复制本日志发给开发者</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white font-serif shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  保存设置
                </button>
              </div>
            </div>
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
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(false)
  const [breakthroughText, setBreakthroughText] = useState("")

  const handleSave = () => {
    onSave(notes, [], breakthroughEnabled ? breakthroughText : undefined)
    setNotes("")
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
                  className={`w-full flex items-center justify-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
                    breakthroughEnabled
                      ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                      : 'bg-secondary border-transparent text-muted-foreground'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${breakthroughEnabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-serif">解锁/突破</span>
                </button>

                {/* Conditional Breakthrough Input */}
                <AnimatePresence>
                  {breakthroughEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1">
                        <label className="block text-xs font-serif text-muted-foreground mb-1.5">觉察/笔记</label>
                        <input
                          type="text"
                          value={breakthroughText}
                          onChange={(e) => setBreakthroughText(e.target.value)}
                          placeholder="记录今天的里程碑..."
                          maxLength={20}
                          className="w-full px-3 py-2.5 rounded-xl bg-orange-50 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-orange-300/50 transition-all border border-orange-200 text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                  觉察/笔记 <span className="text-muted-foreground/60">（最多2000字）</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="今天的练习感受如何？有什么觉察或洞见..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/2000</div>
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
// Monthly Heatmap for Journal - Now with CIRCLES instead of squares
function MonthlyHeatmap({
  practiceHistory,
  onDayClick,
  onOpenFakeDoor,
  onAddRecord,
  votedCloud
}: {
  practiceHistory: PracticeRecord[]
  onDayClick: (dateStr: string) => void
  onOpenFakeDoor: () => void
  onAddRecord: () => void
  votedCloud: boolean
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
          <SyncButton onOpenFakeDoor={onOpenFakeDoor} hasVoted={votedCloud || false} />
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
          const isPast = day ? dateStr <= todayStr : false
          
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
function SyncButton({ onOpenFakeDoor, hasVoted }: { onOpenFakeDoor: () => void; hasVoted: boolean }) {
  const [isSpinning, setIsSpinning] = useState(false)
  
  const handleClick = () => {
    setIsSpinning(true)
    onOpenFakeDoor()
    setTimeout(() => setIsSpinning(false), 800)
  }
  
  return (
    <button
      onClick={handleClick}
      className={`relative w-8 h-8 rounded-full backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.2)] flex items-center justify-center transition-all ${
        hasVoted 
          ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)]' 
          : 'bg-stone-400'
      }`}
    >
      <motion.div
        animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <Cloud className={`w-4 h-4 ${hasVoted ? 'text-[#FAF7F2]' : 'text-stone-200'}`} />
      </motion.div>
      {/* Status dot */}
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1 ${hasVoted ? 'bg-green-400' : 'bg-red-400'}`} />
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
  onAddOption,
  votedCloud,
  onLogExport,
}: {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  profile: UserProfile
  onEditRecord: (id: string, notes: string, photos: string[], breakthrough?: string) => void
  onDeleteRecord: (id: string) => void
  onAddRecord: (record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>) => void
  onOpenFakeDoor: () => void
  onAddOption?: (name: string, notes: string) => void
  votedCloud: boolean
  onLogExport: (log: any) => void
}) {
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null)
  const [sharingRecord, setSharingRecord] = useState<PracticeRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 提取练习类型名称（去除备注）
  const getTypeDisplayName = (type: string) => {
    // type格式可能是："一序列 Mysore" 或 "Primary 1 - Mysore"
    // 提取第一部分（在空格或" - "之前）
    return type.split(/\s+|-\s*/)[0]
  }

  // 适配器函数：将 ShareCardModal 的调用格式转换为 handleEditRecord 期望的格式
  const handleShareCardEdit = (id: string, notes: string, photos: string[], breakthrough?: string) => {
    const updateData: Partial<PracticeRecord> = {
      notes,
      photos,
      ...(breakthrough !== undefined && { breakthrough })
    }
    onEditRecord(id, updateData)
  }

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
  const today = new Date()
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
          onOpenFakeDoor={onOpenFakeDoor}
          onAddRecord={() => setShowAddModal(true)}
          votedCloud={votedCloud}
        />
      </div>
      
      {/* Timeline - continuous, split click zones */}
      <div className="px-2 pb-10">
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
                <div className={`absolute mt-[10px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${practice.breakthrough ? 'bg-gradient-to-br from-[#e67e22] to-[#f39c12]' : 'bg-gradient-to-br from-[rgba(45,90,39,0.9)] to-[rgba(74,122,68,0.8)]'}`} />
              </div>

              {/* Right Column: Content - Left-aligned with matching breathing room */}
              <div className="flex-1 pl-3 pr-6 pb-1">
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
                  <p className="text-sm text-foreground font-serif leading-snug whitespace-pre-wrap break-words w-full">
                    {practice.notes}
                  </p>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={onEditRecord}
        onDelete={onDeleteRecord}
        practiceOptions={practiceOptions}
        practiceHistory={practiceHistory}
      />

      <ShareCardModal
        isOpen={!!sharingRecord}
        onClose={() => setSharingRecord(null)}
        record={sharingRecord}
        profile={profile}
        totalPracticeCount={totalPracticeCount}
        thisMonthDays={thisMonthDays}
        totalHours={totalHours}
        onEditRecord={handleShareCardEdit}
        onLogExport={onLogExport}
      />

      <AddPracticeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={onAddRecord}
        practiceOptions={practiceOptions}
        practiceHistory={practiceHistory}
        onAddOption={onAddOption}
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
  onOpenSettings,
  onOpenFakeDoor
}: { 
  practiceHistory: PracticeRecord[]
  profile: UserProfile
  onOpenSettings: () => void
  onOpenFakeDoor: () => void
}) {
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
    let totalMinutes = 0
    
    practiceHistory.forEach((record) => {
      const date = new Date(record.date)
      // Check if record is in current month and year, and not in future (by string comparison for safety)
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && record.date <= todayStr) {
        if (record.duration > 0) {
          practiceDays++
          totalMinutes += Math.floor(record.duration / 60)
        }
      }
    })
    
    const avgDuration = practiceDays > 0 ? Math.round(totalMinutes / practiceDays) : 0
    
    return { practiceDays, totalMinutes, avgDuration }
  }, [practiceHistory, today, todayStr])

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
    const daysCount = viewMode === 'quarter' ? 90 : viewMode === 'half' ? 180 : 365
    const daysOffset = viewMode === 'quarter' ? dateOffset * 90 : viewMode === 'half' ? dateOffset * 180 : dateOffset * 365
    const result: string[] = []

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i - daysOffset)
      result.push(d.toISOString().split('T')[0])
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
      {/* Header - only settings icon */}
      <div className="px-6 flex items-center justify-end mb-4 pt-10">
        <button 
          onClick={onOpenSettings}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pb-48">
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
            <ProBadge isPro={hasVotedPro} />
          </div>
          <p className="text-[10px] font-mono text-gray-400 mt-1">ID: {profile.id?.slice(0, 8) || 'ANONYMOUS'}</p>
          <p className="text-sm text-muted-foreground font-serif mt-1">{profile.signature}</p>
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
              {(['quarter', 'half', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setDateOffset(0) }}
                  className={`px-2 py-1 rounded-full text-xs font-mono transition-all ${
                    viewMode === mode
                      ? 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white shadow-sm'
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
    importData
  } = usePracticeData()

  const [practiceOptions, setPracticeOptions] = useState<PracticeOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [customPracticeName, setCustomPracticeName] = useState("")
  const [isPracticing, setIsPracticing] = useLocalStorage('ashtanga_is_practicing', false)
  const [isPaused, setIsPaused] = useLocalStorage('ashtanga_is_paused', false)
  const [startTime, setStartTime] = useLocalStorage<number | null>('ashtanga_start_time', null)
  const [pauseStartTime, setPauseStartTime] = useLocalStorage<number | null>('ashtanga_pause_start_time', null)
  const [totalPausedTime, setTotalPausedTime] = useLocalStorage<number>('ashtanga_total_paused_time', 0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOption, setEditingOption] = useState<PracticeOption | null>(null)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [finalDuration, setFinalDuration] = useState("")
  const [activeTab, setActiveTab] = useState<'practice' | 'journal' | 'stats'>('practice')
  const [showSettings, setShowSettings] = useState(false)
  const [showFakeDoor, setShowFakeDoor] = useState<{ type: 'cloud' | 'pro', isOpen: boolean }>({ type: 'cloud', isOpen: false })
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportedData, setExportedData] = useState('')
  const [votedCloud, setVotedCloud] = useLocalStorage('voted_cloud_sync', false)
  const [isSaving, setIsSaving] = useState(false)
  const [exportLogs, setExportLogs] = useLocalStorage<{
    timestamp: string
    success: boolean
    error?: string
    userAgent: string
    recordDate?: string
  }[]>('ashtanga_export_logs', [])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // Initialize practice options from hook data
  useEffect(() => {
    setPracticeOptions([
      ...practiceOptionsData.map(o => ({
        id: o.id,
        label: o.label,
        labelZh: o.label_zh,
        notes: o.notes,
        isCustom: o.is_custom
      })),
      { id: "custom", label: "Custom", labelZh: "自定义" }
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

    // Create a new permanent custom option and save to localStorage
    const newOption = addOption(name, name)
    if (notes) {
      updateOption(newOption.id, name, name, notes)
    }

    // Update local state will be handled by useEffect when practiceOptionsData changes
    setCustomPracticeName(name)
    setShowCustomModal(false)

    toast.success('已添加自定义选项')
  }

  const handleEditSave = (id: string, name: string, notes: string) => {
    // Update localStorage
    updateOption(id, name, name, notes)

    // Update local state
    setPracticeOptions(prev => prev.map(o =>
      o.id === id ? { ...o, labelZh: name, label: name, notes } : o
    ))

    toast.success('已保存修改')
  }

  const handleEditDelete = (id: string) => {
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
  }

  const handleEditRecord = (id: string, data: Partial<PracticeRecord>) => {
    updateRecord(id, data)
    toast.success('更新成功')
  }

  const handleDeleteRecord = (id: string) => {
    // Confirm before deleting
    if (!confirm('确定要删除这条记录吗？')) return
    deleteRecord(id)
    toast.success('已删除记录')
  }

  const handleAddRecord = (record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>) => {
    addRecord(record)
    trackEvent('add_record', {
      type: record.type,
      duration: record.duration,
      date: record.date,
      has_breakthrough: !!record.breakthrough,
      has_notes: !!record.notes && record.notes.length > 0
    })
    toast.success('补卡成功！')
  }

  const handleAddOption = (name: string, notes: string) => {
    console.log('handleAddOption called with:', name, notes)
    const newOption = addOption(name, name)
    console.log('newOption created:', newOption)
    if (notes) {
      updateOption(newOption.id, name, name, notes)
      console.log('updated option with notes:', notes)
    }
    console.log('current practiceOptionsData after add:', practiceOptionsData)
    toast.success('已添加自定义选项')
  }

  const handleVoteCloud = () => {
    // Update the votedCloud state directly
    setVotedCloud(true)
  }

  const handleExportDebugLog = () => {
    // 1. 收集环境信息
    const environment = {
      browser: navigator.userAgent,
      deviceType: /mobile|tablet|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      exportTime: new Date().toISOString()
    }

    // 2. 收集应用状态（包含完整选项列表）
    const appState = {
      recordsCount: practiceHistory.length,
      optionsCount: practiceOptions.length,
      totalDuration: practiceHistory.reduce((sum, r) => sum + (r.duration || 0), 0),
      hasCustomOptions: practiceOptions.some(o => o.is_custom),
      optionsList: practiceOptions.map(o => ({
        id: o.id,
        label: o.label,
        labelZh: o.label_zh || '',
        notes: o.notes || '',
        isCustom: o.is_custom
      }))
    }

    // 3. 读取localStorage数据（只读统计）
    const storageState = {
      localStorageKeys: Object.keys(localStorage).filter(key =>
        key.startsWith('ashtanga_') || key.includes('practice')
      ),
      estimatedSize: new Blob(Object.values(localStorage)).size
    }

    // 4. 生成日志（最近20条，增强字段）
    const debugLog = {
      environment,
      appState,
      storageState,
      recentActivity: practiceHistory.slice(-20).map(r => ({
        id: r.id,
        date: r.date,
        type: r.type,
        duration: r.duration,
        hasNotes: !!r.notes,
        notesLength: r.notes?.length || 0,
        hasPhotos: !!r.photos?.length,
        photosCount: r.photos?.length || 0,
        hasBreakthrough: !!r.breakthrough
      })),
      userProfile: {
        name: userProfile?.name || '未设置',
        hasAvatar: !!userProfile?.avatar,
        isPro: userProfile?.is_pro || false
      },
      imageExportHistory: exportLogs.slice(-10).map(log => ({
        timestamp: log.timestamp,
        success: log.success,
        error: log.error,
        userAgent: log.userAgent.substring(0, 200), // 截断过长的 UA
        recordDate: log.recordDate
      }))
    }

    // 5. 转换为JSON并复制到剪贴板
    const jsonString = JSON.stringify(debugLog, null, 2)
    navigator.clipboard.writeText(jsonString).then(() => {
      toast.success('✅ 日志已复制到剪贴板', {
        duration: 3000,
        position: 'top-center'
      })
    }).catch(() => {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = jsonString
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.success('✅ 日志已复制到剪贴板')
    })
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
      const now = Date.now()
      setStartTime(now)
      setIsPracticing(true)
      setIsPaused(false)
      setTotalPausedTime(0)
      setPauseStartTime(null)
      setElapsedTime(0)
      trackEvent('start_practice', { type: getSelectedLabel() })
    }
  }

  const handlePauseResume = () => {
    const now = Date.now()
    if (!isPaused) {
      // Pause
      setPauseStartTime(now)
    } else {
      // Resume
      if (pauseStartTime) {
        const pausedDuration = now - pauseStartTime
        setTotalPausedTime((totalPausedTime || 0) + pausedDuration)
      }
      setPauseStartTime(null)
    }
    setIsPaused(!isPaused)
    trackEvent(isPaused ? 'resume_practice' : 'pause_practice')
  }

  const getSelectedLabel = useCallback(() => {
    if ((selectedOption === "custom" || selectedOption === "custom-temp") && customPracticeName) {
      return customPracticeName
    }
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.labelZh || option?.label || ""
  }, [selectedOption, customPracticeName, practiceOptions])

  const getSelectedNotes = useCallback(() => {
    const option = practiceOptions.find((o) => o.id === selectedOption)
    return option?.notes || ""
  }, [selectedOption, practiceOptions])

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
    setPauseStartTime(null)
    setTotalPausedTime(0)
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

      // Create new practice record
      const record = addRecord({
        date: new Date().toISOString().split('T')[0],
        type: selectedLabel,
        duration: elapsedTime,
        notes: notes || "今日练习完成",
        breakthrough,
      })
      console.log('Record added:', record)

      trackEvent('finish_practice', {
        type: record.type,
        duration: record.duration,
        is_patch: false
      })

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
  }, [elapsedTime, getSelectedLabel, addRecord, isSaving])

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
            <div className={`w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] p-[2px] shadow-[0_12px_48px_rgba(45,90,39,0.45)] ${!isPaused ? 'animate-breathe' : ''}`}>
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

        {/* Control buttons - moved up 30% to avoid clipping on mobile */}
        <div className="px-6 pb-32">
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
              className="px-8 py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif shadow-[0_4px_20px_rgba(45,90,39,0.2)] hover:opacity-90 transition-opacity"
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
                        ? "bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                        : isCustomButton
                          ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                          : "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
                    }
                  `}
                >
                  <span className="text-[14px] leading-snug break-words w-full line-clamp-2">{isCustomButton ? "+ 自定义" : option.labelZh}</span>
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
          onOpenFakeDoor={() => setShowFakeDoor({ type: 'cloud', isOpen: true })}
          onAddOption={handleAddOption}
          votedCloud={votedCloud}
          onLogExport={(log) => setExportLogs([...exportLogs, log])}
        />
      )}
      {activeTab === 'stats' && (
        <StatsTab 
          practiceHistory={practiceHistory} 
          profile={userProfile}
          onOpenSettings={() => setShowSettings(true)}
          onOpenFakeDoor={() => setShowFakeDoor({ type: 'pro', isOpen: true })}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-4 pb-4 z-30">
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
        onSave={updateProfile}
        onOpenExport={() => {
          const data = exportData()
          setExportedData(data)
          setShowExportModal(true)
          trackEvent('export_data')
        }}
        onOpenImport={() => setShowImportModal(true)}
        onExportLog={handleExportDebugLog}
      />

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

      {/* Completion Sheet */}
      <CompletionSheet
        isOpen={showCompletion}
        practiceType={getSelectedLabel()}
        duration={finalDuration}
        onSave={handleSavePractice}
      />

      {/* Fake Door Modal */}
      <FakeDoorModal
        type={showFakeDoor.type}
        isOpen={showFakeDoor.isOpen}
        onClose={() => setShowFakeDoor({ ...showFakeDoor, isOpen: false })}
        onVote={handleVoteCloud}
      />
    </div>
  )
}
