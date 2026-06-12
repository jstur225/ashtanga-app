"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { POSE_CATEGORIES, POSES, type Pose } from '@/lib/pose-data'

interface PosesTabProps {
  onDetailOpen?: () => void
  onDetailClose?: () => void
}

export function PosesTab({ onDetailOpen, onDetailClose }: PosesTabProps) {
  const [activeCategory, setActiveCategory] = useState<string>('standing')
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null)
  const [poseIndex, setPoseIndex] = useState(0)

  const filteredPoses = POSES.filter(p => p.category === activeCategory)

  const openPose = (pose: Pose) => {
    const idx = filteredPoses.findIndex(p => p.id === pose.id)
    setPoseIndex(idx)
    setSelectedPose(pose)
    onDetailOpen?.()
  }

  const closePose = () => {
    setSelectedPose(null)
    onDetailClose?.()
  }

  const navigatePose = (direction: 'prev' | 'next') => {
    const newIdx = direction === 'prev'
      ? (poseIndex - 1 + filteredPoses.length) % filteredPoses.length
      : (poseIndex + 1) % filteredPoses.length
    setPoseIndex(newIdx)
    setSelectedPose(filteredPoses[newIdx])
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#faf8f5] to-white">
      {/* 分类导航 */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/90 backdrop-blur-sm border-b border-stone-100">
        <div className="flex px-4 pt-3 pb-2 gap-2">
          {POSE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-serif transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#5B7553] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 体式网格 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredPoses.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-stone-300 text-sm font-serif">
            即将上线
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredPoses.map(pose => (
              <button
                key={pose.id}
                onClick={() => openPose(pose)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all active:scale-95"
              >
                <img
                  src={pose.image}
                  alt={pose.name}
                  className="w-16 h-20 object-contain"
                />
                <span className="text-[11px] font-serif text-stone-700 text-center leading-tight">
                  {pose.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 详情页 */}
      <AnimatePresence>
        {selectedPose && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            {/* 顶部栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <button
                onClick={closePose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100"
              >
                <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
              <div className="text-center">
                <div className="text-sm font-serif font-medium text-stone-800">
                  {selectedPose.name}
                </div>
                <div className="text-[10px] text-stone-400 font-serif">
                  {selectedPose.sanskrit}
                </div>
              </div>
              <button
                onClick={closePose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {/* 体式图 */}
            <div className="flex-shrink-0 flex items-center justify-center py-8 bg-gradient-to-b from-[#faf8f5] to-white">
              <img
                src={selectedPose.image}
                alt={selectedPose.name}
                className="w-40 h-48 object-contain"
              />
            </div>

            {/* 步骤说明 */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="text-xs font-serif text-stone-500 mb-3">步骤</div>
              <ol className="space-y-2.5">
                {selectedPose.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm font-serif text-stone-700 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#5B7553]/10 text-[#5B7553] text-[10px] flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* 左右切换 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-white">
              <button
                onClick={() => navigatePose('prev')}
                className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-serif">上一个</span>
              </button>
              <span className="text-[10px] text-stone-300 font-serif">
                {poseIndex + 1} / {filteredPoses.length}
              </span>
              <button
                onClick={() => navigatePose('next')}
                className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <span className="text-xs font-serif">下一个</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
