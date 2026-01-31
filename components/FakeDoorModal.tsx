'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cloud, Star, CheckCircle2, Trophy } from 'lucide-react'
import { useLocalStorage } from 'react-use'
import { trackEvent } from '@/lib/analytics'
import { toast } from 'sonner'

interface FakeDoorModalProps {
  type: 'cloud' | 'pro'
  isOpen: boolean
  onClose: () => void
  onVote?: () => void
}

export function FakeDoorModal({ type, isOpen, onClose, onVote }: FakeDoorModalProps) {
  const [votedCloud, setVotedCloud] = useLocalStorage('voted_cloud_sync', false)
  const [votedPro, setVotedPro] = useLocalStorage('voted_pro_features', false)
  const [proVotes, setProVotes] = useState(342)

  const isVoted = type === 'cloud' ? votedCloud : votedPro
  const currentVotes = type === 'pro' && votedPro ? proVotes + 1 : proVotes

  const handleVote = (choice?: 'sync' | 'photo' | 'both') => {
    if (isVoted) return

    if (type === 'cloud') {
      setVotedCloud(true)
      trackEvent('vote_for_cloud_sync', {
        vote: 'yes',
        choice: choice!
      })
      toast.success('收到你的心意啦~')
      onVote?.()
    } else {
      setVotedPro(true)
      trackEvent('vote_for_cloud_sync', { vote: 'yes' })
      toast.success('收到你的心意啦~')
    }

    // Close after a short delay to let user see the "voted" state
    setTimeout(onClose, 1500)
  }

  const handleSecondary = () => {
    trackEvent('vote_for_cloud_sync', {
      vote: 'no',
      choice: 'none'
    })
    toast.success('收到你的心意啦~')
    onClose()
  }

  const content = {
    cloud: {
      title: '☁️云端同步📷上传照片',
      subtitle: '害怕日记丢失？想上传当天练习的照片？',
      desc: '考虑开发这些功能，你需要吗？请投一票~',
      icon: <Cloud className="w-12 h-12 text-primary" />,
      primaryBtn: votedCloud ? '已投票！' : '【我想要，投一票】',
      secondaryBtn: votedCloud ? '收到啦！' : '暂不需要',
    },
    pro: {
      title: '解锁专业版 (Pro Features)',
      subtitle: '让您的阿斯汤加练习更进一步。',
      features: [
        { icon: <Cloud className="w-5 h-5" />, text: '云端数据同步 (永久保存，多设备同步)' },
        { icon: <Star className="w-5 h-5" />, text: '体式照片日记 (视觉化记录你的进步)' },
        { icon: <Trophy className="w-5 h-5" />, text: '进阶数据分析 (查看长周期趋势)' },
      ],
      footer: `功能开发中... 已有 ${currentVotes} 人投票期待上线。`,
      icon: <Star className="w-12 h-12 text-yellow-500" />,
      primaryBtn: votedPro ? '已投票！上线时通知您' : '我也想要！(Vote +1)',
      secondaryBtn: votedPro ? '收到啦！' : '暂不需要',
    }
  }

  const activeContent = content[type]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md max-h-[85vh] bg-card rounded-[24px] z-[101] shadow-2xl border border-white/10 overflow-hidden"
          >
            {/* 滚动内容区域 */}
            <div className="overflow-y-auto max-h-[85vh] p-6">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 rounded-full bg-primary/5">
                  {activeContent.icon}
                </div>

                <h2 className="text-xl font-serif text-foreground mb-1">
                  {activeContent.title}
                </h2>
                <p className="text-primary font-serif text-xs mb-4">
                  {activeContent.subtitle}
                </p>

                {type === 'cloud' ? (
                  <div
                    className="text-muted-foreground font-serif leading-relaxed mb-6 text-sm"
                    dangerouslySetInnerHTML={{ __html: activeContent.desc || '' }}
                  />
                ) : (
                  <div className="w-full space-y-2 mb-6">
                    {activeContent.features?.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-left p-2 rounded-xl bg-secondary/50 border border-white/5">
                        <div className="text-primary">{f.icon}</div>
                        <span className="text-xs font-serif text-foreground/80">{f.text}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto opacity-40" />
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground font-serif pt-1">
                      {activeContent.footer}
                    </p>
                  </div>
                )}

                {type === 'cloud' ? (
                  // 云端同步：4个垂直按钮
                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => handleVote('sync')}
                      disabled={isVoted}
                      className={`w-full py-3 rounded-full font-serif transition-all duration-300 shadow-lg text-sm ${
                        isVoted
                          ? 'bg-green-500 text-white cursor-default'
                          : 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                    >
                      {isVoted ? '已收到投票' : '【想要】云端数据同步'}
                    </button>

                    <button
                      onClick={() => handleVote('photo')}
                      disabled={isVoted}
                      className={`w-full py-3 rounded-full font-serif transition-all duration-300 shadow-lg text-sm ${
                        isVoted
                          ? 'bg-green-500 text-white cursor-default'
                          : 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                    >
                      {isVoted ? '已收到投票' : '【想要】体式照片上传'}
                    </button>

                    <button
                      onClick={() => handleVote('both')}
                      disabled={isVoted}
                      className={`w-full py-3 rounded-full font-serif transition-all duration-300 shadow-lg text-sm ${
                        isVoted
                          ? 'bg-green-500 text-white cursor-default'
                          : 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                    >
                      {isVoted ? '已收到投票' : '【全都要】同步 + 照片'}
                    </button>

                    <button
                      onClick={handleSecondary}
                      className="w-full py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98] text-sm"
                    >
                      {isVoted ? '收到啦' : '暂时不需要'}
                    </button>
                  </div>
                ) : (
                  // pro模式：保持原有双按钮布局（禁止修改）
                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => handleVote()}
                      disabled={isVoted}
                      className={`w-full py-3 rounded-full font-serif transition-all duration-300 shadow-lg text-sm ${
                        isVoted
                          ? 'bg-green-500 text-white cursor-default'
                          : 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                    >
                      {activeContent.primaryBtn}
                    </button>
                    <button
                      onClick={handleSecondary}
                      className="w-full py-3 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98] text-sm"
                    >
                      {activeContent.secondaryBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
