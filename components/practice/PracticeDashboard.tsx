"use client"

import { motion } from "framer-motion"
import { Lock, Volume } from "lucide-react"
import type { PracticeOption } from "@/hooks/usePracticeData"

interface PracticeDashboardProps {
  practiceOptions: PracticeOption[]
  selectedOption: string | null
  lockedOptionIds: ReadonlySet<string>
  chantEnabled: boolean
  onOptionTap: (option: PracticeOption) => void
  onStartPractice: () => void | Promise<void>
}

export function PracticeDashboard({
  practiceOptions,
  selectedOption,
  lockedOptionIds,
  chantEnabled,
  onOptionTap,
  onStartPractice,
}: PracticeDashboardProps) {
  return (
    <main className="flex-1 px-6 flex flex-col pb-32 overflow-y-auto">
      <header className="pt-12 pb-4 flex items-center justify-center">
        <div className="flex flex-row items-center gap-3">
          <img src="/icon.png" alt="熬汤日记" className="w-[34px] h-[34px] rounded-lg shadow-sm" />
          <div className="flex flex-col">
            <h1 className="text-lg font-serif text-foreground tracking-wide font-semibold">
              熬汤日记
              <span className="text-muted-foreground/50 font-normal">·呼吸</span>
              <span className="text-muted-foreground/70 font-normal">·觉察</span>
            </h1>
            <p className="text-[9px] text-muted-foreground/50 font-serif tracking-wide leading-tight">
              Practice, practice, and all is coming.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-4">
        {practiceOptions.map((option) => {
          const isSelected = selectedOption === option.id
          const isCustomButton = option.id === "custom"
          const isLocked = !isCustomButton && lockedOptionIds.has(option.id)
          const isChantOn = option.id === "chant_switch" && chantEnabled

          return (
            <motion.button
              key={option.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onOptionTap(option)}
              className={`
                py-[6px] px-1 rounded-[20px] text-center font-serif transition-all duration-300
                min-h-[72px] w-full flex flex-col items-center justify-center relative
                ${(isSelected || isChantOn) && !isLocked
                  ? "green-gradient text-primary-foreground backdrop-blur-[16px] border border-white/30 shadow-[0_8px_24px_rgba(45,90,39,0.3)]"
                  : isLocked
                    ? "bg-muted/50 text-muted-foreground/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-100/30 opacity-50"
                    : isCustomButton
                      ? "bg-background text-muted-foreground border-2 border-dashed border-muted-foreground/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                      : "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
                }
              `}
            >
              {isLocked && <Lock aria-label="会员专属" className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground/40" />}
              {option.id === "today_count" ? (
                <>
                  <span className="text-[14px] leading-snug flex items-center justify-center">
                    <span className="text-[#C5975C] font-bold">{option.label}</span>
                  </span>
                  <span className={`text-[11px] mt-0.5 leading-snug ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {option.notes}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[14px] leading-snug break-words w-full line-clamp-2 flex items-center justify-center gap-1">
                    {isCustomButton ? "+ 自定义" : (
                      <>
                        <span>{option.label}</span>
                        {option.is_preset && <Volume aria-label="包含口令音频" className="w-4 h-4" style={{ color: isSelected && !isLocked ? "white" : "rgba(74, 122, 68)" }} />}
                      </>
                    )}
                  </span>
                  {!isCustomButton && option.notes && (
                    <span className={`text-[11px] mt-0.5 leading-snug break-words w-full line-clamp-2 ${(isSelected || isChantOn) && !isLocked ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {option.notes}
                    </span>
                  )}
                </>
              )}
            </motion.button>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground font-serif mt-[-4px]">
        单击选择·双击编辑
      </p>

      <div className="flex-1" />

      <div className="flex flex-col items-center justify-center py-6">
        <motion.button
          type="button"
          aria-label={selectedOption ? "开始练习" : "请先选择练习类型"}
          disabled={!selectedOption}
          layout={false}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatType: "loop" }}
          className={`
            w-36 h-36 rounded-full flex items-center justify-center relative overflow-hidden
            transition-colors duration-500
            ${selectedOption
              ? "green-gradient cursor-pointer backdrop-blur-[16px] border border-white/30 shadow-[0_12px_48px_rgba(45,90,39,0.45)]"
              : "bg-muted/50 backdrop-blur-sm"
            }
          `}
          onClick={onStartPractice}
          whileTap={selectedOption ? { scale: 0.95 } : {}}
        >
          <img
            src={selectedOption ? "/icon-light.png" : "/icon-green.png"}
            alt=""
            className="w-24 h-24 transition-all duration-500 opacity-60"
          />
        </motion.button>
        <span className={`mt-3 text-sm font-serif text-center ${selectedOption ? "text-primary" : "text-muted-foreground"}`}>
          {selectedOption ? "开始练习" : "请选择练习类型"}
        </span>
      </div>
    </main>
  )
}
