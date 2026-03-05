'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Image from 'next/image'

// 版本号 - 每次更新文案时修改此版本号
export const INVITE_VERSION = 'v2'

interface XiaohongshuInviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function XiaohongshuInviteModal({ isOpen, onClose }: XiaohongshuInviteModalProps) {
  const handleJoin = () => {
    // 直接关闭弹窗
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(45,90,39,0.3)] w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-serif text-foreground">🐸 招募第一批"股东"</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* 内容区 */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  现在的「熬汤日记」还很简陋
                </p>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  诚邀各位"精神股东"进群指导
                </p>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  你的意见，决定了App长什么样。
                </p>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  入股不亏，垫子上见！🧘‍♂️
                </p>

                {/* 进群方法图片 */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/进群方法.png"
                    alt="进群方法"
                    width={400}
                    height={300}
                    className="w-full h-auto"
                    priority
                  />
                </div>

                {/* 加入按钮 */}
                <button
                  onClick={handleJoin}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  马上去加入
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
