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
          return fetch(url, {
            ...options,
            // 增加超时时间到 120 秒（注册时需要等待邮件发送）
            signal: AbortSignal.timeout(120000),
          })
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
  date: string
  type: string
  duration: number
  notes: string
  photos: string[]
  breakthrough?: string | null
  deleted_at?: string | null // 软删除字段
}

export interface PracticeOption {
  id: string // UUID (string)
  user_id: string // 新增：用户ID，用于数据隔离
  created_at: string
  label: string  // 练习类型名称（中文）
  notes?: string  // 备注说明
  is_custom: boolean
}

export interface UserProfile {
  id: string // UUID (string)
  user_id: string // 新增：用户ID，关联到 auth.users
  created_at: string
  name: string
  signature: string
  avatar: string | null // ⚠️ 头像只存本地，不上传云端（存本地URL或null）
  phone?: string
  is_pro: boolean
  logged_in_devices?: Array<{ // 新增：已登录设备列表（最多1台）
    id: string
    name: string
    last_seen: string
  }>
}

// Tables
export const TABLES = {
  PRACTICE_RECORDS: 'practice_records',
  PRACTICE_OPTIONS: 'practice_options',
  USER_PROFILES: 'user_profiles',
} as const
