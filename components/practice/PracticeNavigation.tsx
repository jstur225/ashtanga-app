"use client"

import { AnimatePresence, motion } from "framer-motion"
import { BarChart3, BookOpen, Calendar, Library } from "lucide-react"

export type PracticeTab = "practice" | "journal" | "poses" | "stats"

interface PracticeNavigationProps {
  activeTab: PracticeTab
  hidden: boolean
  onChange: (tab: PracticeTab) => void
}

export function hasOpenPracticeOverlay(overlays: Record<string, boolean>) {
  return Object.values(overlays).some(Boolean)
}

const ITEMS = [
  { id: "practice", label: "今日练习", Icon: Calendar },
  { id: "journal", label: "觉察日记", Icon: BookOpen },
  { id: "poses", label: "体式库", Icon: Library },
  { id: "stats", label: "我的数据", Icon: BarChart3 },
] as const

export function PracticeNavigation({ activeTab, hidden, onChange }: PracticeNavigationProps) {
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.nav
          aria-label="主要导航"
          initial={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="bg-white/30 backdrop-blur-[8px] rounded-full px-1 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-white/30">
            <div className="flex items-center gap-1">
              {ITEMS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={activeTab === id ? "page" : undefined}
                  onClick={() => onChange(id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all ${activeTab === id ? "green-gradient text-white shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-serif whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
