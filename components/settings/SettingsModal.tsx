"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bug, Calendar, Camera, ChevronRight, Copy, Download, Loader2, Trash2, User, X } from "lucide-react"
import { toast } from "sonner"
import { MembershipActions } from "@/components/Membership/MembershipActions"
import { MembershipCard } from "@/components/Membership/MembershipCard"
import { AccountSyncSection } from "@/components/settings/AccountSyncSection"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"

type SettingsSection = "profile" | "membership" | "account" | "data"
type MembershipInfo = {
  is_active: boolean
  expires_at_formatted: string | null
  days_remaining: number
  type: "trial" | "quarter" | "year" | null
}

interface ProfileSettingsSectionProps {
  profile: UserProfile
  user?: { email?: string | null } | null
  onSave: (profile: UserProfile) => void
  onClose: () => void
  onOpenAccountSection: () => void
}

interface MembershipSettingsSectionProps {
  membership?: MembershipInfo | null
  onActivateMembership?: () => void
}

interface DataManagementSectionProps {
  user?: unknown
  onOpenExport: () => void
  onOpenImport: () => void
  onExportLog?: () => void | Promise<void>
  onClearData?: () => void
  onShowClearDataConfirm?: () => void
}

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  onOpenExport: () => void
  onOpenImport: () => void
  onExportLog?: () => void | Promise<void>
  onClearData?: () => void
  user?: { email?: string | null } | null
  practiceHistory?: PracticeRecord[]
  practiceOptionsData?: PracticeOption[]
  initialSection?: SettingsSection
  onShowClearDataConfirm?: () => void
  onOpenLoginModal?: () => void
  onOpenRegisterModal?: () => void
  membership?: MembershipInfo | null
  onActivateMembership?: () => void
  onUpdateProfile?: (profile: UserProfile) => void
}

export function ProfileSettingsSection({
  profile,
  user,
  onSave,
  onClose,
  onOpenAccountSection,
}: ProfileSettingsSectionProps) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [historicalDays, setHistoricalDays] = useState(profile.historical_days || 0)
  const [historicalAvgMinutes, setHistoricalAvgMinutes] = useState(profile.historical_avg_minutes || 0)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
    setHistoricalDays(profile.historical_days || 0)
    setHistoricalAvgMinutes(profile.historical_avg_minutes || 0)
  }, [profile])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!user?.email) {
      toast.info("绑定邮箱后可上传头像", {
        action: {
          label: "去绑定",
          onClick: onOpenAccountSection,
        },
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片太大啦，请选择 5MB 以内的图片")
      return
    }

    setIsUploadingAvatar(true)
    try {
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          const image = new Image()
          image.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            const maxDimension = 200
            let width = image.width
            let height = image.height

            if (width > height && width > maxDimension) {
              height = (height * maxDimension) / width
              width = maxDimension
            } else if (height > maxDimension) {
              width = (width * maxDimension) / height
              height = maxDimension
            }

            canvas.width = width
            canvas.height = height
            ctx?.drawImage(image, 0, 0, width, height)
            resolve(canvas.toDataURL("image/jpeg", 0.85))
          }
          image.onerror = reject
          image.src = readerEvent.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const blob = await fetch(compressedDataUrl).then((response) => response.blob())
      const avatarFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" })
      const { getPresignedUrl } = await import("@/lib/oss")
      const presignedResult = await getPresignedUrl(avatarFile.name, avatarFile.type)

      if (!presignedResult.success) {
        toast.error("获取上传链接失败")
        return
      }

      const { uploadToOSS } = await import("@/lib/oss")
      const uploadResult = await uploadToOSS(avatarFile, presignedResult.data!.presignedUrl, avatarFile.type)

      if (!uploadResult.success) {
        toast.error("头像上传失败，请重试")
        return
      }

      setAvatar(presignedResult.data!.ossUrl)
      toast.success("头像上传成功")
      onSave({
        ...profile,
        name,
        signature,
        avatar: presignedResult.data!.ossUrl,
        historical_days: historicalDays,
        historical_avg_minutes: historicalAvgMinutes,
      })
    } catch (error) {
      console.error("头像上传异常:", error)
      toast.error("头像上传失败，请重试")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = () => {
    try {
      onSave({
        ...profile,
        name,
        signature,
        avatar,
        historical_days: historicalDays,
        historical_avg_minutes: historicalAvgMinutes,
      })
      onClose()
    } catch (error) {
      console.error("保存失败:", error)
      toast.error("保存失败，图片可能太大，请尝试压缩后再上传")
    }
  }

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary">
            {avatar ? (
              <img src={avatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="上传头像"
            onClick={() => {
              if (!user?.email) {
                toast.info("绑定邮箱后可上传头像", {
                  action: {
                    label: "去绑定",
                    onClick: onOpenAccountSection,
                  },
                })
                onOpenAccountSection()
                return
              }
              if (!isUploadingAvatar) {
                fileInputRef.current?.click()
              }
            }}
            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5">昵称</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-serif text-muted-foreground mb-1.5">个人签名</label>
          <input
            type="text"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-sm font-serif text-foreground">过往练习</h3>
          </div>
          <span className="text-xs text-primary font-medium">
            累计约 {Math.round((historicalDays * historicalAvgMinutes) / 60)} 小时
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 border border-stone-200">
            <input
              aria-label="历史练习天数"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={historicalDays === 0 ? "" : historicalDays}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9]/g, "")
                setHistoricalDays(value === "" ? 0 : parseInt(value))
              }}
              className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
              placeholder="0"
            />
            <div className="text-[10px] text-muted-foreground font-serif mt-1 text-center">天数</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200">
            <input
              aria-label="平均每次分钟"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={historicalAvgMinutes === 0 ? "" : historicalAvgMinutes}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9]/g, "")
                setHistoricalAvgMinutes(value === "" ? 0 : parseInt(value))
              }}
              className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
              placeholder="0"
            />
            <div className="text-[10px] text-muted-foreground font-serif mt-1 text-center">分钟/次</div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/70 text-center font-serif mt-2">
          设置后，统计数据会以此为基础累加
        </p>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-4 rounded-full green-gradient text-white font-serif shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          保存设置
        </button>
      </div>
    </>
  )
}

export function MembershipSettingsSection({
  membership,
  onActivateMembership,
}: MembershipSettingsSectionProps) {
  return (
    <div className="space-y-4">
      <MembershipCard showStatus membership={membership} loading={false} />
      <MembershipActions
        onActivate={onActivateMembership ?? (() => {})}
        isActive={membership?.is_active ?? false}
      />
    </div>
  )
}

export function DataManagementSection({
  user,
  onOpenExport,
  onOpenImport,
  onExportLog,
  onClearData,
  onShowClearDataConfirm,
}: DataManagementSectionProps) {
  const [isExportingLog, setIsExportingLog] = useState(false)

  return (
    <div className="space-y-3">
      {!user && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
          <p className="text-xs text-orange-600 font-serif leading-relaxed">
            未开启云端同步，建议定期备份数据，防止意外丢失
          </p>
        </div>
      )}

      <SettingsActionButton
        icon={<Copy className="w-5 h-5" />}
        iconClassName="bg-blue-50 text-blue-500"
        title="复制数据胶囊"
        description="一键复制到剪贴板"
        onClick={onOpenExport}
        testId="settings-export-data"
      />
      <SettingsActionButton
        icon={<Download className="w-5 h-5" />}
        iconClassName="bg-red-50 text-red-500"
        title="导入数据胶囊"
        description="从剪贴板恢复数据"
        onClick={onOpenImport}
      />

      {onExportLog && (
        <SettingsActionButton
          icon={<Bug className="w-5 h-5" />}
          iconClassName="bg-orange-50 text-orange-500"
          title={isExportingLog ? "正在生成日志..." : "运行日志"}
          description={isExportingLog ? "请稍候，正在测试连接..." : "如遇问题，请复制本日志发给开发者"}
          disabled={isExportingLog}
          trailing={isExportingLog ? <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> : undefined}
          onClick={async () => {
            setIsExportingLog(true)
            try {
              await onExportLog()
            } finally {
              setIsExportingLog(false)
            }
          }}
        />
      )}

      {onClearData && (
        <button
          type="button"
          onClick={() => onShowClearDataConfirm?.()}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-all group border border-red-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-serif text-red-700">清空数据胶囊</div>
              <div className="text-[10px] text-red-600 font-serif">删除所有记录，恢复初始状态</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  )
}

function SettingsActionButton({
  icon,
  iconClassName,
  title,
  description,
  onClick,
  disabled,
  trailing,
  testId,
}: {
  icon: React.ReactNode
  iconClassName: string
  title: string
  description: string
  onClick: () => void | Promise<void>
  disabled?: boolean
  trailing?: React.ReactNode
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${iconClassName}`}>{icon}</div>
        <div className="text-left">
          <div className="text-sm font-serif text-foreground">{title}</div>
          <div className="text-[10px] text-muted-foreground font-serif">{description}</div>
        </div>
      </div>
      {trailing ?? <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />}
    </button>
  )
}

const SETTINGS_TABS: Array<{ id: SettingsSection; label: string }> = [
  { id: "profile", label: "个人资料" },
  { id: "membership", label: "会员" },
  { id: "account", label: "账户同步" },
  { id: "data", label: "数据管理" },
]

export function SettingsModal({
  isOpen,
  onClose,
  profile,
  onSave,
  onOpenExport,
  onOpenImport,
  onExportLog,
  onClearData,
  user,
  practiceHistory,
  practiceOptionsData,
  initialSection,
  onShowClearDataConfirm,
  onOpenLoginModal,
  onOpenRegisterModal,
  membership,
  onActivateMembership,
  onUpdateProfile,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || "profile")

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
            role="dialog" aria-modal="true" aria-labelledby="settings-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">设置</h2>
              <button
                type="button"
                aria-label="关闭设置"
                onClick={onClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                    activeSection === tab.id
                      ? tab.id === "membership"
                        ? "bg-gradient-to-r from-[#C1A268] to-[#D4AF37] shadow-[0_4px_16px_rgba(193,162,104,0.25)] text-white"
                        : "green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {activeSection === "profile" && (
                <ProfileSettingsSection
                  profile={profile}
                  user={user}
                  onSave={onSave}
                  onClose={onClose}
                  onOpenAccountSection={() => setActiveSection("account")}
                />
              )}
              {activeSection === "membership" && (
                <MembershipSettingsSection
                  membership={membership}
                  onActivateMembership={onActivateMembership}
                />
              )}
              {activeSection === "account" && (
                <AccountSyncSection
                  profile={profile}
                  practiceHistory={practiceHistory}
                  practiceOptionsData={practiceOptionsData}
                  onClose={onClose}
                  onOpenLoginModal={onOpenLoginModal}
                  onOpenRegisterModal={onOpenRegisterModal}
                  onShowClearDataConfirm={onShowClearDataConfirm}
                  onUpdateProfile={onUpdateProfile}
                  user={user}
                />
              )}
              {activeSection === "data" && (
                <DataManagementSection
                  user={user}
                  onOpenExport={onOpenExport}
                  onOpenImport={onOpenImport}
                  onExportLog={onExportLog}
                  onClearData={onClearData}
                  onShowClearDataConfirm={onShowClearDataConfirm}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
