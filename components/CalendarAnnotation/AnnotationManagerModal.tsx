'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AnnotationType } from '@/lib/annotation-types'

// 9 色调色板（避开 green/orange/yellow）
const PALETTE = [
  '#E8637A', '#B07856', '#2DB5B5', '#9B72CF', '#8B9EB7',
  '#D94F4F', '#5B8FE8', '#D4837A', '#C47AD4',
]

const MAX_DISPLAY_TYPES = 9  // 最多 9 个类型 + 1 个添加按钮 = 10 格（两行×5列）

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

  // ===== 待提交的变更（本地状态，即时反馈） =====
  const [pendingAdds, setPendingAdds] = useState<Record<string, Set<string>>>({})   // { typeId: Set<dateStr> }
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, Set<string>>>({})
  const hasPendingChanges = Object.keys(pendingAdds).some(k => pendingAdds[k].size > 0) ||
    Object.keys(pendingRemoves).some(k => pendingRemoves[k].size > 0)

  // ===== 创建/编辑弹窗 =====
  const [showForm, setShowForm] = useState<'create' | 'edit' | 'full' | null>(null)
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

  // 日期点击 — 本地切换，不调 API
  const handleDateClick = useCallback((day: number) => {
    if (!selectedTypeId) return
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // 判断当前状态：原始数据里有没有
    const originalHas = annotationDates?.[selectedTypeId]?.has(dateStr) ?? false

    if (originalHas) {
      // 原来有 → 切换为移除
      setPendingRemoves(prev => {
        const next = { ...prev }
        const set = new Set(next[selectedTypeId] || [])
        if (set.has(dateStr)) {
          set.delete(dateStr) // 再点一次恢复
        } else {
          set.add(dateStr)
        }
        next[selectedTypeId] = set
        return next
      })
      // 如果同时在 pendingAdds 里，直接取消
      setPendingAdds(prev => {
        const set = prev[selectedTypeId]
        if (set?.has(dateStr)) {
          const next = { ...prev, [selectedTypeId]: new Set([...set].filter(d => d !== dateStr)) }
          return next
        }
        return prev
      })
    } else {
      // 原来没有 → 切换为添加
      setPendingAdds(prev => {
        const next = { ...prev }
        const set = new Set(next[selectedTypeId] || [])
        if (set.has(dateStr)) {
          set.delete(dateStr) // 再点一次取消
        } else {
          set.add(dateStr)
        }
        next[selectedTypeId] = set
        return next
      })
      // 如果同时在 pendingRemoves 里，直接取消
      setPendingRemoves(prev => {
        const set = prev[selectedTypeId]
        if (set?.has(dateStr)) {
          return { ...prev, [selectedTypeId]: new Set([...set].filter(d => d !== dateStr)) }
        }
        return prev
      })
    }
  }, [selectedTypeId, viewYear, viewMonth, annotationDates])

  // 判断某日期是否有某类型的标注（原始 + 待添加 - 待移除）
  const getDateAnnotationColors = useCallback((day: number): { color: string; isCurrentType: boolean }[] => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const result: { color: string; isCurrentType: boolean }[] = []

    for (const type of types) {
      const originalHas = annotationDates?.[type.id]?.has(dateStr) ?? false
      const isPendingAdd = pendingAdds[type.id]?.has(dateStr) ?? false
      const isPendingRemove = pendingRemoves[type.id]?.has(dateStr) ?? false

      const has = (originalHas && !isPendingRemove) || isPendingAdd
      if (has) {
        result.push({ color: type.color, isCurrentType: type.id === selectedTypeId })
      }
    }
    return result
  }, [viewYear, viewMonth, annotationDates, pendingAdds, pendingRemoves, types, selectedTypeId])

  // 批量保存
  const handleSave = useCallback(async () => {
    const promises: Promise<any>[] = []

    // 所有待添加
    for (const [typeId, dates] of Object.entries(pendingAdds)) {
      for (const date of dates) {
        promises.push(onAddAnnotation(typeId, date))
      }
    }
    // 所有待移除
    for (const [typeId, dates] of Object.entries(pendingRemoves)) {
      for (const date of dates) {
        promises.push(onRemoveAnnotation(typeId, date))
      }
    }

    await Promise.all(promises)
    setPendingAdds({})
    setPendingRemoves({})
    handleClose()
  }, [pendingAdds, pendingRemoves, onAddAnnotation, onRemoveAnnotation])

  // 打开创建表单
  const openCreateForm = () => {
    if (types.length >= maxTypes) {
      setShowForm('full')
      return
    }
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
    const confirmed = window.confirm(`确认删除「${editingType.label}」？所有日期的标注记录都会被清空。`)
    if (!confirmed) return
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
    setPendingAdds({})
    setPendingRemoves({})
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
              <div className="flex items-end gap-2">
                <h2 className="text-lg font-serif text-foreground leading-none">日历标注</h2>
                <span className="text-[10px] text-muted-foreground font-serif leading-none">单击选择·双击编辑</span>
              </div>
              <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* ===== 类型网格 ===== */}
              <div className="grid grid-cols-5 gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                {/* 已有类型 */}
                {types.slice(0, MAX_DISPLAY_TYPES).map(type => {
                  const isSelected = selectedTypeId === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeTap(type)}
                      className={`
                        py-2 px-1 rounded-[12px] text-center font-serif transition-all duration-200
                        flex flex-col items-center justify-center gap-1
                        bg-white text-foreground
                      `}
                    >
                      <div
                        className="w-5 h-5 rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: type.color,
                          boxShadow: isSelected ? `0 0 12px ${type.color}` : 'none',
                        }}
                      />
                      <span className="text-xs leading-tight">{type.label}</span>
                    </button>
                  )
                })}

                {/* 添加按钮（始终显示） */}
                <button
                    onClick={openCreateForm}
                    className="py-2 px-1 rounded-[12px] font-serif flex flex-col items-center justify-center gap-1 bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:text-foreground transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">添加</span>
                  </button>

                {/* 剩余空位占位 */}
                {Array.from({ length: Math.max(0, 10 - types.length - 1) }).map((_, i) => (
                  <div key={`empty-${i}`} className="py-2 px-1 rounded-[12px]" />
                ))}
              </div>

              {/* ===== 日历区域（始终显示） ===== */}
              <>
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
                    const dotColors = getDateAnnotationColors(day)
                    return (
                      <button
                        key={idx}
                        disabled={!selectedTypeId}
                        onClick={() => handleDateClick(day)}
                        className={`
                          aspect-square rounded-full flex items-center justify-center text-[11px] font-serif transition-all relative
                          bg-secondary text-foreground hover:bg-secondary/80
                          ${!selectedTypeId ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                        `}
                      >
                        {day}
                        {/* 显示所有类型的圆点 */}
                        {dotColors.length > 0 && (
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-[1px]">
                            {dotColors.slice(0, 3).map((dot, i) => (
                              <div
                                key={i}
                                className="w-1 h-1 rounded-full transition-all"
                                style={{
                                  backgroundColor: dot.color,
                                  opacity: dot.isCurrentType ? 1 : 0.35,
                                }}
                              />
                            ))}
                            {dotColors.length > 3 && (
                              <span className="text-[5px] text-muted-foreground">+{dotColors.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* 保存按钮（有变更时显示） */}
                {hasPendingChanges && (
                  <button
                    onClick={handleSave}
                    className="w-full mt-2 py-3 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    保存
                  </button>
                )}
              </>
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
                      {showForm === 'create' ? '新建标注' : showForm === 'edit' ? '编辑标注' : '提示'}
                    </h2>
                    <button onClick={() => { setShowForm(null); setEditingType(null) }} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {showForm === 'full' ? (
                    <div className="text-center py-8">
                      <p className="text-foreground font-serif mb-2">
                        {isPro ? '标注已满（最多 9 个）' : '免费用户只能创建 1 个标注类型'}
                      </p>
                      <p className="text-muted-foreground text-sm font-serif">
                        {isPro ? '请双击删除已有标注后再添加' : '升级 Pro 可创建 9 个标注类型'}
                      </p>
                    </div>
                  ) : (
                  <>
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
                  </>
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
