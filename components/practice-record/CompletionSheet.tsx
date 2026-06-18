"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { PracticeForm, type PracticeFormData } from "@/components/PracticeForm"
import { DatePickerModal, TypeSelectorModal } from "@/components/practice-record/RecordPickers"
import type { PracticeOption, PracticeRecord } from "@/hooks/usePracticeData"
import { getEffectiveOptionColor } from "@/lib/sync-utils"
import { getLocalDateStr } from "@/lib/stats-utils"

interface CompletionSheetProps {
  isOpen: boolean
  practiceType: string
  duration: string
  startTime?: string
  onFinalizeRecord: (record: PracticeRecord) => void
  onClose?: () => void
  addRecord: (record: Omit<PracticeRecord, "id" | "created_at" | "updated_at" | "photos">) => PracticeRecord
  updateRecord: (id: string, data: Partial<PracticeRecord>) => void
  onDeleteDraft?: (id: string) => void
  autoSync?: (triggerReason?: string) => Promise<void | boolean>
  onShowMembershipPrompt?: () => void
  user?: { email?: string | null } | null
  practiceOptions: PracticeOption[]
  isPro?: boolean
}

export function CompletionSheet({
  isOpen,
  practiceType,
  duration,
  startTime,
  onFinalizeRecord,
  onClose,
  addRecord,
  updateRecord,
  autoSync,
  onShowMembershipPrompt,
  user,
  practiceOptions,
  onDeleteDraft,
  isPro,
}: CompletionSheetProps) {
  const getTypeColorLevel = useCallback((type: string) => (
    getEffectiveOptionColor(practiceOptions, type, !!isPro)
  ), [practiceOptions, isPro])

  const [formData, setFormData] = useState({
    date: getLocalDateStr(),
    type: practiceType,
    duration: parseInt(duration) || 0,
    notes: "",
    breakthrough: undefined as string | undefined,
    color_level: 3,
  })
  const [draftRecord, setDraftRecord] = useState<PracticeRecord | null>(null)
  const draftRecordRef = useRef<PracticeRecord | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const draftColorLevel = getTypeColorLevel(practiceType)
      const draft = addRecord({
        date: getLocalDateStr(),
        type: practiceType,
        duration: parseInt(duration) * 60 || 0,
        notes: "",
        color_level: draftColorLevel,
      })
      setDraftRecord(draft)
      draftRecordRef.current = draft
      setFormData({
        date: getLocalDateStr(),
        type: practiceType,
        duration: parseInt(duration) || 0,
        notes: "",
        breakthrough: undefined,
        color_level: draftColorLevel,
      })

      if (user?.email && autoSync) {
        if (process.env.NODE_ENV === "development") {
          console.log("[CompletionSheet] 草稿创建完成，准备同步")
        }
        setTimeout(() => {
          autoSync("完成弹窗草稿创建后同步")
        }, 500)
      }
    } else if (draftRecord) {
      onDeleteDraft?.(draftRecord.id)
      setDraftRecord(null)
      draftRecordRef.current = null
    }
  }, [isOpen, practiceType, duration])

  useEffect(() => {
    return () => {
      if (draftRecordRef.current) {
        onDeleteDraft?.(draftRecordRef.current.id)
      }
    }
  }, [])

  const handleSave = (data: PracticeFormData) => {
    if (draftRecord) {
      const completedRecord: PracticeRecord = {
        ...draftRecord,
        date: data.date,
        type: data.type,
        duration: data.duration * 60,
        notes: data.notes || "今日练习完成",
        breakthrough: data.breakthrough,
        photos: data.photos ?? [],
        color_level: data.color_level,
        start_time: startTime,
        updated_at: new Date().toISOString(),
      }
      updateRecord(draftRecord.id, completedRecord)
      toast.success("记录已保存！")

      if (user?.email && autoSync) {
        setTimeout(() => {
          autoSync("完成弹窗保存记录后同步")
        }, 500)
      }

      onFinalizeRecord(completedRecord)
      onClose?.()
    }

    setFormData({
      date: getLocalDateStr(),
      type: practiceType,
      duration: parseInt(duration) || 0,
      notes: "",
      breakthrough: undefined,
      color_level: getTypeColorLevel(practiceType),
    })
    setDraftRecord(null)
    draftRecordRef.current = null
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
              user={{ email: user?.email }}
              date={formData.date}
              type={formData.type}
              onDateChange={(date) => setFormData((prev) => ({ ...prev, date }))}
              onTypeChange={(type) => setFormData((prev) => ({ ...prev, type, color_level: getTypeColorLevel(type) }))}
              onDatePickerOpen={() => setShowDatePicker(true)}
              onTypeSelectorOpen={() => setShowTypeSelector(true)}
              dateEditable
              typeEditable
              durationEditable
              showDelete={false}
              showPhotoUpload
              practiceOptions={practiceOptions}
              onSave={handleSave}
              onShowMembershipPrompt={onShowMembershipPrompt}
            />

            <DatePickerModal
              isOpen={showDatePicker}
              onClose={(selectedDate) => {
                if (selectedDate) {
                  setFormData((prev) => ({ ...prev, date: selectedDate }))
                }
                setShowDatePicker(false)
              }}
              maxDate={getLocalDateStr()}
              practiceHistory={[]}
            />

            <TypeSelectorModal
              isOpen={showTypeSelector}
              onClose={(selectedType) => {
                if (selectedType) {
                  setFormData((prev) => ({ ...prev, type: selectedType, color_level: getTypeColorLevel(selectedType) }))
                }
                setShowTypeSelector(false)
              }}
              practiceOptions={practiceOptions}
              selectedType={formData.type}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
