"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Lock, Trash2, X } from "lucide-react"
import type { PracticeOption } from "@/hooks/usePracticeData"
import { getColorClass } from "@/lib/sync-utils"

type Membership = { is_active: boolean } | null | undefined

function ColorLevelPicker({
  value,
  membership,
  onChange,
  onLocked,
}: {
  value: number
  membership: Membership
  onChange: (level: number) => void
  onLocked?: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-serif text-foreground mb-2">
        日历颜色 <span className="text-muted-foreground text-xs">（练习日显示的深浅）</span>
      </label>
      <div className="flex gap-3 justify-center">
        {[1, 2, 3, 4].map((level) => {
          const locked = !membership?.is_active && (level === 1 || level === 4)
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              aria-label={`色阶 ${level}${locked ? '（Pro）' : ''}`}
              onClick={() => locked ? onLocked?.() : onChange(level)}
              className={`w-10 h-10 rounded-full transition-all relative ${selected ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-card scale-110' : ''} ${locked ? 'opacity-40' : ''}`}
            >
              <div className={`w-full h-full rounded-full ${getColorClass(level)} border border-white/20`} />
              {locked && <Lock className="w-3 h-3 absolute inset-0 m-auto text-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CustomPracticeModal({
  isOpen,
  onClose,
  onConfirm,
  isFull,
  maxSlots,
  membership,
  onShowMembershipPrompt,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, notes: string, colorLevel?: number) => void
  isFull: boolean
  maxSlots: number
  membership?: Membership
  onShowMembershipPrompt: () => void
}) {
  const [practiceName, setPracticeName] = useState("")
  const [notes, setNotes] = useState("")
  const [colorLevel, setColorLevel] = useState(3)

  const handleConfirm = () => {
    if (!practiceName.trim()) return
    onConfirm(practiceName.slice(0, 10), notes.slice(0, 14), colorLevel)
    setPracticeName("")
    setNotes("")
    setColorLevel(3)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[100]" onClick={onClose}
            data-testid="custom-practice-backdrop"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            role="dialog" aria-modal="true" aria-labelledby="custom-practice-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="custom-practice-title" className="text-lg font-serif text-foreground">自定义练习</h2>
              <button type="button" aria-label="关闭自定义练习" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {isFull ? (
              <div className="text-center py-8">
                <p className="text-foreground font-serif mb-2">选项已满（Pro会员最多{maxSlots}个）</p>
                <p className="text-muted-foreground text-sm font-serif">请双击删除旧选项后再添加</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="custom-practice-name" className="block text-sm font-serif text-foreground mb-2">练习名称 <span className="text-muted-foreground text-xs">（最多10字）</span></label>
                  <input id="custom-practice-name" type="text" value={practiceName} onChange={(event) => setPracticeName(event.target.value.slice(0, 10))} placeholder="例如：三序列、恢复性..." className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif" />
                  <div className="text-right text-xs text-muted-foreground mt-1">{practiceName.length}/10</div>
                </div>
                <div>
                  <label htmlFor="custom-practice-notes" className="block text-sm font-serif text-foreground mb-2">备注 <span className="text-muted-foreground text-xs">（最多14字）</span></label>
                  <input id="custom-practice-notes" type="text" value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 14))} placeholder="简短描述..." className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif" />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/14</div>
                </div>
                <ColorLevelPicker value={colorLevel} membership={membership} onChange={setColorLevel} onLocked={onShowMembershipPrompt} />
                <button type="button" onClick={handleConfirm} disabled={!practiceName.trim()} className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] backdrop-blur-sm">添加选项</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function EditOptionModal({
  isOpen,
  onClose,
  option,
  onSave,
  onDelete,
  canDelete,
  membership,
  onShowMembershipPrompt,
}: {
  isOpen: boolean
  onClose: () => void
  option: PracticeOption | null
  onSave: (id: string, name: string, notes: string, colorLevel?: number) => void
  onDelete: (id: string) => void
  canDelete: boolean
  membership?: Membership
  onShowMembershipPrompt?: () => void
}) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [colorLevel, setColorLevel] = useState(3)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!option) return
    setName(option.label)
    setNotes(option.notes || "")
    const rawColor = option.color_level ?? 3
    setColorLevel(!membership?.is_active && (rawColor === 1 || rawColor === 4) ? 3 : rawColor)
    setShowDeleteConfirm(false)
  }, [option, membership?.is_active])

  const handleSave = () => {
    if (!option || !name.trim()) return
    onSave(option.id, name.slice(0, 10), notes.slice(0, 14), colorLevel)
    onClose()
  }

  const handleConfirmDelete = () => {
    if (!option) return
    onDelete(option.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && option && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-40" onClick={onClose} data-testid="edit-option-backdrop" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            role="dialog" aria-modal="true" aria-labelledby="edit-option-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="edit-option-title" className="text-lg font-serif text-foreground">编辑选项</h2>
              <button type="button" aria-label="关闭编辑选项" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-4">
                <p className="text-center font-serif text-foreground">确定要删除&quot;{name}&quot;吗？</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]">取消</button>
                  <button type="button" onClick={handleConfirmDelete} className="flex-1 py-3 rounded-full font-serif transition-all active:scale-[0.98] bg-red-500 text-white shadow-md hover:bg-red-600">删除</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-option-name" className="block text-sm font-serif text-foreground mb-2">名称 <span className="text-muted-foreground text-xs">（最多10字）</span></label>
                  <input id="edit-option-name" type="text" value={name} onChange={(event) => setName(event.target.value.slice(0, 10))} className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif" />
                  <div className="text-right text-xs text-muted-foreground mt-1">{name.length}/10</div>
                </div>
                <div>
                  <label htmlFor="edit-option-notes" className="block text-sm font-serif text-foreground mb-2">备注 <span className="text-muted-foreground text-xs">（最多14字）</span></label>
                  <input id="edit-option-notes" type="text" value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 14))} placeholder="简短描述..." className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif" />
                  <div className="text-right text-xs text-muted-foreground mt-1">{notes.length}/14</div>
                </div>
                <ColorLevelPicker value={colorLevel} membership={membership} onChange={setColorLevel} onLocked={onShowMembershipPrompt} />
                <button type="button" onClick={handleSave} disabled={!name.trim()} className="w-full py-4 rounded-full green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]">保存</button>
                {canDelete && <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-full bg-transparent text-destructive font-serif transition-all hover:bg-destructive/10 active:scale-[0.98] flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" />删除选项</button>}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
