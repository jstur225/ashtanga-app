'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy } from 'lucide-react'
import { toast } from 'sonner'

// 复制文案（固定内容）
const XIAOHONGSHU_INVITE_TEXT =
  '0【全选复制，xiaohongshu等你归来】 3月1日前可入，"🆓熬汤日记内测交流群"趣味空间 MF8158 :/#b🤔🍉🐂😗🐯😉🐯🥭😌😚🐶🐭'

// 小红书搜索链接（使用群号）
const XIAOHONGSHU_SEARCH_URL = 'https://www.xiaohongshu.com/search_result?keyword=MF8158'

interface XiaohongshuInviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function XiaohongshuInviteModal({ isOpen, onClose }: XiaohongshuInviteModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyAndJump = async () => {
    try {
      // 1. 复制文案到剪贴板
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(XIAOHONGSHU_INVITE_TEXT)
      } else {
        // 降级方案（兼容旧浏览器）
        const textArea = document.createElement('textarea')
        textArea.value = XIAOHONGSHU_INVITE_TEXT
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      // 2. 显示成功提示
      setCopied(true)
      toast.success('✅ 已复制，即将跳转到小红书...', {
        duration: 2000,
        position: 'top-center',
      })

      // 3. 延迟跳转（让用户看到提示）
      setTimeout(() => {
        window.open(XIAOHONGSHU_SEARCH_URL, '_blank')
      }, 1000)

    } catch (err) {
      console.error('复制失败:', err)
      toast.error('❌ 复制失败，请手动复制', {
        duration: 3000,
        position: 'top-center',
      })
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

                {/* 复制按钮 */}
                <button
                  onClick={handleCopyAndJump}
                  disabled={copied}
                  className="w-full py-4 rounded-full bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white font-serif transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? '已复制，跳转中...' : '一键复制去加入！'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
