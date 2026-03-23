'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase, type PracticeRecord, type PracticeOption, type Photo } from '@/lib/supabase'
import { PhotoPreviewList } from './PhotoUpload/PhotoPreview'
import { toast } from 'sonner'
import { Expand, Camera } from 'lucide-react'

// ==================== 类型定义 ====================

export interface PracticeFormData {
  date: string
  type: string
  duration: number // 分钟
  notes: string
  breakthrough?: string
}

export interface PracticeFormProps {
  // 初始数据
  initialData?: Partial<PracticeFormData>
  recordId?: string // 记录ID（用于照片关联）

  // 受控模式：外部控制 date 和 type
  date?: string
  type?: string
  onDateChange?: (date: string) => void
  onTypeChange?: (type: string) => void

  // 字段配置
  dateEditable?: boolean
  typeEditable?: boolean
  durationEditable?: boolean

  // 功能开关
  showDelete?: boolean
  showPhotoUpload?: boolean // 是否显示照片上传

  // 数据源
  practiceOptions: PracticeOption[]

  // 回调
  onSave: (data: PracticeFormData) => void
  onDelete?: () => void
  onDatePickerOpen?: () => void
  onTypeSelectorOpen?: () => void

  // 子模态框状态控制
  onChildModalOpen?: (open: boolean) => void

  // 照片预判（用于加载占位符）
  hasPhotos?: boolean
}

// ==================== 工具函数 ====================

function getLocalDateStr(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "选择日期"
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// ==================== 照片上传 Hook ====================

function useRecordPhotos(recordId: string | undefined) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 加载照片
  const loadPhotos = useCallback(async () => {
    if (!recordId) {
      setPhotos([])
      return
    }

    setLoading(true)
    try {
      const { getRecordPhotos } = await import('@/lib/oss')
      const result = await getRecordPhotos(recordId)
      if (result.success) {
        setPhotos(result.photos || [])
      } else {
        setPhotos([])
      }
    } catch (error) {
      console.error('[PracticeForm] 加载照片失败:', error)
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }, [recordId])

  // 上传照片
  const uploadPhoto = useCallback(async (file: File) => {
    if (!recordId) {
      toast.error('请先保存记录')
      return false
    }

    setUploading(true)
    try {
      const { uploadPhoto: doUpload } = await import('@/lib/oss')
      const result = await doUpload(file, recordId)

      if (result.success && result.photo) {
        setPhotos(prev => [...prev, result.photo!])
        toast.success('记录了你的练习瞬间 ✓')
        return true
      } else {
        const errorMessages: Record<string, string> = {
          'RECORD_PHOTO_LIMIT_EXCEEDED': '当前版本只能上传1张照片',
          'UPLOAD_FAILED_403': '上传失败，请重试',
          'UPLOAD_FAILED_400': '上传失败，请检查文件',
          'NETWORK_ERROR': '网络错误，请重试',
          'NOT_AUTHENTICATED': '上传照片需绑定邮箱',
        }
        toast.error(errorMessages[result.error || ''] || '上传失败，请重试')
        return false
      }
    } catch (error) {
      toast.error('上传出错，请重试')
      return false
    } finally {
      setUploading(false)
    }
  }, [recordId])

  // 删除照片
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      const { deletePhoto: doDelete } = await import('@/lib/oss')
      const result = await doDelete(photoId)

      if (result.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId))
        toast.success('照片已删除 ✓')
        return true
      } else {
        toast.error('删除失败，请重试')
        return false
      }
    } catch (error) {
      toast.error('删除出错，请重试')
      return false
    }
  }, [])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  return { photos, loading, uploading, uploadPhoto, deletePhoto, refresh: loadPhotos }
}

// ==================== 主组件 ====================

export function PracticeForm({
  initialData,
  recordId,
  // 受控 props
  date: controlledDate,
  type: controlledType,
  onDateChange,
  onTypeChange,
  // 其他 props
  dateEditable = true,
  typeEditable = true,
  durationEditable = true,
  showDelete = false,
  showPhotoUpload = true,
  practiceOptions,
  onSave,
  onDelete,
  onDatePickerOpen,
  onTypeSelectorOpen,
  onChildModalOpen,
  hasPhotos: hasPhotosProp,
}: PracticeFormProps) {
  // 表单状态（优先使用受控值）
  const [internalDate, setInternalDate] = useState(initialData?.date || getLocalDateStr())
  const [internalType, setInternalType] = useState(initialData?.type || "")
  const date = controlledDate ?? internalDate
  const type = controlledType ?? internalType

  const setDate = (value: string) => {
    setInternalDate(value)
    onDateChange?.(value)
  }

  const setType = (value: string) => {
    setInternalType(value)
    onTypeChange?.(value)
  }
  const [duration, setDuration] = useState(initialData?.duration || 60)
  const [notes, setNotes] = useState(initialData?.notes || "")
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(!!initialData?.breakthrough)
  const [breakthroughText, setBreakthroughText] = useState(initialData?.breakthrough || "")

  // 删除确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 照片管理
  const { photos, loading, uploading, uploadPhoto, deletePhoto } = useRecordPhotos(recordId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 用于标记是否已初始化
  const hasInitialized = useRef(false)

  // 同步初始数据变化
  useEffect(() => {
    if (initialData && !hasInitialized.current) {
      hasInitialized.current = true
      if (initialData.date) setDate(initialData.date)
      if (initialData.type) setType(initialData.type)
      if (initialData.duration !== undefined) setDuration(initialData.duration)
      if (initialData.notes !== undefined) setNotes(initialData.notes)
      if (initialData.breakthrough) {
        setBreakthroughEnabled(true)
        setBreakthroughText(initialData.breakthrough)
      }
    }
  }, [initialData])

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    await uploadPhoto(file)

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 保存
  const handleSave = () => {
    onSave({
      date,
      type,
      duration,
      notes,
      breakthrough: breakthroughEnabled ? breakthroughText : undefined,
    })
  }

  // 删除
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
    onChildModalOpen?.(true)
  }

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false)
    onChildModalOpen?.(false)
    onDelete?.()
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    onChildModalOpen?.(false)
  }

  // 过滤掉特殊选项（custom 和 guided_audio）
  const typeOptions = practiceOptions.filter(o =>
    o.id !== 'custom' && o.id !== 'guided_audio'
  )

  return (
    <div className="space-y-5">
      {/* 日期 & 类型 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 日期 */}
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5">
            日期
          </label>
          {dateEditable ? (
            <button
              onClick={onDatePickerOpen}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif text-left transition-all hover:bg-secondary/80 active:scale-[0.98] text-sm"
            >
              {formatDateDisplay(date)}
            </button>
          ) : (
            <div className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 text-foreground font-serif text-sm">
              {formatDateDisplay(date)}
            </div>
          )}
        </div>

        {/* 类型 */}
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5">
            练习类型
          </label>
          {typeEditable ? (
            <button
              onClick={onTypeSelectorOpen}
              className={cn(
                "w-full px-3 py-2.5 rounded-xl font-serif text-left transition-all active:scale-[0.98] text-sm",
                type
                  ? "green-gradient-light text-primary border border-primary/20"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {type ? type.split(" ")[0] : "选择类型"}
            </button>
          ) : (
            <div className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 text-foreground font-serif text-sm">
              {type || "未选择"}
            </div>
          )}
        </div>
      </div>

      {/* 时长 & 突破 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 时长 */}
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5">
            练习时长 (分钟)
          </label>
          {durationEditable ? (
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground font-serif text-center focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          ) : (
            <div className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 text-foreground font-serif text-center text-sm">
              {duration} 分钟
            </div>
          )}
        </div>

        {/* 突破 */}
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5 opacity-0">
            突破时刻
          </label>
          <button
            onClick={() => setBreakthroughEnabled(!breakthroughEnabled)}
            className={cn(
              "w-full flex items-center justify-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all",
              breakthroughEnabled
                ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm"
                : "bg-secondary border-transparent text-muted-foreground"
            )}
          >
            <Sparkles className={cn(
              "w-3.5 h-3.5",
              breakthroughEnabled ? "text-orange-500" : "text-muted-foreground"
            )} />
            <span className="text-sm font-serif">解锁/突破</span>
          </button>
        </div>
      </div>

      {/* 突破输入 */}
      <AnimatePresence>
        {breakthroughEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <label className="block text-xs font-serif text-muted-foreground mb-1.5">
                突破内容
              </label>
              <input
                type="text"
                value={breakthroughText}
                onChange={(e) => setBreakthroughText(e.target.value)}
                placeholder="记录今天的里程碑..."
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-br from-orange-50/80 to-orange-50/40 text-foreground placeholder:text-orange-300/70 font-serif focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-300 border border-orange-200/60 transition-all duration-200 text-sm shadow-sm shadow-orange-100/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 觉察/笔记 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-serif text-muted-foreground">
            觉察/笔记
          </label>
          <span className="text-xs text-muted-foreground/60">
            {notes.length}/2000
          </span>
        </div>
        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
            placeholder="今天练习感受如何？有什么觉察？"
            rows={5}
            className="w-full px-4 py-3 pr-20 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-serif text-sm"
          />
          {/* 照片上传按钮 - 位于输入框右下方 */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {showPhotoUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* 照片上传按钮 - 绿色渐变 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!recordId || uploading || photos.length >= 1}
                  className="w-10 h-10 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="上传照片"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            {/* 扩张/展开按钮 - 绿色渐变 */}
            <button
              onClick={() => toast.info('全屏编辑功能开发中，期待上线')}
              className="w-10 h-10 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="展开更多"
            >
              <Expand className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 照片展示 - 只有预判有照片或实际有照片时才显示 */}
      {showPhotoUpload && recordId && (hasPhotosProp || photos.length > 0) && (
        <div>
          <PhotoPreviewList
            photos={photos}
            onDelete={deletePhoto}
            layout="grid"
            isLoading={hasPhotosProp && photos.length === 0}
          />
        </div>
      )}

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98]"
      >
        保存练习
      </button>

      {/* 删除按钮 */}
      {showDelete && (
        <button
          onClick={handleDeleteClick}
          className="w-full py-3 rounded-full bg-red-50 text-red-600 font-serif transition-all hover:bg-red-100 active:scale-[0.98] text-sm"
        >
          删除记录
        </button>
      )}

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[80]"
              onClick={handleCancelDelete}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-card rounded-2xl p-5 z-[90] shadow-xl"
            >
              <h3 className="text-base font-serif text-foreground text-center mb-2">
                确认删除？
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                删除后将无法恢复
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-serif text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-serif text-sm"
                >
                  删除
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PracticeForm
