import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
