import { createClient } from '@supabase/supabase-js'

// Environment variables
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return key
}

// Create Supabase client (lazy initialization using Proxy)
let supabaseInstance: ReturnType<typeof createClient> | null = null

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: {
        fetch: (url, options = {}) => {
          // ⭐ 兼容不支持 AbortSignal.timeout 的浏览器
          let signal: AbortSignal | undefined
          try {
            if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
              signal = (AbortSignal as any).timeout(120000)
            }
          } catch (e) {
            // 忽略错误，不使用 signal
          }

          const fetchOptions: any = {
            ...options,
          }
          if (signal) {
            fetchOptions.signal = signal
          }

          return fetch(url, fetchOptions)
        },
      },
    })
  }
  return supabaseInstance
}

// Export a Proxy that defers client creation until first use
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    return getSupabaseInstance()[prop as keyof ReturnType<typeof createClient>]
  }
})

// ==================== Service Role Client（绕过 RLS） ====================
// ⚠️ 仅在服务端 API 中使用，不要暴露给客户端

const getServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
  }
  return key
}

let supabaseServiceInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseServiceClient = () => {
  if (!supabaseServiceInstance) {
    supabaseServiceInstance = createClient(
      getSupabaseUrl(),
      getServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return supabaseServiceInstance
}

// Database types
export interface PracticeRecord {
  id: string // UUID (string)
  user_id: string // 新增：用户ID，用于数据隔离
  created_at: string
  updated_at: string // ⭐ 新增：最后修改时间，用于同步时判断最新版本
  date: string
  type: string
  duration: number
  notes: string
  photos: string[]
  breakthrough?: string | null
  start_time?: string | null // ⭐ 新增：练习开始时间，ISO 8601 格式（如 2026-03-05T11:53:00+08:00）
  deleted_at?: string | null // 软删除字段
  color_level?: number // 日历色阶等级 1-5（默认3，记录级覆盖类型的默认色）
}

export interface PracticeOption {
  id: string // UUID (string)
  user_id: string // 新增：用户ID，用于数据隔离
  created_at: string
  label: string  // 练习类型名称（中文）
  notes?: string  // 备注说明
  is_custom: boolean
  color_level?: number // 日历色阶等级 1-4（默认3=green-gradient-deep）
}

export interface UserProfile {
  id: string // UUID (string)
  user_id: string // 新增：用户ID，关联到 auth.users
  created_at: string
  updated_at: string // ⭐ 新增：最后修改时间，用于同步时判断最新版本
  name: string
  signature: string
  avatar: string | null // ⚠️ 头像只存本地，不上传云端（存本地URL或null）
  phone?: string
  // 新增：历史练习数据校准
  historical_days?: number // 历史练习天数
  historical_avg_minutes?: number // 历史平均每次时长（分钟）
}

// ⭐ 新增：照片元数据类型
export interface Photo {
  id: string // UUID
  user_id: string // 用户ID
  practice_record_id: string // 关联的练习记录ID
  oss_url: string // OSS 访问 URL
  oss_key: string // OSS 对象键（用于删除）
  file_size: number // 文件大小（字节）
  mime_type: string // 图片类型（如 image/jpeg）
  display_order: number // 显示顺序（支持多照片拖拽排序）
  uploaded_at: string // 上传时间
  deleted_at?: string | null // 软删除时间戳
  created_at: string // 创建时间
}

// ⭐ 新增：会员系统类型
export interface UserMembership {
  id: string
  user_id: string
  type: 'trial' | 'quarter' | 'year'
  started_at: string
  expires_at: string
  activated_by_code_id: string | null
  created_at: string
}

export interface UserMembershipStatus {
  user_id: string
  membership_type: 'trial' | 'quarter' | 'year' | null
  expires_at: string | null
  is_active: boolean
  days_remaining: number
}

// Tables
export const TABLES = {
  PRACTICE_RECORDS: 'practice_records',
  PRACTICE_OPTIONS: 'practice_options',
  USER_PROFILES: 'user_profiles',
  PHOTOS: 'photos',
  USER_MEMBERSHIPS: 'user_memberships',
  ACTIVATION_CODES: 'activation_codes',
  ANNOTATION_TYPES: 'annotation_types',
  CALENDAR_ANNOTATIONS: 'calendar_annotations',
} as const
