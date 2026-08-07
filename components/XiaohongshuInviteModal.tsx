'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

// 版本号 - 每次更新文案时修改此版本号
const XIAOHONGSHU_GROUP_TEXT = '9【一键复制，小红书等你】 9月4日前有效，"🆓熬汤日记App交流群"邀你一起聊 UA4409 :/#p🐨🥖🐡🐧🐟🤔😜🥯🍈😚🍖🌭'
const WECHAT_ID = 'xiao519216978'

interface XiaohongshuInviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function XiaohongshuInviteModal({ isOpen, onClose }: XiaohongshuInviteModalProps) {
  const [copiedXhs, setCopiedXhs] = useState(false)
  const [copiedWx, setCopiedWx] = useState(false)

  const copyToClipboard = async (text: string, type: 'xhs' | 'wx') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'xhs') {
        setCopiedXhs(true)
        toast.success('小红书群链接已复制')
        setTimeout(() => setCopiedXhs(false), 2000)
      } else {
        setCopiedWx(true)
        toast.success('微信号已复制')
        setTimeout(() => setCopiedWx(false), 2000)
      }
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      if (type === 'xhs') {
        setCopiedXhs(true)
        toast.success('小红书群链接已复制')
        setTimeout(() => setCopiedXhs(false), 2000)
      } else {
        setCopiedWx(true)
        toast.success('微信号已复制')
        setTimeout(() => setCopiedWx(false), 2000)
      }
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

                {/* 双按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => copyToClipboard(XIAOHONGSHU_GROUP_TEXT, 'xhs')}
                    className="flex-1 py-3 px-2 rounded-full bg-[#FF2442] text-white font-serif text-xs transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {copiedXhs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedXhs ? '已复制' : '复制小红书群链接'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(WECHAT_ID, 'wx')}
                    className="flex-1 py-3 px-2 rounded-full bg-[#07C160] text-white font-serif text-xs transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5 whitespace-nowrap"
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
