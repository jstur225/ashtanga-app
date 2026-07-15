"use client"

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { POSE_SECTIONS, POSES, type Pose, type PoseSectionId } from '@/lib/pose-data'

interface PosesTabProps {
  onDetailOpen?: () => void
  onDetailClose?: () => void
}

export function PosesTab({ onDetailOpen, onDetailClose }: PosesTabProps) {
  const [activeSection, setActiveSection] = useState<PoseSectionId>('surya-a')
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null)
  const [poseIndex, setPoseIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({})

  const visiblePoses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const candidates = query ? POSES : POSES.filter(pose => pose.section === activeSection)
    if (!query) return candidates

    return candidates.filter(pose =>
      pose.name.toLowerCase().includes(query) ||
      pose.sanskrit.toLowerCase().includes(query) ||
      pose.aliases.some(alias => alias.toLowerCase().includes(query))
    )
  }, [activeSection, searchQuery])

  const openPose = (pose: Pose) => {
    setPoseIndex(visiblePoses.findIndex(item => item.id === pose.id))
    setSelectedPose(pose)
    onDetailOpen?.()
  }

  const closePose = () => {
    setSelectedPose(null)
    onDetailClose?.()
  }

  const navigatePose = (direction: 'prev' | 'next') => {
    if (visiblePoses.length === 0) return
    const nextIndex = direction === 'prev'
      ? (poseIndex - 1 + visiblePoses.length) % visiblePoses.length
      : (poseIndex + 1) % visiblePoses.length
    setPoseIndex(nextIndex)
    setSelectedPose(visiblePoses[nextIndex])
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#faf8f5] to-white">
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-[#faf8f5]/95 backdrop-blur-sm">
        <div className="overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-1.5 pb-2">
            {POSE_SECTIONS.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-serif transition-colors ${
                  activeSection === section.id && !searchQuery.trim()
                    ? 'bg-[#5B7553] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索中文名或梵文名"
              className="w-full rounded-full bg-white py-2 pl-9 pr-3 text-xs font-serif text-stone-600 outline-none ring-1 ring-stone-100 placeholder:text-stone-300 focus:ring-[#5B7553]/25"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {visiblePoses.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm font-serif text-stone-300">
            未找到匹配体式
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-x-2.5 gap-y-4">
            {visiblePoses.map(pose => (
              <button
                key={pose.id}
                type="button"
                onClick={() => openPose(pose)}
                className="group min-w-0 text-left active:scale-[0.98]"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-stone-100 bg-[#F9F7F2] shadow-sm transition-shadow group-hover:shadow-md">
                  <img
                    src={pose.thumbnail}
                    alt={pose.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="mt-1.5 line-clamp-2 min-h-[2.5em] text-center text-[11px] leading-[1.25] font-serif text-stone-600">
                  {pose.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPose && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-white"
          >
            <div className="z-10 flex flex-shrink-0 items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
              <button
                type="button"
                onClick={closePose}
                className="flex items-center gap-1.5 text-stone-500"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-serif">返回</span>
              </button>
              <div className="min-w-0 flex-1 px-2 text-center">
                <div className="truncate text-sm font-medium font-serif text-stone-800">
                  {selectedPose.name}
                </div>
                <div className="truncate text-[10px] font-serif text-stone-400">
                  {selectedPose.sanskrit}
                </div>
              </div>
              <div className="w-[60px]" />
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#faf8f5] to-white">
              <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center p-3">
                {!imagesLoaded[selectedPose.id] && (
                  <div className="aspect-square w-full animate-pulse rounded-2xl bg-stone-100" />
                )}
                <img
                  src={selectedPose.image}
                  alt={selectedPose.name}
                  className={`aspect-square w-full rounded-2xl object-contain ${imagesLoaded[selectedPose.id] ? '' : 'hidden'}`}
                  onLoad={() => setImagesLoaded(previous => ({ ...previous, [selectedPose.id]: true }))}
                  decoding="async"
                />
              </div>

              <div className="mx-auto max-w-xl px-6 pb-8 text-center">
                <p className="text-xs font-serif text-stone-400">动作提示整理中</p>
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 bg-white px-6 py-5">
                <button
                  type="button"
                  onClick={() => navigatePose('prev')}
                  className="flex items-center gap-1.5 text-stone-500 active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-sm font-serif">上一个</span>
                </button>
                <span className="text-xs font-serif text-stone-300">
                  {poseIndex + 1} / {visiblePoses.length}
                </span>
                <button
                  type="button"
                  onClick={() => navigatePose('next')}
                  className="flex items-center gap-1.5 text-stone-500 active:scale-95"
                >
                  <span className="text-sm font-serif">下一个</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
