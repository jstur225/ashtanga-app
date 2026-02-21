import { supabase, TABLES, PracticeRecord, PracticeOption, UserProfile } from './supabase'

// ==================== Practice Records ====================

// 获取所有练习记录（添加 user_id 过滤 + 软删除过滤）
export async function getAllPracticeRecords(userId?: string): Promise<PracticeRecord[]> {
  try {
    let query = supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('*')
      .is('deleted_at', null) // ⚠️ 只查询未删除的记录

    // ⚠️ 重要：只有在提供了 userId 时才应用用户过滤
    // 未登录时（无 userId），不应用过滤，返回所有数据（兼容现有逻辑）
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) {
      // Silently log error, don't break the app
      console.warn('Supabase fetch error (will retry):', error.message)
      return []
    }

    return data || []
  } catch (err) {
    // Network error or other issue
    console.warn('Network error, using local state')
    return []
  }
}

// 根据日期获取练习记录
export async function getPracticeRecordsByDateRange(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<PracticeRecord[]> {
  let query = supabase
    .from(TABLES.PRACTICE_RECORDS)
    .select('*')
    .is('deleted_at', null) // ⚠️ 只查询未删除的记录
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // ⚠️ 只有在提供了 userId 时才应用用户过滤
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching practice records by date range:', error)
    return []
  }

  return data || []
}

// 创建练习记录
export async function createPracticeRecord(
  record: Omit<PracticeRecord, 'id' | 'created_at' | 'deleted_at'>
): Promise<PracticeRecord | null> {
  const { data, error } = await supabase
    .from(TABLES.PRACTICE_RECORDS)
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error('Error creating practice record:', JSON.stringify(error, null, 2))
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return null
  }

  return data
}

// 更新练习记录
export async function updatePracticeRecord(
  id: string, // 改：number → string (UUID)
  updates: Partial<Omit<PracticeRecord, 'id' | 'created_at' | 'deleted_at'>>
): Promise<PracticeRecord | null> {
  const { data, error } = await supabase
    .from(TABLES.PRACTICE_RECORDS)
    .update({ ...updates, updated_at: new Date().toISOString() }) // ⚠️ 自动更新 updated_at
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating practice record:', error)
    return null
  }

  return data
}

// 删除练习记录（软删除：通过 API 设置 deleted_at）
export async function deletePracticeRecord(id: string): Promise<boolean> { // 改：number → string
  try {
    // 1. 先获取记录的照片列表（用于删除 Storage 中的文件）
    const { data: record } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('photos')
      .eq('id', id)
      .single()

    if (record && record.photos && record.photos.length > 0) {
      console.log('准备删除照片:', record.photos.length, '张')

      // 2. 删除Storage中的照片文件
      const { deletePhoto } = await import('./storage')

      for (const photoUrl of record.photos) {
        // 从URL中提取文件路径（相对于bucket）
        // URL格式: https://xxx.supabase.co/storage/v1/object/public/practice-photos/path/to/file.jpg
        try {
          const url = new URL(photoUrl)
          const pathParts = url.pathname.split('/')

          // 找到bucket名称和文件路径
          // pathname格式: /storage/v1/object/public/practice-photos/2026-01/2026-01-19/xxx.jpg
          const publicIndex = pathParts.indexOf('public')
          if (publicIndex !== -1 && publicIndex + 2 < pathParts.length) {
            // publicIndex + 1 是bucket名称(practice-photos)
            // publicIndex + 2 之后才是文件路径
            const filePath = pathParts.slice(publicIndex + 2).join('/') // 2026-01/2026-01-19/xxx.jpg

            console.log('[Database] 删除Storage文件:', filePath)
            await deletePhoto(filePath)
          }
        } catch (err) {
          console.error('[Database] 删除照片失败:', photoUrl, err)
          // 继续删除其他照片，不中断流程
        }
      }
    }

    // 3. 通过 API 软删除数据库记录（绕过 RLS）
    const response = await fetch('/api/sync/delete-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: id }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('Error deleting practice record:', result.error)
      return false
    }

    console.log('[Database] ✅ 记录已软删除')
    return true
  } catch (err) {
    console.error('Unexpected error in deletePracticeRecord:', err)
    return false
  }
}

// ==================== Practice Options ====================

// 获取所有练习选项（包括默认和自定义，添加 user_id 过滤）
export async function getAllPracticeOptions(userId?: string): Promise<PracticeOption[]> {
  let query = supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .select('*')
    .order('is_custom', { ascending: true })

  // ⚠️ 只有在提供了 userId 时才应用用户过滤
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching practice options:', error)
    return []
  }

  return data || []
}

// 创建自定义练习选项
export async function createPracticeOption(
  option: Omit<PracticeOption, 'id' | 'created_at'>
): Promise<PracticeOption | null> {
  const { data, error } = await supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .insert(option)
    .select()
    .single()

  if (error) {
    console.error('Error creating practice option:', error)
    return null
  }

  return data
}

// 更新练习选项
export async function updatePracticeOption(
  id: string, // 改：number → string
  updates: Partial<Omit<PracticeOption, 'id' | 'created_at'>>
): Promise<PracticeOption | null> {
  const { data, error } = await supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating practice option:', error)
    return null
  }

  return data
}

// 删除练习选项
export async function deletePracticeOption(id: string): Promise<boolean> { // 改：number → string
  const { error } = await supabase
    .from(TABLES.PRACTICE_OPTIONS)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting practice option:', error)
    return false
  }

  return true
}

// ==================== User Profile ====================

// 获取用户信息（添加 user_id 过滤）
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  try {
    let query = supabase
      .from(TABLES.USER_PROFILES)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() // 使用 maybeSingle() 而不是 single()，避免空记录报错

    // ⚠️ 只有在提供了 userId 时才应用用户过滤
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user profile:', JSON.stringify(error))
      return null
    }

    return data
  } catch (err) {
    console.error('Error fetching user profile:', err)
    return null
  }
}

// 创建用户信息
export async function createUserProfile(
  profile: Omit<UserProfile, 'id' | 'created_at'>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLES.USER_PROFILES)
    .insert(profile)
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }

  return data
}

// 更新用户信息
export async function updateUserProfile(
  id: string, // 改：number → string
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'user_id'>>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLES.USER_PROFILES)
    .update({ ...updates, updated_at: new Date().toISOString() }) // ⚠️ 自动更新 updated_at
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

// ==================== Statistics ====================

// 获取统计数据
export async function getPracticeStatistics() {
  const records = await getAllPracticeRecords()

  if (records.length === 0) {
    return {
      totalDays: 0,
      totalMinutes: 0,
      averageMinutes: 0,
      currentMonthDays: 0,
    }
  }

  const totalDays = records.length
  const totalSeconds = records.reduce((sum, r) => sum + r.duration, 0)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const averageMinutes = Math.floor(totalMinutes / totalDays)

  // 本月练习天数
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentMonthDays = records.filter(r => {
    const date = new Date(r.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }).length

  return {
    totalDays,
    totalMinutes,
    averageMinutes,
    currentMonthDays,
  }
}
