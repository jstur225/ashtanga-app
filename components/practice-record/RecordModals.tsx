"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { toast } from "sonner"
import { PracticeForm, type PracticeFormData } from "@/components/PracticeForm"
import { DatePickerModal, TypeSelectorModal } from "@/components/practice-record/RecordPickers"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"
import { getEffectiveOptionColor } from "@/lib/sync-utils"
import { getLocalDateStr } from "@/lib/stats-utils"

export function EditRecordModal({
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
  onShowMembershipPrompt,
  user,
  userProfile,
  isPro,
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
  isPro?: boolean
  onShowMembershipPrompt?: () => void
}) {
  const latestRecord = useMemo(() => {
    if (!record) return null
    return practiceHistory.find((item) => item.id === record.id) || record
  }, [record, practiceHistory])

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const getTypeColorLevel = useCallback((type: string) => (
    getEffectiveOptionColor(practiceOptions, type, !!isPro)
  ), [practiceOptions, isPro])

  const [formData, setFormData] = useState({
    date: "",
    type: "",
    duration: 60,
    notes: "",
    breakthrough: undefined as string | undefined,
    color_level: 3,
  })

  useEffect(() => {
    if (latestRecord) {
      setFormData({
        date: latestRecord.date,
        type: latestRecord.type,
        duration: Math.floor(latestRecord.duration / 60),
        notes: latestRecord.notes || "",
        breakthrough: latestRecord.breakthrough ?? undefined,
        color_level: latestRecord.color_level ?? getTypeColorLevel(latestRecord.type),
      })
    }
  }, [latestRecord, getTypeColorLevel])

  const handleSave = (data: PracticeFormData) => {
    if (!latestRecord) return

    onSave(latestRecord.id, {
      date: data.date,
      type: data.type,
      duration: data.duration * 60,
      notes: data.notes,
      breakthrough: data.breakthrough,
      photos: data.photos,
      color_level: data.color_level,
    })
    toast.success("更新成功")
    onClose()
  }

  const handleDelete = () => {
    if (!latestRecord) return
    onDelete(latestRecord.id)
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
              <button type="button" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PracticeForm
              initialData={formData}
              recordId={latestRecord.id}
              user={{ email: user?.email }}
              date={formData.date}
              type={formData.type}
              onDateChange={(date) => setFormData((prev) => ({ ...prev, date }))}
              onTypeChange={(type) => setFormData((prev) => ({ ...prev, type, color_level: getTypeColorLevel(type) }))}
              dateEditable
              typeEditable
              durationEditable
              showDelete
              showPhotoUpload
              practiceOptions={practiceOptions}
              onSave={handleSave}
              onDelete={handleDelete}
              onDatePickerOpen={() => handleDatePickerToggle(true)}
              onTypeSelectorOpen={() => handleTypeSelectorToggle(true)}
              onChildModalOpen={onChildModalOpen}
              initialPhotos={latestRecord.photos || []}
              onShowMembershipPrompt={onShowMembershipPrompt}
            />
          </motion.div>

          <DatePickerModal
            isOpen={showDatePicker}
            onClose={(selectedDate) => {
              if (selectedDate) {
                setFormData((prev) => ({ ...prev, date: selectedDate }))
              }
              handleDatePickerToggle(false)
            }}
            maxDate={getLocalDateStr()}
            practiceHistory={practiceHistory}
          />

          <TypeSelectorModal
            isOpen={showTypeSelector}
            onClose={(selectedType) => {
              if (selectedType) {
                setFormData((prev) => ({ ...prev, type: selectedType, color_level: getTypeColorLevel(selectedType) }))
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

export function AddPracticeModal({
  isOpen,
  onClose,
  onSave,
  addRecord,
  updateRecord,
  deleteRecord,
  onDeleteDraft,
  practiceOptions,
  practiceHistory = [],
  onChildModalOpen,
  onOpenVoiceFakeDoor,
  onOpenPhotoFakeDoor,
  onShowMembershipPrompt,
  user,
  userProfile,
  isPro,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (record: Omit<PracticeRecord, "id" | "created_at" | "updated_at" | "photos">) => void
  addRecord: (record: Omit<PracticeRecord, "id" | "created_at" | "updated_at" | "photos">) => PracticeRecord
  updateRecord: (id: string, data: Partial<PracticeRecord>) => void
  deleteRecord: (id: string) => void
  onDeleteDraft?: (id: string) => void
  practiceOptions: PracticeOption[]
  practiceHistory?: PracticeRecord[]
  onChildModalOpen?: (open: boolean) => void
  onOpenVoiceFakeDoor?: () => void
  onOpenPhotoFakeDoor?: () => void
  user?: { email?: string | null } | null
  userProfile?: UserProfile | null
  isPro?: boolean
  onShowMembershipPrompt?: () => void
}) {
  const getTypeColorLevel = useCallback((type: string) => (
    getEffectiveOptionColor(practiceOptions, type, !!isPro)
  ), [practiceOptions, isPro])

  const [formData, setFormData] = useState({
    date: getLocalDateStr(),
    type: "",
    duration: 60,
    notes: "",
    breakthrough: undefined as string | undefined,
    color_level: 3,
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [draftRecord, setDraftRecord] = useState<PracticeRecord | null>(null)

  useEffect(() => {
    if (isOpen) {
      const draft = addRecord({
        date: getLocalDateStr(),
        type: "草稿",
        duration: 60,
        notes: "",
      })
      setDraftRecord(draft)
    } else if (draftRecord) {
      onDeleteDraft?.(draftRecord.id)
      setDraftRecord(null)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (draftRecord) {
        onDeleteDraft?.(draftRecord.id)
      }
    }
  }, [])

  const handleSave = (data: PracticeFormData) => {
    if (draftRecord) {
      updateRecord(draftRecord.id, {
        date: data.date,
        type: data.type,
        duration: data.duration * 60,
        notes: data.notes || "今日练习完成",
        breakthrough: data.breakthrough,
        photos: data.photos,
        color_level: data.color_level,
      })
      toast.success("补卡成功！")
    }

    setFormData({
      date: getLocalDateStr(),
      type: "",
      duration: 60,
      notes: "",
      breakthrough: undefined,
      color_level: 3,
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
              <button type="button" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PracticeForm
              initialData={formData}
              recordId={draftRecord?.id}
              user={{ email: user?.email }}
              date={formData.date}
              type={formData.type}
              onDateChange={(date) => setFormData((prev) => ({ ...prev, date }))}
              onTypeChange={(type) => setFormData((prev) => ({ ...prev, type, color_level: getTypeColorLevel(type) }))}
              dateEditable
              typeEditable
              durationEditable
              showDelete={false}
              showPhotoUpload
              practiceOptions={practiceOptions}
              onSave={handleSave}
              onDatePickerOpen={() => handleDatePickerToggle(true)}
              onTypeSelectorOpen={() => handleTypeSelectorToggle(true)}
              onChildModalOpen={onChildModalOpen}
              onShowMembershipPrompt={onShowMembershipPrompt}
            />
          </motion.div>

          <DatePickerModal
            isOpen={showDatePicker}
            onClose={(selectedDate) => {
              if (selectedDate) {
                setFormData((prev) => ({ ...prev, date: selectedDate }))
              }
              handleDatePickerToggle(false)
            }}
            maxDate={getLocalDateStr()}
            practiceHistory={practiceHistory}
          />

          <TypeSelectorModal
            isOpen={showTypeSelector}
            onClose={(selectedType) => {
              if (selectedType) {
                setFormData((prev) => ({ ...prev, type: selectedType, color_level: getTypeColorLevel(selectedType) }))
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
