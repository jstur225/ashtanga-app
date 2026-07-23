"use client"

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { POSE_SECTIONS, POSES, type Pose, type PoseSectionId } from '@/lib/pose-data'

interface PosesTabProps {
  onDetailOpen?: () => void
  onDetailClose?: () => void
}

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function PosesTab({ onDetailOpen, onDetailClose }: PosesTabProps) {
  const [activeSection, setActiveSection] = useState<PoseSectionId>('surya-a')
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null)
  const [poseIndex, setPoseIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({})

  const visiblePoses = useMemo(() => {
    const query = normalizeSearch(searchQuery.trim())
    const candidates = query ? POSES : POSES.filter(pose => pose.section === activeSection)
    if (!query) return candidates

    return candidates.filter(pose => [
      pose.name,
      pose.sanskrit,
      pose.cueName ?? '',
      ...pose.aliases,
    ].some(value => normalizeSearch(value).includes(query)))
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
    <div className="relative flex h-full flex-col bg-gradient-to-b from-[#faf8f5] to-white">
      <div className="absolute inset-x-0 top-2 z-10 mx-3 rounded-[24px] border border-white/30 bg-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[8px]">
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
                    : 'text-stone-500 hover:bg-white/20'
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
              className="w-full rounded-full border border-white/30 bg-white/20 py-2 pl-9 pr-3 text-xs font-serif text-stone-600 outline-none backdrop-blur-[8px] placeholder:text-stone-400 focus:border-[#5B7553]/20 focus:bg-white/30"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[7.5rem]">
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
                <div className="aspect-square w-full overflow-hidden rounded-xl">
                  <img
                    src={pose.thumbnail}
                    alt={pose.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="mt-1.5 block line-clamp-2 min-h-[2.5em] text-center text-[11px] leading-[1.25] font-serif text-stone-600">
                  {pose.section === 'standing' ? pose.cueName : pose.name}
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
            <button
              type="button"
              onClick={closePose}
              aria-label="返回体式库"
              className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-stone-600 shadow-sm backdrop-blur-md active:scale-95"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#faf8f5] to-white pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
              <div className="relative aspect-square w-full">
                {!imagesLoaded[selectedPose.id] && (
                  <div className="absolute inset-0 animate-pulse bg-stone-100" />
                )}
                <img
                  src={selectedPose.image}
                  alt={selectedPose.name}
                  className={`block h-full w-full object-contain ${imagesLoaded[selectedPose.id] ? '' : 'invisible'}`}
                  onLoad={() => setImagesLoaded(previous => ({ ...previous, [selectedPose.id]: true }))}
                  decoding="async"
                />
              </div>

              <div className="px-6 pb-8 pt-5">
                <h2 className="text-xl font-medium font-serif text-stone-800">
                  {selectedPose.name}
                </h2>
                {selectedPose.cueName ? (
                  <>
                    <p className="mt-1 text-sm font-serif text-stone-500">
                      {selectedPose.cueName}
                    </p>
                    <div className="mt-7 grid grid-cols-2 gap-5">
                      {selectedPose.vinyasaCount && (
                        <div>
                          <p className="text-[11px] tracking-[0.18em] text-stone-400">VINYASA 总数</p>
                          <p className="mt-1.5 text-base font-serif text-stone-700">
                            {selectedPose.vinyasaCount}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] tracking-[0.18em] text-stone-400">凝视点</p>
                        <p className="mt-1.5 text-base font-serif text-stone-700">
                          {selectedPose.drishti}
                        </p>
                        <p className="mt-0.5 text-xs font-serif text-stone-400">
                          {selectedPose.drishtiSanskrit}
                        </p>
                      </div>
                    </div>
                    {(selectedPose.breath || selectedPose.holdBreaths) && (
                      <div className="mt-5">
                        <p className="text-[11px] tracking-[0.18em] text-stone-400">呼吸</p>
                        <p className="mt-1.5 text-base font-serif text-stone-700">
                          {selectedPose.breath}
                          {selectedPose.holdBreaths ? `，停留 ${selectedPose.holdBreaths} 次呼吸` : ''}
                        </p>
                      </div>
                    )}
                    {selectedPose.action && (
                      <div className="mt-7">
                        <p className="text-[11px] tracking-[0.18em] text-stone-400">动作解析</p>
                        <p className="mt-2 text-[15px] leading-7 font-serif text-stone-700">
                          {selectedPose.action}
                        </p>
                      </div>
                    )}
                    {selectedPose.vinyasaSteps && (
                      <div className="mt-8">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[11px] tracking-[0.18em] text-stone-400">VINYASA 分解</p>
                          <p className="text-[10px] font-serif text-stone-300">绿色为体位法位置</p>
                        </div>
                        <div className="space-y-2.5">
                          {selectedPose.vinyasaSteps.map((vinyasaStep, index) => (
                            <div
                              key={`${vinyasaStep.count}-${index}`}
                              data-vinyasa-step={vinyasaStep.count}
                              data-asana={vinyasaStep.isAsana ? 'true' : 'false'}
                              className={`rounded-2xl px-4 py-3 ${
                                vinyasaStep.isAsana
                                  ? 'bg-[#5B7553]/10 ring-1 ring-[#5B7553]/10'
                                  : 'bg-white/70 ring-1 ring-stone-100'
                              }`}
                            >
                              <div className="flex items-baseline gap-3">
                                <span className={`min-w-8 text-sm font-medium font-serif ${
                                  vinyasaStep.isAsana ? 'text-[#4D6647]' : 'text-stone-500'
                                }`}>
                                  {vinyasaStep.count === '—' ? '-' : `V${vinyasaStep.count}`}
                                </span>
                                <span className="text-xs font-serif text-stone-400">
                                  {vinyasaStep.breath}
                                </span>
                                {vinyasaStep.drishti && (
                                  <span className="ml-auto text-xs font-serif text-stone-400">
                                    看{vinyasaStep.drishti}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm leading-6 font-serif text-stone-700">
                                {vinyasaStep.action}
                              </p>
                              {vinyasaStep.holdBreaths && (
                                <p className="mt-1.5 text-xs font-serif text-[#5B7553]">
                                  停留 {vinyasaStep.holdBreaths} 次呼吸
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-serif text-stone-400">
                      {selectedPose.sanskrit}
                    </p>
                    <p className="mt-6 text-xs font-serif text-stone-400">动作提示整理中</p>
                  </>
                )}
              </div>

              <p className="mx-6 border-t border-stone-100 px-1 pb-7 pt-5 text-xs leading-5 font-serif text-stone-400">
                体式库以动作解析为主，与实际练习中的串联有所差别。内容来源为网络资料人工整理，如果有错漏，可联系开发者修正，Namaste🙏
              </p>
            </div>

              <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-5 rounded-full bg-white/85 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => navigatePose('prev')}
                  aria-label="上一个体式"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-w-[3.75rem] whitespace-nowrap text-center text-sm font-serif text-stone-400">
                  {poseIndex + 1} / {visiblePoses.length}
                </span>
                <button
                  type="button"
                  onClick={() => navigatePose('next')}
                  aria-label="下一个体式"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
