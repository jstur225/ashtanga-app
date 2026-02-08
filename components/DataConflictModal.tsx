"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, HardDrive, Merge, ArrowLeft, AlertTriangle } from 'lucide-react'

interface DataConflictModalProps {
  isOpen: boolean
  localCount: number
  remoteCount: number
  onSelect: (strategy: 'remote' | 'local' | 'merge') => void
  onBack?: () => void
}

export function DataConflictModal({
  isOpen,
  localCount,
  remoteCount,
  onSelect,
  onBack
}: DataConflictModalProps) {
  const [showConfirmLocal, setShowConfirmLocal] = useState(false)

  // 判断是否需要警告（云端数据明显多于本地）
  const needWarning = remoteCount > localCount * 2
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {/* 禁止点击背景关闭 */}}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[60] p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-foreground font-bold">⚠️ 数据冲突</h2>
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-sm font-serif text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </button>
              )}
            </div>

            {/* 说明文字 */}
            <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
              <p className="text-sm font-serif text-orange-900 leading-relaxed">
                检测到您的本地和云端都有练习记录，请选择如何处理：
              </p>
            </div>

            {/* 数据对比 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-serif font-medium text-blue-900">云端数据</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{remoteCount}</p>
                <p className="text-xs text-blue-600 mt-1">条记录</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-serif font-medium text-green-900">本地数据</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{localCount}</p>
                <p className="text-xs text-green-600 mt-1">条记录</p>
              </div>
            </div>

            {/* 选项 */}
            <div className="space-y-3">
              {/* 智能合并（推荐） */}
              <button
                onClick={() => onSelect('merge')}
                className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Merge className="w-6 h-6" />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-serif text-base">智能合并</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-xs">推荐</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">保留两端不重复的记录</p>
                  </div>
                </div>
              </button>

              {/* 使用云端数据 */}
              <button
                onClick={() => onSelect('remote')}
                className="w-full p-4 bg-blue-50 text-blue-900 rounded-xl border-2 border-blue-200 hover:bg-blue-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="w-6 h-6 text-blue-600" />
                  <div className="text-left flex-1">
                    <span className="font-bold font-serif text-base">使用云端数据</span>
                    <p className="text-xs text-blue-600 mt-1">保留云端的 {remoteCount} 条记录</p>
                  </div>
                </div>
              </button>

              {/* 保留本地数据 */}
              {needWarning ? (
                // 危险模式：云端数据明显多于本地
                <button
                  onClick={() => setShowConfirmLocal(true)}
                  className="w-full p-4 bg-red-50 text-red-900 rounded-xl border-2 border-red-200 hover:bg-red-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div className="text-left flex-1">
                      <span className="font-bold font-serif text-base">保留本地数据</span>
                      <p className="text-xs text-red-600 mt-1">⚠️ 将删除云端 {remoteCount} 条记录</p>
                    </div>
                  </div>
                </button>
              ) : (
                // 正常模式：两端数据量差不多
                <button
                  onClick={() => onSelect('local')}
                  className="w-full p-4 bg-green-50 text-green-900 rounded-xl border-2 border-green-200 hover:bg-green-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-6 h-6 text-green-600" />
                    <div className="text-left flex-1">
                      <span className="font-bold font-serif text-base">保留本地数据</span>
                      <p className="text-xs text-green-600 mt-1">保留本地的 {localCount} 条记录</p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* 提示 */}
            <div className="mt-6 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-serif text-gray-600 leading-relaxed">
                💡 提示：选择后会覆盖目标数据，操作无法撤销。如果不确定，建议选择"智能合并"。
              </p>
            </div>

            {/* 二次确认对话框 */}
            <AnimatePresence>
              {showConfirmLocal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                    onClick={() => setShowConfirmLocal(false)}
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-[80] max-w-sm w-full shadow-2xl"
                  >
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-bold font-serif text-foreground mb-2">
                        ⚠️ 危险操作
                      </h3>
                      <p className="text-sm font-serif text-gray-600 mb-4 leading-relaxed">
                        云端有 <span className="font-bold text-red-600">{remoteCount}</span> 条记录，<br/>
                        本地只有 <span className="font-bold text-green-600">{localCount}</span> 条记录。
                      </p>
                      <p className="text-sm font-serif text-gray-600 mb-6 leading-relaxed">
                        确定要删除云端的 {remoteCount} 条记录，只保留本地的 {localCount} 条吗？
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowConfirmLocal(false)}
                          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-serif"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            setShowConfirmLocal(false)
                            onSelect('local')
                          }}
                          className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-serif"
                        >
                          确认删除
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
