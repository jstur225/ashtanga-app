"use client"

import { Lock, CheckCircle, Cloud } from 'lucide-react'

interface DataStorageNoticeProps {
  isCloudSynced: boolean
  email?: string
  syncStats?: {
    totalLocalRecords: number
    syncedRecords: number
    maxSyncRecords: number
    localOnlyCount: number
    hasLimitWarning: boolean
  }
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncTime?: number | null
}

// 隐藏邮箱地址的辅助函数
function maskEmail(email: string): string {
  if (!email) return ''

  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  // 用户名长度处理：前3位 + *** + 后3位
  if (username.length <= 6) {
    return username.slice(0, 3) + '***@' + domain
  }

  const prefix = username.slice(0, 3)
  const suffix = username.slice(-3)
  return `${prefix}****${suffix}@${domain}`
}

export function DataStorageNotice({ isCloudSynced, email, syncStats, syncStatus, lastSyncTime }: DataStorageNoticeProps) {
  if (isCloudSynced) {
    // 云端模式：整合成一个大框
    return (
      <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 border border-amber-200/50 rounded-xl p-3 mb-3">
        {/* 第一部分：已绑定邮箱 */}
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-medium font-serif text-foreground text-sm">已绑定邮箱</span>
          <span className="text-xs font-serif text-muted-foreground truncate" title={email || ''}>
            {maskEmail(email || '')}
          </span>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-amber-200/50 pt-3 mb-2 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-green-600" />
          <h3 className="font-medium font-serif text-foreground text-sm">云端同步已开启</h3>
        </div>

        {/* 第二部分：提醒内容 */}
        <ul className="text-xs font-serif text-muted-foreground space-y-0.5 mb-3">
          <li>• 当前版本1个账号仅可登录1个设备</li>
          <li>• 换设备或重装浏览器觉察数据不丢失</li>
        </ul>

        {/* 第三部分：同步进度 */}
        <div className="border-t border-amber-200/50 pt-2">
          {/* 状态行：灯 + 最近同步时间 + 已同步记录数 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* 状态灯 */}
              <div className={`rounded-full w-1.5 h-1.5 flex-shrink-0 ${
                syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                syncStatus === 'error' ? 'bg-red-400' :
                syncStatus === 'success' || lastSyncTime ? 'bg-green-400' :
                'bg-stone-400'
              }`} />
              <span className="text-xs font-serif text-muted-foreground">
                最近同步时间 <span className="italic">{lastSyncTime ? new Date(lastSyncTime).toLocaleString('zh-CN') : '尚未同步'}</span>
              </span>
            </div>
            {/* 已同步记录数 - 右对齐 */}
            <span className="text-xs font-serif text-muted-foreground italic">
              已同步 {syncStats?.syncedRecords || 0} 条记录
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 本地模式：琥珀色提示（温和不焦虑）
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex-1">
        <h3 className="font-bold font-serif text-amber-800 mb-2 text-sm">📱 当前数据仅保存在浏览器本地</h3>
        <p className="text-xs font-serif text-amber-700 leading-relaxed">
          如删除浏览器或清除浏览器缓存，数据无法找回，建议开启云端同步功能。
        </p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200">
          <Lock className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-serif text-amber-600">
            开启云同步后，数据仅供您个人跨设备访问。
          </p>
        </div>
      </div>
    </div>
  )
}
