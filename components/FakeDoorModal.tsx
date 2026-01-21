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
}

export function FakeDoorModal({ type, isOpen, onClose }: FakeDoorModalProps) {
  const [votedCloud, setVotedCloud] = useLocalStorage('voted_cloud_sync', false)
  const [votedPro, setVotedPro] = useLocalStorage('voted_pro_features', false)
  const [proVotes, setProVotes] = useState(342)

  const isVoted = type === 'cloud' ? votedCloud : votedPro
  const currentVotes = type === 'pro' && votedPro ? proVotes + 1 : proVotes

  const handleVote = () => {
    if (isVoted) return

    if (type === 'cloud') {
      setVotedCloud(true)
      trackEvent('vote_for_cloud_sync')
      toast.success('收到你的心意！我们会加快进度，上线后第一时间通知您。')
    } else {
      setVotedPro(true)
      trackEvent('click_vote_pro_features')
      toast.success('收到你的心意！我们会加快进度，上线后第一时间通知您。')
    }
    
    // Close after a short delay to let user see the "voted" state
    setTimeout(onClose, 1500)
  }

  const content = {
    cloud: {
      title: '☁️ 云端同步和上传照片',
      subtitle: '高级版功能',
      desc: '害怕 **数据丢失**？云端备份功能（支持多设备同步）正在开发中。投一票，上线第一时间通知您。',
      icon: <Cloud className="w-12 h-12 text-primary" />,
      primaryBtn: votedCloud ? '已投票！上线时通知您' : '【我也想要，投一票】',
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-40px)] max-w-md bg-card rounded-[32px] p-8 z-[101] shadow-2xl border border-white/10"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="mb-6 p-4 rounded-full bg-primary/5">
                {activeContent.icon}
              </div>
              
              <h2 className="text-2xl font-serif text-foreground mb-2">
                {activeContent.title}
              </h2>
              <p className="text-primary font-serif text-sm mb-6">
                {activeContent.subtitle}
              </p>

              {type === 'cloud' ? (
                <div 
                  className="text-muted-foreground font-serif leading-relaxed mb-8"
                  dangerouslySetInnerHTML={{ __html: activeContent.desc || '' }}
                />
              ) : (
                <div className="w-full space-y-4 mb-8">
                  {activeContent.features?.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-left p-3 rounded-2xl bg-secondary/50 border border-white/5">
                      <div className="text-primary">{f.icon}</div>
                      <span className="text-sm font-serif text-foreground/80">{f.text}</span>
                      <CheckCircle2 className="w-4 h-4 text-primary ml-auto opacity-40" />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground font-serif pt-2">
                    {activeContent.footer}
                  </p>
                </div>
              )}

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleVote}
                  disabled={isVoted}
                  className={`w-full py-4 rounded-full font-serif transition-all duration-300 shadow-lg ${
                    isVoted 
                      ? 'bg-green-500 text-white cursor-default' 
                      : 'bg-gradient-to-br from-[rgba(45,90,39,0.85)] to-[rgba(74,122,68,0.7)] text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
                >
                  {activeContent.primaryBtn}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-full bg-secondary text-foreground font-serif transition-all hover:bg-secondary/80 active:scale-[0.98]"
                >
                  暂不需要
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
