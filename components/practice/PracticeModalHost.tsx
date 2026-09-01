"use client"

import type { ComponentProps } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, ChevronUp, Crown, Lock, X } from "lucide-react"
import { CustomPracticeModal, EditOptionModal } from "@/components/practice/OptionModals"
import { GuidedAudioVersionSheet } from "@/components/practice/GuidedAudioVersionSheet"
import { AccountSyncModal } from "@/components/AccountSyncModal"
import { CompletionSheet } from "@/components/practice-record/CompletionSheet"

const AnnotationManagerModal = dynamic(() => import("@/components/CalendarAnnotation/AnnotationManagerModal").then((module) => ({ default: module.AnnotationManagerModal })), { ssr: false })
const FakeDoorModal = dynamic(() => import("@/components/FakeDoorModal").then((module) => ({ default: module.FakeDoorModal })), { ssr: false })
const ImportModal = dynamic(() => import("@/components/ImportModal").then((module) => ({ default: module.ImportModal })), { ssr: false })
const ExportModal = dynamic(() => import("@/components/ExportModal").then((module) => ({ default: module.ExportModal })), { ssr: false })
const XiaohongshuInviteModal = dynamic(() => import("@/components/XiaohongshuInviteModal").then((module) => ({ default: module.XiaohongshuInviteModal })), { ssr: false })
const AuthModal = dynamic(() => import("@/components/AuthModal").then((module) => ({ default: module.AuthModal })), { ssr: false })
const DataConflictModal = dynamic(() => import("@/components/DataConflictModal").then((module) => ({ default: module.DataConflictModal })), { ssr: false })
const DebugLogModal = dynamic(() => import("@/components/DebugLogModal").then((module) => ({ default: module.DebugLogModal })), { ssr: false })
const SettingsModal = dynamic(() => import("@/components/settings/SettingsModal").then((module) => ({ default: module.SettingsModal })), { ssr: false })
const ActivateModal = dynamic(() => import("@/components/Membership/ActivateModal").then((module) => ({ default: module.ActivateModal })), { ssr: false })
const MembershipPromptModal = dynamic(() => import("@/components/Membership/MembershipPromptModal").then((module) => ({ default: module.MembershipPromptModal })), { ssr: false })

interface ClearDataDialogProps {
  isOpen: boolean
  step: 1 | 2 | 3
  confirmPhrase: string
  onClose: () => void
  onStepChange: (step: 1 | 2 | 3) => void
  onConfirmPhraseChange: (value: string) => void
  onInvalidConfirmPhrase: () => void
  onComplete: () => void | Promise<void>
}

interface ChantSettingsSheetProps {
  isOpen: boolean
  isPro: boolean
  minutes: number
  seconds: number
  delaySeconds: number
  onMinutesChange: (value: number) => void
  onSecondsChange: (value: number) => void
  onDelayChange: (value: number) => void
  onClose: () => void
  onUpgrade: () => void
}

interface PracticeModalHostProps {
  clearData: ClearDataDialogProps
  chantSettings: ChantSettingsSheetProps
  guidedAudioVersions: ComponentProps<typeof GuidedAudioVersionSheet>
  external?: {
    customPractice: ComponentProps<typeof CustomPracticeModal>
    editOption: ComponentProps<typeof EditOptionModal>
    settings: ComponentProps<typeof SettingsModal>
    annotationManager: ComponentProps<typeof AnnotationManagerModal>
    activate: ComponentProps<typeof ActivateModal>
    membershipPrompt: ComponentProps<typeof MembershipPromptModal>
    accountSync: ComponentProps<typeof AccountSyncModal>
    importModal: ComponentProps<typeof ImportModal>
    exportModal: ComponentProps<typeof ExportModal>
    debugLogModal: ComponentProps<typeof DebugLogModal>
    completion: ComponentProps<typeof CompletionSheet>
    fakeDoor: ComponentProps<typeof FakeDoorModal>
    xiaohongshu: ComponentProps<typeof XiaohongshuInviteModal>
    auth: ComponentProps<typeof AuthModal>
    dataConflict: ComponentProps<typeof DataConflictModal>
  }
}

function ClearDataDialog({
  isOpen,
  step,
  confirmPhrase,
  onClose,
  onStepChange,
  onConfirmPhraseChange,
  onInvalidConfirmPhrase,
  onComplete,
}: ClearDataDialogProps) {
  if (!isOpen) return null

  return (
    <>
      <button type="button" aria-label="关闭清空数据确认" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[210] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-labelledby="clear-data-title" className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md pointer-events-auto">
          <div className="p-6 pb-10">
            {step === 1 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 id="clear-data-title" className="text-lg font-serif text-foreground">⚠️ 危险操作警告</h2>
                  <button type="button" aria-label="关闭危险操作警告" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-serif text-foreground text-center leading-relaxed">您正在尝试清空本地数据胶囊。</p>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-sm font-serif text-red-700 font-medium mb-2">此操作将永久删除：</p>
                    <ul className="text-sm font-serif text-red-600 space-y-1 pl-4">
                      <li>• 所有练习记录</li><li>• 练习选项</li><li>• 个人信息</li><li>• 同步日志</li>
                    </ul>
                  </div>
                  <p className="text-sm font-serif text-red-600 text-center font-medium">⚠️ 此操作不可撤销！</p>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif">取消</button>
                    <button type="button" onClick={() => onStepChange(2)} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif">继续操作</button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 id="clear-data-title" className="text-lg font-serif text-foreground">⚠️ 二次确认</h2>
                  <button type="button" aria-label="关闭二次确认" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-serif text-foreground text-center leading-relaxed">为防止误操作，请输入确认词。</p>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-sm font-serif text-red-700 text-center mb-2">确认词：</p>
                    <p className="text-lg font-serif text-red-800 text-center font-bold">确认删除</p>
                  </div>
                  <input type="text" value={confirmPhrase} onChange={(event) => onConfirmPhraseChange(event.target.value)} placeholder="请输入确认词（不含引号）" className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-secondary font-serif" autoFocus />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => onStepChange(1)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif">返回</button>
                    <button type="button" onClick={() => confirmPhrase === "确认删除" ? onStepChange(3) : onInvalidConfirmPhrase()} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-red-600/80 hover:to-red-700/80 transition-all font-serif">确认</button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 id="clear-data-title" className="text-lg font-serif text-foreground">✅ 数据已清空</h2>
                  <button type="button" aria-label="关闭清空完成提示" onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-serif text-foreground text-center leading-relaxed">所有本地数据已成功删除。</p>
                  <p className="text-sm font-serif text-muted-foreground text-center">点击完成后将退出登录并返回首页。</p>
                  <div className="flex gap-3 pt-2"><button type="button" onClick={onComplete} className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all font-serif">完成</button></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ChantSettingsSheet({
  isOpen,
  isPro,
  minutes,
  seconds,
  delaySeconds,
  onMinutesChange,
  onSecondsChange,
  onDelayChange,
  onClose,
  onUpgrade,
}: ChantSettingsSheetProps) {
  const updateMinutes = (value: number) => {
    const next = Math.min(180, Math.max(0, value))
    onMinutesChange(next)
    const total = next * 60 + seconds
    if (total >= 5) onDelayChange(total)
  }
  const updateSeconds = (value: number) => {
    const next = Math.min(59, Math.max(0, value))
    onSecondsChange(next)
    const total = minutes * 60 + next
    if (total >= 5) onDelayChange(total)
  }
  const closeAndApply = () => {
    const total = minutes * 60 + seconds
    if (total >= 5) onDelayChange(total)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button type="button" aria-label="关闭唱诵设置" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-[100]" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-labelledby="chant-settings-title" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-[110] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-6">
              <h2 id="chant-settings-title" className="text-lg font-serif text-foreground">唱诵设置</h2>
              <button type="button" aria-label="保存并关闭唱诵设置" onClick={closeAndApply} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {isPro ? (
              <div className="space-y-5">
                <label className="block text-sm font-serif text-foreground">倒计时时长</label>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center">
                    <button type="button" aria-label="增加分钟" onClick={() => updateMinutes(minutes + 1)} className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"><ChevronUp className="w-5 h-5" /></button>
                    <input aria-label="倒计时分钟" type="number" min={0} max={180} value={minutes} onChange={(event) => updateMinutes(parseInt(event.target.value) || 0)} className="w-[72px] h-16 text-center text-3xl font-light text-foreground bg-secondary/60 rounded-2xl border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-secondary appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" inputMode="numeric" />
                    <button type="button" aria-label="减少分钟" onClick={() => updateMinutes(minutes - 1)} className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"><ChevronDown className="w-5 h-5" /></button>
                  </div>
                  <span className="text-base font-serif text-muted-foreground mt-1">分</span>
                  <div className="flex flex-col items-center">
                    <button type="button" aria-label="增加秒数" onClick={() => updateSeconds(seconds + 1)} className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"><ChevronUp className="w-5 h-5" /></button>
                    <input aria-label="倒计时秒数" type="number" min={0} max={59} value={seconds} onChange={(event) => updateSeconds(parseInt(event.target.value) || 0)} className="w-[72px] h-16 text-center text-3xl font-light text-foreground bg-secondary/60 rounded-2xl border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-secondary appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" inputMode="numeric" />
                    <button type="button" aria-label="减少秒数" onClick={() => updateSeconds(seconds - 1)} className="w-[72px] h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform rounded-lg hover:bg-secondary/60"><ChevronDown className="w-5 h-5" /></button>
                  </div>
                  <span className="text-base font-serif text-muted-foreground mt-1">秒</span>
                </div>
                <p className="text-center text-xs text-muted-foreground/60 font-serif">当前：{Math.floor(delaySeconds / 60)}分{String(delaySeconds % 60).padStart(2, "0")}秒（最少5秒，最长3小时）</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground/40" /><span className="text-xs text-muted-foreground/60 font-serif">Pro 功能</span></div>
                <label className="block text-sm font-serif text-foreground">倒计时时长</label>
                <div className="flex items-center justify-center gap-3 opacity-40 pointer-events-none">
                  <div className="w-20 h-[160px] flex items-center justify-center"><span className="text-4xl font-serif text-foreground">{Math.floor(delaySeconds / 60)}</span></div><span className="text-sm font-serif text-muted-foreground">分</span>
                  <div className="w-20 h-[160px] flex items-center justify-center"><span className="text-4xl font-serif text-foreground">{String(delaySeconds % 60).padStart(2, "0")}</span></div><span className="text-sm font-serif text-muted-foreground">秒</span>
                </div>
                <p className="text-xs text-muted-foreground font-serif leading-relaxed">开启后，开始练习前会先全屏倒计时，然后播放开篇唱诵音频，结束后自动开始练习计时。</p>
                <button type="button" onClick={onUpgrade} className="w-full mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-serif shadow-[0_4px_12px_rgba(245,158,11,0.3)]"><Crown className="w-4 h-4 inline mr-1" />升级 Pro 解锁自定义时长</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function PracticeModalHost({ clearData, chantSettings, guidedAudioVersions, external }: PracticeModalHostProps) {
  return (
    <>
      {external && (
        <>
          <CustomPracticeModal {...external.customPractice} />
          <EditOptionModal {...external.editOption} />
          <SettingsModal {...external.settings} />
          <AnnotationManagerModal {...external.annotationManager} />
          <ActivateModal {...external.activate} />
          <MembershipPromptModal {...external.membershipPrompt} />
          <AccountSyncModal {...external.accountSync} />
          <ImportModal {...external.importModal} />
          <ExportModal {...external.exportModal} />
          <DebugLogModal {...external.debugLogModal} />
          <CompletionSheet {...external.completion} />
          <FakeDoorModal {...external.fakeDoor} />
          <XiaohongshuInviteModal {...external.xiaohongshu} />
          <AuthModal {...external.auth} />
          <DataConflictModal {...external.dataConflict} />
        </>
      )}
      <ClearDataDialog {...clearData} />
      <ChantSettingsSheet {...chantSettings} />
      <GuidedAudioVersionSheet {...guidedAudioVersions} />
    </>
  )
}
