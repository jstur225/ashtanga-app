'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react'
import type { AnnotationType } from '@/lib/annotation-types'

// 9 色调色板（避开 green/orange/yellow）
const PALETTE = [
  '#D4A5A5', // Dusty Rose — 生理期
  '#C4956A', // Warm Clay — 旅行
  '#7FA8A8', // Soft Teal — 训练营
  '#A8A0C4', // Muted Lavender — 冥想
  '#C9B99A', // Sand — 轻量标记
  '#B86C6C', // Brick Red — 重要事项
  '#7A8BA8', // Slate Blue — 学习
  '#8FA88F', // Sage — 健康
  '#A89888', // Taupe — 常规
]

type ViewMode = 'list' | 'create' | 'edit' | 'dates'

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
}) {
  const [view, setView] = useState<ViewMode>('list')
  const [selectedType, setSelectedType] = useState<AnnotationType | null>(null)

  // 创建/编辑表单
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')

  // 日期选择
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 日历网格
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [viewYear, viewMonth])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 已选中的日期集合（用 Set 存 "YYYY-MM-DD"）
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  // 进入日期选择模式
  const enterDatePicker = (type: AnnotationType) => {
    setSelectedType(type)
    setSelectedDates(new Set())
    setView('dates')
  }

  // 切换日期
  const toggleDate = (day: number) => {
    if (!selectedType) return
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) {
        next.delete(dateStr)
      } else {
        next.add(dateStr)
      }
      return next
    })
  }

  // 提交日期选择
  const confirmDates = async () => {
    if (!selectedType) return
    for (const date of selectedDates) {
      await onAddAnnotation(selectedType.id, date)
    }
    setView('list')
    setSelectedDates(new Set())
  }

  // 开始创建
  const startCreate = () => {
    if (types.length >= maxTypes) return
    setEditLabel('')
    setEditColor(PALETTE[types.length % PALETTE.length])
    setView('create')
  }

  // 提交创建
  const confirmCreate = async () => {
    if (!editLabel.trim()) return
    const result = await onCreateType(editLabel.trim(), editColor)
    if (result?.success) {
      setView('list')
    }
    return result
  }

  // 开始编辑
  const startEdit = (type: AnnotationType) => {
    setSelectedType(type)
    setEditLabel(type.label)
    setEditColor(type.color)
    setView('edit')
  }

  // 提交编辑
  const confirmEdit = async () => {
    if (!selectedType || !editLabel.trim()) return
    const result = await onUpdateType(selectedType.id, { label: editLabel.trim(), color: editColor })
    if (result?.success) {
      setView('list')
    }
    return result
  }

  // 删除确认
  const handleDelete = async (type: AnnotationType) => {
    await onDeleteType(type.id)
  }

  // 关闭时重置状态
  const handleClose = () => {
    setView('list')
    setSelectedType(null)
    setSelectedDates(new Set())
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            {/* ===== 屏1: 标注类型列表 ===== */}
            {view === 'list' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-serif text-foreground">日历标注</h2>
                  <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 类型列表 */}
                <div className="space-y-2 mb-4">
                  {types.length === 0 ? (
                    <p className="text-center text-muted-foreground font-serif py-8 text-sm">
                      还没有标注类型，点击下方按钮添加
                    </p>
                  ) : (
                    types.map(type => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <button
                          onClick={() => enterDatePicker(type)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="font-serif text-foreground text-sm">{type.label}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(type)}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(type)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 上限提示 */}
                <div className="text-center mb-4">
                  <span className="text-xs text-muted-foreground font-serif">
                    {types.length}/{maxTypes} 个标注类型
                    {!isPro && maxTypes === 1 && types.length >= 1 && ' · 升级 Pro 解锁更多'}
                  </span>
                </div>

                {/* 添加按钮 */}
                {types.length < maxTypes && (
                  <button
                    onClick={startCreate}
                    className="w-full py-3 rounded-full border-2 border-dashed border-stone-300 text-muted-foreground font-serif text-sm hover:border-stone-400 hover:text-foreground transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加新标注
                  </button>
                )}
              </>
            )}

            {/* ===== 屏1.5: 创建标注类型 ===== */}
            {view === 'create' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-serif text-foreground">新建标注</h2>
                  <button onClick={() => setView('list')} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 名称输入 */}
                <div className="mb-4">
                  <label className="block text-sm font-serif text-foreground mb-2">名称</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value.slice(0, 10))}
                    placeholder="例如：生理期、旅行..."
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                    autoFocus
                  />
                </div>

                {/* 颜色选择 */}
                <div className="mb-6">
                  <label className="block text-sm font-serif text-foreground mb-3">颜色</label>
                  <div className="flex gap-3 flex-wrap">
                    {PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          editColor === color
                            ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {editColor === color && (
                          <Check className="w-4 h-4 mx-auto text-white drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={confirmCreate}
                  disabled={!editLabel.trim()}
                  className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                >
                  创建
                </button>
              </>
            )}

            {/* ===== 屏1.5b: 编辑标注类型 ===== */}
            {view === 'edit' && selectedType && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-serif text-foreground">编辑标注</h2>
                  <button onClick={() => setView('list')} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-serif text-foreground mb-2">名称</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value.slice(0, 10))}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif"
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-serif text-foreground mb-3">颜色</label>
                  <div className="flex gap-3 flex-wrap">
                    {PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          editColor === color
                            ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {editColor === color && (
                          <Check className="w-4 h-4 mx-auto text-white drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedType)}
                    className="flex-1 py-4 rounded-full border-2 border-red-200 text-red-500 font-serif transition-all hover:bg-red-50 active:scale-[0.98]"
                  >
                    删除此标注
                  </button>
                  <button
                    onClick={confirmEdit}
                    disabled={!editLabel.trim()}
                    className="flex-1 py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                  >
                    保存
                  </button>
                </div>
              </>
            )}

            {/* ===== 屏2: 日期选择 ===== */}
            {view === 'dates' && selectedType && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedType.color }}
                    />
                    <h2 className="text-lg font-serif text-foreground">{selectedType.label}</h2>
                  </div>
                  <button onClick={() => setView('list')} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 月导航 */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setMonthOffset(prev => prev - 1)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="font-serif text-sm text-foreground min-w-[80px] text-center">
                    {viewYear}年{viewMonth + 1}月
                  </span>
                  <button
                    onClick={() => setMonthOffset(prev => prev + 1)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                {/* 月历网格 - 简洁版 */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                  {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] text-muted-foreground font-serif py-1">{d}</div>
                  ))}
                  {calendarDays.map((day, idx) => (
                    <button
                      key={idx}
                      disabled={day === null}
                      onClick={() => day && toggleDate(day)}
                      className={`aspect-square rounded-full flex items-center justify-center text-xs font-serif transition-all relative ${
                        day === null
                          ? 'bg-transparent'
                          : selectedDates.has(
                              `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            )
                            ? 'bg-foreground text-background'
                            : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {day}
                      {/* 选中状态小点预览 */}
                      {day && selectedDates.has(
                        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      ) && (
                        <div
                          className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                          style={{ backgroundColor: selectedType.color }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* 操作提示 */}
                <div className="text-center mb-4">
                  <span className="text-xs text-muted-foreground font-serif">
                    点击日期切换标注 · 已选 {selectedDates.size} 天
                  </span>
                </div>

                {/* 完成按钮 */}
                <button
                  onClick={confirmDates}
                  className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  完成 ({selectedDates.size})
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
