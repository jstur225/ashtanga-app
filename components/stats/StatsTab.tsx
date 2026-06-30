"use client"

import { useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, Crown, Download, Loader2, Settings, Sparkles, User } from "lucide-react"
import { toast } from "sonner"
import { PWAInstallBanner } from "@/components/PWAInstallBanner"
import { usePWAInstall } from "@/hooks/usePWAInstall"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"
import { MOON_DAYS_2026 } from "@/lib/moon-phase-data"
import { getColorClass } from "@/lib/sync-utils"
import { buildYearMonthGroups, calculateTotalStats, maskEmail } from "@/lib/stats-utils"

const PWAInstallTutorialModal = dynamic(
  () => import("@/components/PWAInstallTutorialModal").then((module) => ({ default: module.PWAInstallTutorialModal })),
  { ssr: false }
)

const NEW_MOON_ICON = "/moon-phase/new-moon.png"
const FULL_MOON_ICON = "/moon-phase/full-moon.png"
const UNIFIED_COLS = 16

// ⭐ 滚动位置记忆：tab 切换时组件 unmount，下次 mount 时从 sessionStorage 恢复。
// 不用模块变量（next/dynamic 在 dev 模式可能重新求值模块导致变量重置）；
// 不用 localStorage（重启浏览器后回到顶部是合理行为）。
const SCROLL_STORAGE_KEY = 'stats-tab-scroll-top'

type MembershipInfo = {
  is_active: boolean
  expires_at_formatted: string | null
  days_remaining: number
  type: "trial" | "quarter" | "year" | null
}

export interface StatsTabProps {
  practiceHistory: PracticeRecord[]
  practiceOptions: PracticeOption[]
  profile: UserProfile
  membership: MembershipInfo | null
  membershipLoading: boolean
  onOpenSettings: () => void
  onOpenMembership: () => void
  onOpenFakeDoor: () => void
  showXiaohongshuModal: boolean
  setShowXiaohongshuModal: (value: boolean) => void
  user?: { email?: string | null } | null
  showPWAInstallTutorial: boolean
  setShowPWAInstallTutorial: (value: boolean) => void
}

function getMoonPhaseMap() {
  const map: Record<string, { type: "new" | "full"; icon: string; name: string }> = {}
  MOON_DAYS_2026.forEach((moonDay) => {
    map[moonDay.date] = {
      type: moonDay.type,
      icon: moonDay.type === "new" ? NEW_MOON_ICON : FULL_MOON_ICON,
      name: moonDay.type === "new" ? "新月" : "满月",
    }
  })
  return map
}

function ProBadge({ isPro, daysRemaining }: { isPro: boolean; daysRemaining?: number }) {
  if (!isPro) {
    return (
      <span className="ml-2 px-2 py-0.5 text-[10px] font-serif rounded-full bg-[#E8EDE7] text-[#6B7280] border border-[#E5E5E5]">
        FREE
      </span>
    )
  }

  return (
    <span className="ml-2 px-2 py-0.5 text-[10px] font-serif rounded-full bg-gradient-to-r from-[#C1A268] to-[#D4AF37] text-white shadow-sm">
      PRO
    </span>
  )
}

export function StatsTab({
  practiceHistory,
  practiceOptions,
  profile,
  membership,
  membershipLoading,
  onOpenSettings,
  onOpenMembership,
  showPWAInstallTutorial,
  setShowPWAInstallTutorial,
  user,
}: StatsTabProps) {
  const { promptInstall } = usePWAInstall()

  // ⭐ 滚动位置持久化：tab 切走时恢复，切回时恢复
  // 关键点：必须在 scroll 事件中实时保存，不能在 unmount 时才读 scrollTop。
  // 因为 framer-motion AnimatePresence 的 exit 动画会先于 unmount 把 scrollTop 重置为 0。
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // 读取上次保存的位置
    let savedScrollTop = 0
    try {
      savedScrollTop = parseInt(sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0', 10) || 0
    } catch {
      // sessionStorage 不可用时静默失败
    }

    // 实时保存：每次滚动都更新（throttled via rAF）
    let pendingSave = false
    const saveScroll = () => {
      if (pendingSave) return
      pendingSave = true
      requestAnimationFrame(() => {
        pendingSave = false
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollTop))
        } catch {
          // 静默失败
        }
      })
    }
    el.addEventListener('scroll', saveScroll, { passive: true })
    // 初次 mount 也保存一次（防止用户没滚动就切走）
    saveScroll()

    // 轮询恢复：等待异步内容（热力图/月相日历）撑起足够高度后再设置 scrollTop
    let canceled = false
    const tryRestore = (attemptsLeft: number) => {
      if (canceled || savedScrollTop <= 0) return
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll >= savedScrollTop) {
        el.scrollTop = savedScrollTop
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryRestore(attemptsLeft - 1), 100)
      }
    }
    const restoreId = setTimeout(() => tryRestore(15), 50)

    // unmount：移除监听器（sessionStorage 已实时保存，无需再保存）
    return () => {
      canceled = true
      clearTimeout(restoreId)
      el.removeEventListener('scroll', saveScroll)
    }
  }, [])

  const handleInstallClick = async () => {
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches

    if (isInstalled) {
      toast("💚 已安装到主屏幕！推荐给朋友一起练习吧", {
        duration: 3000,
      })
      return
    }

    const installed = await promptInstall()
    if (installed) {
      toast.success("✅ 已安装到主屏幕！现在可以从主屏幕打开了")
    } else {
      setShowPWAInstallTutorial(true)
    }
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const totalStats = useMemo(() => calculateTotalStats(practiceHistory, profile), [practiceHistory, profile])
  const moonPhaseMap = useMemo(() => getMoonPhaseMap(), [])
  const monthGroups = useMemo(
    () => (practiceHistory.length > 0 ? buildYearMonthGroups(practiceHistory, practiceOptions, !!membership?.is_active, currentYear) : []),
    [practiceHistory, practiceOptions, membership?.is_active, currentYear]
  )

  const dynamicText = "练习是连贯的珍珠"
  const dotConfig = {
    gap: 4,
    dotSize: 12,
    radius: 3,
    cols: UNIFIED_COLS,
    labelWidth: 32,
    labelFontSize: 11,
    sectionGap: 8,
  } as const

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24 pt-4">
      <div className="px-6 flex items-center justify-between mb-4 pt-10">
        <button
          type="button"
          onClick={handleInstallClick}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="安装到主屏幕"
        >
          <Download className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="打开设置"
          onClick={onOpenSettings}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <PWAInstallBanner />
      <PWAInstallTutorialModal
        isOpen={showPWAInstallTutorial}
        onClose={() => setShowPWAInstallTutorial(false)}
      />

      <div className="px-6 pb-48">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar || "/placeholder.svg"} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif text-[#2D5A27]">{profile.name}</h2>
            {membershipLoading ? (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-serif rounded-full bg-gray-100 text-gray-400">
                加载中...
              </span>
            ) : (
              <ProBadge isPro={membership?.is_active ?? false} daysRemaining={membership?.days_remaining} />
            )}
          </div>

          {membershipLoading ? (
            <div className="mt-2 flex items-center gap-2 px-4 py-2 text-xs text-gray-400 font-serif">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在加载会员状态...</span>
            </div>
          ) : membership?.is_active ? (
            <div className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F9F7F2] to-[#F5F0E8] rounded-full border border-[#C1A268]/30">
              <Crown className="w-4 h-4 text-[#C1A268]" />
              <span className="text-xs text-[#8B7355] font-serif">
                Pro 有效期至 {membership.expires_at_formatted}
              </span>
              <span className="text-[10px] text-[#C1A268]">· {membership.days_remaining}天</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenMembership}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-xs text-[#8B7355] hover:text-[#6B5A47] font-serif bg-[#F9F7F2] hover:bg-[#F5F0E8] rounded-full border border-[#C1A268]/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C1A268]" />
              <span>升级 Pro 解锁更多功能</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <p className="text-[10px] font-mono text-gray-400 mt-1">
            ID: {user?.email ? maskEmail(user.email) : profile.id?.slice(0, 8) || "ANONYMOUS"}
          </p>
          <p className="text-sm text-muted-foreground font-serif mt-1">{profile.signature}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.totalDays}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">总熬汤天数</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.totalHours}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">总熬汤时长（小时）</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 text-center shadow-md border border-stone-200">
            <div className="text-2xl font-serif text-primary">{totalStats.avgMinutes}</div>
            <div className="text-xs text-muted-foreground font-serif mt-1">平均分钟</div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] shadow-md border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.h3
                key={dynamicText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-serif italic text-stone-500"
              >
                {dynamicText}
              </motion.h3>
            </AnimatePresence>
          </div>

          <div className="p-4 pt-0">
            {monthGroups.length === 0 ? (
              <div className="text-center text-sm text-stone-400 font-serif py-8">暂无练习数据</div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="heatmap"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                  className="flex flex-col"
                  style={{ gap: dotConfig.sectionGap }}
                >
                  {monthGroups.map((month) => (
                    <div key={month.monthKey} className="flex items-start" style={{ gap: dotConfig.gap }}>
                      <div
                        className="text-xs text-zinc-400 font-serif italic shrink-0 flex items-center justify-start"
                        style={{
                          width: dotConfig.labelWidth,
                          height: dotConfig.dotSize,
                        }}
                      >
                        {month.monthLabel}
                      </div>

                      <div
                        className="grid flex-1"
                        style={{
                          gridTemplateColumns: `repeat(${UNIFIED_COLS}, minmax(0, 1fr))`,
                          gap: dotConfig.gap,
                        }}
                      >
                        {month.days.map((day) => {
                          const moonInfo = moonPhaseMap[day.date]
                          const isMoonDay = !!moonInfo
                          const hasPractice = day.count > 0

                          if (isMoonDay && !hasPractice) {
                            return (
                              <div
                                key={day.date}
                                className="rounded-full w-[12px] h-[12px] bg-stone-100"
                                style={{
                                  backgroundImage: `url(${moonInfo!.icon})`,
                                  backgroundSize: "115%",
                                  backgroundPosition: "center",
                                }}
                                title={`${day.date}: ${moonInfo!.name}`}
                              />
                            )
                          }

                          if (isMoonDay) {
                            return (
                              <div
                                key={day.date}
                                className="relative w-[12px] h-[12px] flex items-center justify-center"
                                title={`${day.date}: ${day.count} 分钟 · ${moonInfo!.name}`}
                              >
                                <div
                                  className={`${getColorClass(day.colorLevel || 3)} rounded-full w-[12px] h-[12px] shadow-[0_2px_8px_rgba(45,90,39,0.3)]`}
                                />
                                <div className="absolute w-[2px] h-[2px] rounded-full bg-[#FFE066] shadow-[0_0_4px_rgba(255,224,102,0.8)]" />
                              </div>
                            )
                          }

                          const dayColor = day.colorLevel > 0 ? getColorClass(day.colorLevel) : "bg-stone-100"
                          return (
                            <div
                              key={day.date}
                              className={`${dayColor} rounded-full w-[12px] h-[12px]`}
                              title={`${day.date}: ${day.count} 分钟`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
