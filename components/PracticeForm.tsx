'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase, type PracticeRecord, type PracticeOption, type Photo } from '@/lib/supabase'
import { PhotoPreviewList, PhotoPreview } from './PhotoUpload/PhotoPreview'
import { toast } from 'sonner'
import { Expand, Camera } from 'lucide-react'

// 将 URL 数组转换为 Photo 数组的辅助函数
function convertUrlsToPhotos(urls: string[]): Photo[] {
  return urls.map((url, index) => ({
    id: `photo-${index}`,
    user_id: '',
    practice_record_id: '',
    oss_url: url,
    oss_key: '',
    file_size: 0,
    mime_type: 'image/jpeg',
    display_order: index,
    uploaded_at: new Date().toISOString(),
  }))
}

// ==================== 类型定义 ====================

export interface PracticeFormData {
  date: string
  type: string
  duration: number // 分钟
  notes: string
  breakthrough?: string
  photos?: string[] // ⭐ 照片URL数组（保存时一起提交）
}

export interface PracticeFormProps {
  // 初始数据
  initialData?: Partial<PracticeFormData>
  recordId?: string // 记录ID（用于照片关联）

  // 照片数据（URL 数组，直接使用不重新加载）
  initialPhotos?: string[]

  // 用户信息（用于照片上传权限判断）
  user?: {
    email?: string | null
    is_pro?: boolean
  } | null

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

function useRecordPhotos(recordId: string | undefined, initialPhotoUrls?: string[]) {
  // 将 URL 转换为 Photo 对象
  const [photos, setPhotos] = useState<Photo[]>(() => {
    if (!initialPhotoUrls || initialPhotoUrls.length === 0) return []
    return convertUrlsToPhotos(initialPhotoUrls)
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingDeletePhotos, setPendingDeletePhotos] = useState<Photo[]>([])  // ← 标记待删除的照片

  // 当 initialPhotoUrls 变化时（切换记录），立即更新照片
  useEffect(() => {
    if (initialPhotoUrls !== undefined) {
      setPhotos(convertUrlsToPhotos(initialPhotoUrls))
    }
  }, [initialPhotoUrls])

  // 从数据库查询真实照片状态（解决前后端不一致问题）
  useEffect(() => {
    if (!recordId) return

    const fetchPhotosFromDB = async () => {
      setLoading(true)
      try {
        const { getRecordPhotos } = await import('@/lib/oss')
        const result = await getRecordPhotos(recordId)
        if (result.success && result.photos) {
          console.log('[useRecordPhotos] 数据库照片:', result.photos.length)
          setPhotos(result.photos)
        }
      } catch (error) {
        console.error('[useRecordPhotos] 查询照片失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotosFromDB()
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
          'NOT_AUTHENTICATED': '请先登录',
          'EMAIL_REQUIRED': '绑定邮箱后可使用照片功能',
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

  // 删除照片 - 改为本地标记，保存时批量删除
  const deletePhoto = useCallback((photoId: string) => {
    console.log('[删除照片] 标记待删除:', photoId)
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return false

    // 标记待删除并立即从 UI 移除
    setPendingDeletePhotos(prev => [...prev, photo])
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    toast.success('照片已删除，保存时生效')
    return true
  }, [photos])

  // 执行待删除照片的批量删除（在保存时调用）
  const executePendingDeletions = useCallback(async () => {
    if (pendingDeletePhotos.length === 0) return true

    console.log('[删除照片] 批量删除待删除照片:', pendingDeletePhotos.length)
    const { deletePhoto: doDelete } = await import('@/lib/oss')

    try {
      await Promise.all(
        pendingDeletePhotos.map(p => doDelete(p.id, recordId, p.oss_url))
      )
      setPendingDeletePhotos([])
      return true
    } catch (error) {
      console.error('[删除照片] 批量删除失败:', error)
      return false
    }
  }, [pendingDeletePhotos, recordId])

  return { photos, loading, uploading, uploadPhoto, deletePhoto, pendingDeletePhotos, executePendingDeletions }
}

// ==================== 主组件 ====================

export function PracticeForm({
  initialData,
  recordId,
  initialPhotos,
  user, // ⭐ 新增：用户信息
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

  // 测试用：占位符显示状态
  const [testPlaceholders, setTestPlaceholders] = useState<{id: string; name: string}[]>([])
  // 读取文件中的 loading 状态
  const [isReadingFiles, setIsReadingFiles] = useState(false)
  const [breakthroughEnabled, setBreakthroughEnabled] = useState(!!initialData?.breakthrough)
  const [breakthroughText, setBreakthroughText] = useState(initialData?.breakthrough || "")

  // 删除确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 照片管理
  const { photos, loading, uploading, uploadPhoto, deletePhoto, executePendingDeletions } = useRecordPhotos(recordId, initialPhotos)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ⭐ 照片上传权限和限制
  const hasEmail = !!user?.email
  const isPro = user?.is_pro ?? false
  const maxPhotos = isPro ? 9 : 1
  const canUploadPhotos = hasEmail && showPhotoUpload

  // 用于标记是否已初始化
  const hasInitialized = useRef(false)
  const prevInitialDataRef = useRef(initialData)

  // 同步初始数据变化
  useEffect(() => {
    // 检测是否是新的记录（通过比较 notes 或其他唯一标识）
    const isNewRecord = prevInitialDataRef.current?.notes !== initialData?.notes
      || prevInitialDataRef.current?.date !== initialData?.date
      || prevInitialDataRef.current?.type !== initialData?.type

    if (initialData && (!hasInitialized.current || isNewRecord)) {
      hasInitialized.current = true
      prevInitialDataRef.current = initialData
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

  // 处理文件选择 - 支持多选
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    console.log('[照片上传] 选择文件:', files?.length || 0, '个')
    if (!files || files.length === 0) return

    // 显示文件详情（调试用）
    Array.from(files).forEach((file, i) => {
      console.log(`[照片上传] 文件 ${i + 1}:`, file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`)
    })

    // 检查是否有邮箱
    if (!hasEmail) {
      toast.error('绑定邮箱后可使用照片功能')
      return
    }

    // 计算剩余可上传数量
    const remainingSlots = maxPhotos - photos.length
    if (remainingSlots <= 0) {
      toast.info('当前版本只能上传1张照片')
      return
    }

    // 只取剩余槽位的文件数
    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      toast.info(`已选择 ${files.length} 张，仅上传前 ${remainingSlots} 张`)
    }

    // 并发上传所有选中的文件
    await Promise.all(filesToUpload.map(file => uploadPhoto(file)))

    // 上传完成后清除占位符
    setTestPlaceholders([])

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 保存
  const handleSave = async () => {
    // 1. 先执行待删除照片的批量删除
    await executePendingDeletions()

    // 2. 保存记录
    onSave({
      date,
      type,
      duration,
      notes,
      breakthrough: breakthroughEnabled ? breakthroughText : undefined,
      photos: photos.map(p => p.oss_url), // ⭐ 保存时包含照片
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
            {/* 测试按钮已删除 */}
            {showPhotoUpload && recordId && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/*"
                  multiple={isPro} // ⭐ 会员可多选，普通用户单选
                  // iOS 兼容性优化
                  {...{ webkitdirectory: undefined, directory: undefined }}
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) {
                      setIsReadingFiles(false)
                      return
                    }

                    // 检查是否有邮箱
                    if (!hasEmail) {
                      toast.error('绑定邮箱后可使用照片功能')
                      setIsReadingFiles(false)
                      return
                    }

                    // 立即创建占位图显示
                    Array.from(files).slice(0, maxPhotos - photos.length).forEach((file, index) => {
                      setTestPlaceholders(prev => [...prev, {
                        id: `upload-${Date.now()}-${index}`,
                        name: file.name || '上传中...'
                      }])
                    })

                    // 调用实际的上传逻辑
                    handleFileSelect(e)
                    setIsReadingFiles(false)
                  }}
                  className="hidden"
                />
                {/* 照片上传按钮 - 绿色渐变 */}
                <button
                  onClick={() => {
                    // 检查是否有邮箱
                    if (!hasEmail) {
                      toast.info('绑定邮箱后可使用照片功能')
                      return
                    }
                    if (photos.length >= maxPhotos) {
                      toast.info('当前版本只能上传1张照片')
                      return
                    }
                    // 显示读取中状态
                    setIsReadingFiles(true)
                    // 稍微延迟打开文件选择器，让loading状态先显示
                    setTimeout(() => {
                      fileInputRef.current?.click()
                    }, 50)
                  }}
                  disabled={!recordId || uploading || isReadingFiles}
                  className="w-10 h-10 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title={hasEmail ? '上传照片（当前版本限1张）' : '绑定邮箱后可使用照片功能'}
                >
                  {isReadingFiles ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
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

      {/* 照片展示 + 上传中占位符 */}
      {(showPhotoUpload && recordId && photos.length > 0) || testPlaceholders.length > 0 ? (
        <>
          {/* 3张及以下：九宫格布局 */}
          {(photos.length + testPlaceholders.length) <= 3 ? (
            <div className="grid grid-cols-3 gap-1">
              {/* 已上传的照片 */}
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <PhotoPreview
                    photo={photo}
                    onDelete={deletePhoto}
                    aspectRatio="1/1"
                  />
                </div>
              ))}
              {/* 上传中占位符 */}
              {testPlaceholders.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-lg border border-dashed border-gray-200/50 flex flex-col items-center justify-center p-2"
                >
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin mb-2" />
                  <span className="text-gray-400 text-xs text-center truncate w-full">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            /* 3张以上：横向滑动布局 */
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* 已上传的照片 */}
              {photos.map((photo) => (
                <div key={photo.id} className="relative w-24 h-24 flex-shrink-0 snap-start">
                  <PhotoPreview
                    photo={photo}
                    onDelete={deletePhoto}
                    aspectRatio="1/1"
                  />
                </div>
              ))}
              {/* 上传中占位符 */}
              {testPlaceholders.map((item) => (
                <div
                  key={item.id}
                  className="w-24 h-24 flex-shrink-0 snap-start rounded-lg border border-dashed border-gray-200/50 flex flex-col items-center justify-center p-2"
                >
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin mb-2" />
                  <span className="text-gray-400 text-xs text-center truncate w-full">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* 原来的 PhotoPreviewList 移除，改用上面的统一 grid */}

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
