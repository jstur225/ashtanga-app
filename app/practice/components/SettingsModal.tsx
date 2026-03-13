function SettingsModal({
  isOpen,
  onClose,
  profile,
  onSave,
  onOpenExport,
  onOpenImport,
  onExportLog,
  onClearData,
  user, // ⭐ 新增：用户信息（用于重置同步状态）
  practiceHistory, // ⭐ 新增
  practiceOptionsData, // ⭐ 新增
  initialSection, // ⭐ 新增：初始标签页（用于从云图标快速打开）
  onShowClearDataConfirm, // ⭐ 新增：显示清空数据确认弹窗
  onOpenLoginModal, // ⭐ 新增：打开登录弹窗
  onOpenRegisterModal, // ⭐ 新增：打开注册弹窗
}: {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  onOpenExport: () => void
  onOpenImport: () => void
  onExportLog?: () => void | Promise<void>
  onClearData?: () => void
  user?: any // ⭐ 新增
  practiceHistory?: PracticeRecord[] // ⭐ 新增
  practiceOptionsData?: PracticeOption[] // ⭐ 新增
  initialSection?: 'profile' | 'account' | 'data' // ⭐ 新增：初始标签页
  onShowClearDataConfirm?: () => void // ⭐ 新增
  onOpenLoginModal?: () => void // ⭐ 新增
  onOpenRegisterModal?: () => void // ⭐ 新增
}) {
  const [name, setName] = useState(profile.name)
  const [signature, setSignature] = useState(profile.signature)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const [activeSection, setActiveSection] = useState<'profile' | 'account' | 'data'>(initialSection || 'profile')
  const [isExportingLog, setIsExportingLog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 历史数据校准
  const [historicalDays, setHistoricalDays] = useState(profile.historical_days || 0)
  const [historicalAvgMinutes, setHistoricalAvgMinutes] = useState(profile.historical_avg_minutes || 0)

  // 当 profile 变化时同步历史数据
  useEffect(() => {
    setHistoricalDays(profile.historical_days || 0)
    setHistoricalAvgMinutes(profile.historical_avg_minutes || 0)
  }, [profile.historical_days, profile.historical_avg_minutes])

  // 当 initialSection 变化时，切换到对应标签页
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  useEffect(() => {
    setName(profile.name)
    setSignature(profile.signature)
    setAvatar(profile.avatar)
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件大小（限制5MB）
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      alert('图片太大啦，请选择5MB以内的图片')
      return
    }

    // 自动压缩图片
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // 计算压缩后的尺寸（最大200x200，头像显示足够）
        const MAX_DIMENSION = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = (height * MAX_DIMENSION) / width
            width = MAX_DIMENSION
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = (width * MAX_DIMENSION) / height
            height = MAX_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height)

        // 转换为base64，质量0.85
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatar(compressedDataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    try {
      onSave({
        ...profile,
        name,
        signature,
        avatar,
        historical_days: historicalDays,
        historical_avg_minutes: historicalAvgMinutes,
      })
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，图片可能太大，请尝试压缩后再上传')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">设置</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveSection('profile')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'profile'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                个人资料
              </button>
              <button
                onClick={() => setActiveSection('account')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'account'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                账户与同步
              </button>
              <button
                onClick={() => setActiveSection('data')}
                className={`flex-1 py-2 rounded-full text-sm font-serif transition-all ${
                  activeSection === 'data'
                    ? 'green-gradient backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                数据管理
              </button>
            </div>

            <div className="space-y-6">
              {activeSection === 'profile' && (
                <>
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-serif text-muted-foreground mb-1.5">昵称</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-serif text-muted-foreground mb-1.5">个人签名</label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* 历史练习数据校准 */}
                  <div className="pt-2">
                    {/* 标题行 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-sm font-serif text-foreground">过往练习</h3>
                      </div>
                      <span className="text-xs text-primary font-medium">
                        累计约 {Math.round(historicalDays * historicalAvgMinutes / 60)} 小时
                      </span>
                    </div>

                    {/* 左右两个独立卡片 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 左边：历史练习天数 */}
                      <div className="bg-white rounded-xl p-3 border border-stone-200">
                        <div className="text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={historicalDays === 0 ? '' : historicalDays}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              setHistoricalDays(val === '' ? 0 : parseInt(val))
                            }}
                            className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
                            placeholder="0"
                          />
                          <div className="text-[10px] text-muted-foreground font-serif mt-1">天数</div>
                        </div>
                      </div>

                      {/* 右边：平均每次时长 */}
                      <div className="bg-white rounded-xl p-3 border border-stone-200">
                        <div className="text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={historicalAvgMinutes === 0 ? '' : historicalAvgMinutes}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              setHistoricalAvgMinutes(val === '' ? 0 : parseInt(val))
                            }}
                            className="w-full bg-transparent text-2xl font-serif text-primary text-center focus:outline-none focus:ring-0 p-0 placeholder:text-primary/30"
                            placeholder="0"
                          />
                          <div className="text-[10px] text-muted-foreground font-serif mt-1">分钟/次</div>
                        </div>
                      </div>
                    </div>

                    {/* 说明文字 */}
                    <p className="text-[10px] text-muted-foreground/70 text-center font-serif mt-2">
                      💡 设置后，统计数据会以此为基础累加
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'account' && (
                <AccountBindingSection
                  profile={profile}
                  localData={{
                    records: practiceHistory,
                    options: practiceOptionsData
                  }}
                  onSyncComplete={(data) => {
                    // 同步完成后的回调
                    console.log('Sync completed:', data)
                    // ⭐ 更新本地 profile（如果云端有更新）
                    if (data?.profile) {
                      console.log('更新本地 profile:', data.profile)
                      updateProfile(data.profile)
                    }
                  }}
                  onClose={onClose}
                  onOpenLoginModal={onOpenLoginModal}
                  onOpenRegisterModal={onOpenRegisterModal}
                  onShowClearDataConfirm={onShowClearDataConfirm}
                  user={user}
                />
              )}

              {/* 临时注释：测试其他Tab是否正常
              {activeSection === 'account' && (
                <div className="text-center py-8">
                  <p>账户与同步功能开发中...</p>
                </div>
              )}
              */}

              {activeSection === 'data' && (
                <div className="space-y-3">
                  {/* 只有未登录时才显示备份提示 */}
                  {!user && (
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                      <p className="text-xs text-orange-600 font-serif leading-relaxed">
                        💡 未开启云端同步，建议定期备份数据，防止意外丢失
                      </p>
                    </div>
                  )}

                  {/* 导出按钮 */}
                  <button
                    onClick={onOpenExport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                        <Copy className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-serif text-foreground">复制数据胶囊</div>
                        <div className="text-[10px] text-muted-foreground font-serif">一键复制到剪贴板</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 导入按钮 */}
                  <button
                    onClick={onOpenImport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-50 text-red-500">
                        <Download className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-serif text-foreground">导入数据胶囊</div>
                        <div className="text-[10px] text-muted-foreground font-serif">从剪贴板恢复数据</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 导出日志按钮 */}
                  {onExportLog && (
                    <button
                      onClick={async () => {
                        setIsExportingLog(true)
                        try {
                          await onExportLog()
                        } finally {
                          setIsExportingLog(false)
                        }
                      }}
                      disabled={isExportingLog}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                          <Bug className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-serif text-foreground">
                            {isExportingLog ? '正在生成日志...' : '运行日志'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-serif">
                            {isExportingLog ? '请稍候，正在测试连接...' : '如遇问题，请复制本日志发给开发者'}
                          </div>
                        </div>
                      </div>
                      {isExportingLog ? (
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      )}
                    </button>
                  )}

                  {/* 清空数据按钮 - 三层安全防护 */}
                  {onClearData && (
                    <button
                      onClick={() => {
                        onShowClearDataConfirm && onShowClearDataConfirm()
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-all group border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-100 text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-serif text-red-700">清空数据胶囊</div>
                          <div className="text-[10px] text-red-600 font-serif">删除所有记录，恢复初始状态</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              )}

              <div className="pt-4">
                {/* 只在"个人资料"Tab显示保存按钮 */}
                {activeSection === 'profile' && (
                  <button
                    onClick={handleSave}
                    className="w-full py-4 rounded-full green-gradient text-white font-serif shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    保存设置
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Account & Sync Modal - 专门用于云图标点击


export default SettingsModal;