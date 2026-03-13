"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Database, Cloud, Download, Upload, Camera } from "lucide-react"
import { toast } from 'sonner'
import type { UserProfile } from "@/hooks/usePracticeData"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  onOpenExport: () => void
  onOpenImport: () => void
  user?: any
  initialSection?: 'profile' | 'account' | 'data'
}

function SettingsModal({
  isOpen,
  onClose,
  profile,
  onSave,
  onOpenExport,
  onOpenImport,
  user,
  initialSection
}: SettingsModalProps) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [activeSection, setActiveSection] = useState(initialSection || 'profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const updatedProfile: UserProfile = {
      ...profile,
      name,
      signature,
      avatar
    }
    onSave(updatedProfile)
    onClose()
    toast.success('设置已保存')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">设置</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex h-[60vh]">
              <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4">
                <nav className="space-y-2">
                  <button onClick={() => setActiveSection('profile')} className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-2">
                    <User className="w-4 h-4" /> <span>个人资料</span>
                  </button>
                  <button onClick={() => setActiveSection('account')} className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-2">
                    <Cloud className="w-4 h-4" /> <span>云同步</span>
                  </button>
                  <button onClick={() => setActiveSection('data')} className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-2">
                    <Database className="w-4 h-4" /> <span>数据管理</span>
                  </button>
                </nav>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {avatar ? <img src={avatar} alt="头像" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-400" />}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full">
                          <Camera className="w-4 h-4" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">昵称</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">个性签名</label><textarea value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full px-4 py-2 border rounded-lg" rows={3} /></div>
                  </div>
                )}
                {activeSection === 'account' && <div className="space-y-6">{user ? <p>已登录</p> : <p>未登录</p>}</div>}
                {activeSection === 'data' && (
                  <div className="space-y-6">
                    <button onClick={onOpenExport} className="w-full px-4 py-3 border rounded-lg flex items-center gap-3">
                      <Download className="w-5 h-5" /> <span>导出数据</span>
                    </button>
                    <button onClick={onOpenImport} className="w-full px-4 py-3 border rounded-lg flex items-center gap-3">
                      <Upload className="w-5 h-5" /> <span>导入数据</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={onClose} className="px-6 py-2 border rounded-lg">取消</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-500 text-white rounded-lg">保存</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


export default SettingsModal;