'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

const WECHAT_ID = 'xiao519216978'

interface XiaohongshuInviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function XiaohongshuInviteModal({ isOpen, onClose }: XiaohongshuInviteModalProps) {
  const [copiedWx, setCopiedWx] = useState(false)

  const copyWechatId = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
      setCopiedWx(true)
      toast.success('微信号已复制')
      setTimeout(() => setCopiedWx(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = WECHAT_ID
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedWx(true)
      toast.success('微信号已复制')
      setTimeout(() => setCopiedWx(false), 2000)
    }
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
              className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(45,90,39,0.3)] w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* 图片 */}
              <div className="w-full">
                <Image
                  src="/xhs-join-group2.jpg"
                  alt="进群方法"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                  priority
                />
              </div>

              {/* 文案 + 按钮 */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-foreground font-serif leading-relaxed">
                  ✋汤友你好，欢迎进小红书交流群
                </p>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  如果使用上有建议或bug，可以直接联系我微信，后面会拉个微信汤友群~
                </p>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  🐸{WECHAT_ID}
                </p>

                {/* 联系按钮 */}
                <div className="pt-2">
                  <button
                    onClick={copyWechatId}
                    className="w-full py-3 px-4 rounded-full bg-[#07C160] text-white font-serif text-sm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {copiedWx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedWx ? '已复制' : '复制微信号'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
