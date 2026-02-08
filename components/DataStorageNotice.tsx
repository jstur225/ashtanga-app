"use client"

import { Smartphone, Lock } from 'lucide-react'

interface DataStorageNoticeProps {
  isCloudSynced: boolean
}

export function DataStorageNotice({ isCloudSynced }: DataStorageNoticeProps) {
  if (isCloudSynced) {
    // 云端模式：金色米白色渐变
    return (
      <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl p-4 mb-6">
        <div>
          <h3 className="font-bold text-foreground mb-1">✅ 云端同步已开启</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 当前版本1个账号仅可登录1个设备</li>
            <li>• 最多同步50条觉察记录（由远及近）</li>
            <li>• 换设备或重装浏览器觉察数据不丢失</li>
          </ul>
        </div>
      </div>
    )
  }

  // 本地模式：琥珀色提示（温和不焦虑）
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex-1">
        <h3 className="font-bold text-amber-800 mb-2">📱 当前数据仅保存在浏览器本地</h3>
        <p className="text-sm text-amber-700 leading-relaxed">
          如删除浏览器或清除浏览器缓存，数据无法找回，建议开启云端同步功能。
        </p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200">
          <Lock className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-600">
            开启云同步后，数据仅供您个人跨设备访问。
          </p>
        </div>
      </div>
    </div>
  )
}
