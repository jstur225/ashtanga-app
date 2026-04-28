'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AnnotationType } from '@/lib/annotation-types'

// 9 色调色板（避开 green/orange/yellow）
const PALETTE = [
  '#D4A5A5', '#C4956A', '#7FA8A8', '#A8A0C4', '#C9B99A',
  '#B86C6C', '#7A8BA8', '#8FA88F', '#A89888',
]

const MAX_DISPLAY_TYPES = 8  // 最多显示 8 个 + 1 个添加按钮 = 9 格

export function AnnotationManagerModal({
  isOpen,
  onClose,
  types,
  maxTypes,
  isPro,
  onCreateType,
  onUpdateType,
  onDeleteType,
  onAddAnnotation,
  onRemoveAnnotation,
  annotationDates, // { typeId: Set<"YYYY-MM-DD"> } 已有标注的日期
}: {
  isOpen: boolean
  onClose: () => void
  types: AnnotationType[]
  maxTypes: number
  isPro: boolean
  onCreateType: (label: string, color: string) => Promise<any>
  onUpdateType: (id: string, updates: { label?: string; color?: string }) => Promise<any>
  onDeleteType: (id: string) => Promise<any>
  onAddAnnotation: (typeId: string, date: string) => Promise<any>
  onRemoveAnnotation: (typeId: string, date: string) => Promise<any>
  annotationDates?: Record<string, Set<string>>
}) {
  // ===== 选择状态 =====
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // ===== 创建/编辑弹窗 =====
  const [showForm, setShowForm] = useState<'create' | 'edit' | null>(null)
  const [editingType, setEditingType] = useState<AnnotationType | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formColor, setFormColor] = useState('')

  // ===== 日历 =====
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [viewYear, viewMonth])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 当前选中类型
  const selectedType = types.find(t => t.id === selectedTypeId) ?? null

  // ===== 交互处理 =====
  const handleTypeTap = useCallback((type: AnnotationType) => {
    const now_t = Date.now()
    const lastTap = lastTapRef.current

    // 双击检测（300ms 内同类型）
    if (lastTap && lastTap.id === type.id && now_t - lastTap.time < 300) {
      lastTapRef.current = null
      // 双击 → 打开编辑
      setEditingType(type)
      setFormLabel(type.label)
      setFormColor(type.color)
      setShowForm('edit')
      return
    }

    lastTapRef.current = { id: type.id, time: now_t }

    // 单击 → 选中/取消选中
    if (selectedTypeId === type.id) {
      setSelectedTypeId(null)
    } else {
      setSelectedTypeId(type.id)
    }
  }, [selectedTypeId])

  // 日期点击 — 根据是否已有标注决定添加或删除
  const handleDateClick = useCallback(async (day: number) => {
    if (!selectedTypeId) return
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const hasAnno = annotationDates?.[selectedTypeId]?.has(dateStr)
    if (hasAnno) {
      await onRemoveAnnotation(selectedTypeId, dateStr)
    } else {
      await onAddAnnotation(selectedTypeId, dateStr)
    }
  }, [selectedTypeId, viewYear, viewMonth, annotationDates, onAddAnnotation, onRemoveAnnotation])

  // 判断某日期是否已有选中类型的标注
  const hasAnnotation = useCallback((day: number): boolean => {
    if (!selectedTypeId || !annotationDates) return false
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return annotationDates[selectedTypeId]?.has(dateStr) ?? false
  }, [selectedTypeId, viewYear, viewMonth, annotationDates])

  // 打开创建表单
  const openCreateForm = () => {
    if (types.length >= maxTypes) return
    setFormLabel('')
    setFormColor(PALETTE[types.length % PALETTE.length])
    setShowForm('create')
  }

  // 提交创建
  const confirmCreate = async () => {
    if (!formLabel.trim()) return
    const result = await onCreateType(formLabel.trim(), formColor)
    if (result?.success) {
      setShowForm(null)
    }
    return result
  }

  // 提交编辑
  const confirmEdit = async () => {
    if (!editingType || !formLabel.trim()) return
    const result = await onUpdateType(editingType.id, { label: formLabel.trim(), color: formColor })
    if (result?.success) {
      setShowForm(null)
      setEditingType(null)
    }
    return result
  }

  // 删除
  const handleDelete = async () => {
    if (!editingType) return
    await onDeleteType(editingType.id)
    if (selectedTypeId === editingType.id) {
      setSelectedTypeId(null)
    }
    setShowForm(null)
    setEditingType(null)
  }

  // 关闭
  const handleClose = () => {
    setSelectedTypeId(null)
    setShowForm(null)
    setEditingType(null)
    setMonthOffset(0)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[100]"
            onClick={handleClose}
          />

          {/* 底部 Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
              <h2 className="text-lg font-serif text-foreground">日历标注</h2>
              <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* ===== 类型网格 ===== */}
              <div className="grid grid-cols-3 gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                {/* 已有类型 */}
                {types.slice(0, MAX_DISPLAY_TYPES).map(type => {
                  const isSelected = selectedTypeId === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeTap(type)}
                      className={`
                        py-3 px-1 rounded-[16px] text-center font-serif transition-all duration-200
                        flex flex-col items-center justify-center gap-1.5
                        bg-secondary text-foreground hover:bg-secondary/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                      `}
                    >
                      <div
                        className="w-5 h-5 rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: type.color,
                          boxShadow: isSelected ? `0 0 12px ${type.color}` : 'none',
                        }}
                      />
                      <span className={`text-xs leading-tight transition-colors ${isSelected ? 'font-medium' : ''}`}>
                        {type.label}
                      </span>
                    </button>
                  )
                })}

                {/* 添加按钮 */}
                {types.length < maxTypes && types.length < MAX_DISPLAY_TYPES && (
                  <button
                    onClick={openCreateForm}
                    className="py-3 px-1 rounded-[16px] font-serif flex flex-col items-center justify-center gap-1.5 bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">添加</span>
                  </button>
                )}

                {/* 剩余空位占位 */}
                {Array.from({ length: Math.max(0, MAX_DISPLAY_TYPES - Math.min(types.length, MAX_DISPLAY_TYPES) - (types.length < maxTypes ? 1 : 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="py-3 px-1 rounded-[16px]" />
                ))}
              </div>

              {/* 提示文字 */}
              <p className="text-center text-[10px] text-muted-foreground font-serif mb-1">
                单击选择类型·双击编辑
              </p>

              {/* 限额提示 */}
              {types.length >= maxTypes && (
                <p className="text-center text-[10px] text-muted-foreground font-serif mb-3">
                  {types.length}/{maxTypes} · {!isPro ? '升级 Pro 解锁更多' : '已达上限'}
                </p>
              )}

              {/* ===== 日历区域（有选中类型才显示） ===== */}
              {selectedType && (
                <>
                  {/* 分隔线 */}
                  <div className="border-t border-border my-3" />

                  {/* 当前选中类型指示 */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedType.color }}
                    />
                    <span className="text-sm font-serif text-foreground">{selectedType.label}</span>
                    <span className="text-[10px] text-muted-foreground font-serif">
                      · 点击日期切换
                    </span>
                  </div>

                  {/* 月导航 */}
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <button
                      onClick={() => setMonthOffset(prev => prev - 1)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-serif text-sm text-foreground min-w-[80px] text-center">
                      {viewYear}年{viewMonth + 1}月
                    </span>
                    <button
                      onClick={() => setMonthOffset(prev => prev + 1)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 月历网格 */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(d => (
                      <div key={d} className="text-center text-[10px] text-muted-foreground font-serif py-1">{d}</div>
                    ))}
                    {calendarDays.map((day, idx) => {
                      if (day === null) return <div key={idx} />
                      const hasAnno = hasAnnotation(day)
                      return (
                        <button
                          key={idx}
                          onClick={() => handleDateClick(day)}
                          className={`
                            aspect-square rounded-full flex items-center justify-center text-[11px] font-serif transition-all relative
                            ${hasAnno
                              ? 'bg-foreground text-background'
                              : 'bg-secondary text-foreground hover:bg-secondary/80'
                            }
                          `}
                        >
                          {day}
                          {/* 已标注日期显示小点 */}
                          {hasAnno && (
                            <div
                              className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                              style={{ backgroundColor: selectedType.color }}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ===== 创建/编辑表单（覆盖层） ===== */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute inset-0 bg-card rounded-t-[24px] z-20 p-6 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-serif text-foreground">
                      {showForm === 'create' ? '新建标注' : '编辑标注'}
                    </h2>
                    <button onClick={() => { setShowForm(null); setEditingType(null) }} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 名称 */}
                  <div className="mb-4">
                    <label className="block text-sm font-serif text-foreground mb-2">名称</label>
                    <input
                      type="text"
                      value={formLabel}
                      onChange={e => setFormLabel(e.target.value.slice(0, 10))}
                      placeholder="例如：生理期、旅行..."
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                      autoFocus
                    />
                  </div>

                  {/* 颜色 */}
                  <div className="mb-6">
                    <label className="block text-sm font-serif text-foreground mb-3">颜色</label>
                    <div className="flex gap-3 flex-wrap">
                      {PALETTE.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${
                            formColor === color
                              ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {formColor === color && <Check className="w-4 h-4 mx-auto text-white drop-shadow-sm" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 按钮 */}
                  {showForm === 'edit' ? (
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-3 rounded-full border-2 border-red-200 text-red-500 font-serif transition-all hover:bg-red-50 active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                      <button
                        onClick={confirmEdit}
                        disabled={!formLabel.trim()}
                        className="flex-1 py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={confirmCreate}
                      disabled={!formLabel.trim()}
                      className="w-full py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                    >
                      创建
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
