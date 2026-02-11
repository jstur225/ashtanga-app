"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, HardDrive, Merge, AlertTriangle } from 'lucide-react'

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal - 居中显示 */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-[60] p-4"
          >
            <div className="bg-card rounded-2xl p-4 w-full max-w-sm shadow-xl">
              {/* 标题 */}
              <div className="mb-3">
                <h2 className="text-sm font-serif text-foreground font-medium">数据冲突</h2>
              </div>

              {/* 说明 + 数据对比 */}
              <div className="mb-3 p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-serif text-muted-foreground mb-2">
                  本地和云端都有数据，请选择处理方式：
                </p>
                <div className="flex items-center gap-4 text-xs font-serif">
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-muted-foreground">云端</span>
                    <span className="font-medium text-foreground">{remoteCount}</span>
                    <span className="text-muted-foreground">条</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-muted-foreground">本地</span>
                    <span className="font-medium text-foreground">{localCount}</span>
                    <span className="text-muted-foreground">条</span>
                  </div>
                </div>
              </div>

              {/* 选项 */}
              <div className="space-y-2">
                {/* 智能合并（推荐）- 绿色毛玻璃 */}
                <button
                  onClick={() => onSelect('merge')}
                  className="w-full p-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] flex items-center gap-3"
                >
                  <Merge className="w-4 h-4" />
                  <div className="flex-1 text-left">
                    <span className="text-xs font-medium font-serif">智能合并</span>
                    <span className="text-xs opacity-80 ml-2">推荐</span>
                  </div>
                  <span className="text-xs opacity-80">保留两端不重复记录</span>
                </button>

                {/* 使用云端数据 - 蓝色边框 */}
                <button
                  onClick={() => onSelect('remote')}
                  className="w-full p-3 bg-blue-50 text-blue-900 rounded-xl border-2 border-blue-300 flex items-center gap-3"
                >
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-serif">使用云端数据</span>
                  <span className="text-xs text-blue-600 ml-auto">{remoteCount} 条</span>
                </button>

                {/* 保留本地数据 */}
                {needWarning ? (
                  <button
                    onClick={() => setShowConfirmLocal(true)}
                    className="w-full p-3 bg-red-50 text-red-900 rounded-xl border-2 border-red-300 flex items-center gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-serif">保留本地数据</span>
                    <span className="text-xs text-red-600 ml-auto">将删除云端 {remoteCount} 条</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelect('local')}
                    className="w-full p-3 bg-muted text-foreground rounded-xl border-2 border-border flex items-center gap-3"
                  >
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-serif">保留本地数据</span>
                    <span className="text-xs text-muted-foreground ml-auto">{localCount} 条</span>
                  </button>
                )}
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
                      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl p-5 z-[80] max-w-xs w-full shadow-2xl"
                    >
                      <div className="text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <h3 className="text-sm font-serif text-foreground font-medium mb-2">
                          确认删除云端数据？
                        </h3>
                        <p className="text-xs font-serif text-muted-foreground mb-4">
                          云端 {remoteCount} 条，本地 {localCount} 条，操作不可撤销
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowConfirmLocal(false)}
                            className="flex-1 px-3 py-2 bg-muted text-foreground rounded-xl text-xs font-serif"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              setShowConfirmLocal(false)
                              onSelect('local')
                            }}
                            className="flex-1 px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-serif"
                          >
                            确认
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
