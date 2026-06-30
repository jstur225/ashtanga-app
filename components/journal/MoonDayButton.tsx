"use client"

import React from "react"
import { getColorClass } from "@/lib/sync-utils"

export interface MoonDayInfo {
  type: "new" | "full"
  icon: string
  name: string
}

interface MoonDayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  day: number | null
  moonInfo: MoonDayInfo | null
  practiced: boolean
  isPast?: boolean
  hasBreakthrough?: boolean
  annotationColors?: string[]
  colorLevel?: number
}

export function MoonDayButton({
  day,
  moonInfo,
  practiced,
  isPast,
  hasBreakthrough,
  annotationColors = [],
  colorLevel,
  className,
  ...props
}: MoonDayButtonProps) {
  const isMoonDayNotPracticed = moonInfo && !practiced
  const isFutureMoonDay = moonInfo && !practiced && isPast === false
  const hasMoonDot = moonInfo && practiced
  const hasBreakthroughDot = hasBreakthrough && !moonInfo
  const greenClass = getColorClass(colorLevel ?? 3)

  return (
    <button
      {...props}
      className={`aspect-square rounded-full flex items-center justify-center text-[9px] font-serif transition-all relative ${
        practiced
          ? `${greenClass} border border-white/20 shadow-[0_2px_8px_rgba(45,90,39,0.3)] text-white cursor-pointer hover:shadow-[0_2px_12px_rgba(45,90,39,0.45)]`
          : isMoonDayNotPracticed
            ? "bg-background border-0"
            : className || ""
      } ${!practiced && !moonInfo && isPast === false ? "text-muted-foreground/50" : ""}`}
      style={
        isMoonDayNotPracticed
          ? {
              backgroundImage: `url(${moonInfo!.icon})`,
              backgroundSize: "105%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              boxShadow: "none",
            }
          : undefined
      }
    >
      <span className={`relative z-10 ${isFutureMoonDay ? "text-muted-foreground/50" : ""}`}>{day}</span>

      {(hasMoonDot || hasBreakthroughDot || annotationColors.length > 0) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[1.5px] z-20">
          {hasMoonDot && <div className="w-1 h-1 rounded-full bg-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.8)]" />}
          {hasBreakthroughDot && <div className="w-1 h-1 rounded-full bg-[#e67e22] shadow-[0_0_6px_rgba(230,126,34,0.8)]" />}
          {annotationColors.slice(0, 3).map((color, index) => (
            <div
              key={index}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}80` }}
            />
          ))}
        </div>
      )}
    </button>
  )
}
