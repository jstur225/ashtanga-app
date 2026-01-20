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
    supabaseInstance = createClient(getSupabaseUrl(), getSupabaseAnonKey())
  }
  return supabaseInstance
}

// Export a Proxy that defers client creation until first use
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    return getSupabaseInstance()[prop as keyof ReturnType<typeof createClient>]
  }
})

// Database types
export interface PracticeRecord {
  id: number
  created_at: string
  date: string
  type: string
  duration: number
  notes: string
  photos: string[]
  breakthrough?: string
}

export interface PracticeOption {
  id: number
  created_at: string
  label: string
  label_zh: string
  notes?: string
  is_custom: boolean
}

export interface UserProfile {
  id: number
  created_at: string
  name: string
  signature: string
  avatar: string | null
  phone?: string
  email?: string
  is_pro: boolean
}

// Tables
export const TABLES = {
  PRACTICE_RECORDS: 'practice_records',
  PRACTICE_OPTIONS: 'practice_options',
  USER_PROFILES: 'user_profiles',
} as const
