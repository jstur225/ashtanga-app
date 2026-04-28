'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useMembership } from './useMembership'
import type { AnnotationType, EnrichedAnnotation } from '@/lib/annotation-types'

const ANNOTATION_COLORS = [
  '#D4A5A5', // Dusty Rose — 生理期
  '#C4956A', // Warm Clay — 旅行
  '#7FA8A8', // Soft Teal — 训练营
  '#A8A0C4', // Muted Lavender — 冥想
  '#C9B99A', // Sand — 轻量标记
  '#B86C6C', // Brick Red — 重要事项
  '#7A8BA8', // Slate Blue — 学习
  '#8FA88F', // Sage — 健康
  '#A89888', // Taupe — 常规
]

export function useAnnotations() {
  const { membership, isPro } = useMembership()
  const maxTypes = isPro ? 9 : 1

  const [types, setTypes] = useState<AnnotationType[]>([])
  const [annotationsByMonth, setAnnotationsByMonth] = useState<Record<string, EnrichedAnnotation[]>>({})
  const [loading, setLoading] = useState(false)
  const loadedMonthsRef = useRef<Set<string>>(new Set())

  // 获取 token
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [])

  // 加载所有标注类型
  const loadTypes = useCallback(async () => {
    const token = await getToken()
    if (!token) return

    setLoading(true)
    try {
      const res = await fetch('/api/annotations/types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.success) {
        setTypes(result.data)
      }
    } catch (err) {
      console.error('加载标注类型失败:', err)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  // 加载指定月的标注
  const loadMonth = useCallback(async (year: number, month: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    if (loadedMonthsRef.current.has(key)) return // 已加载，跳过

    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/annotations/assignments?month=${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.success) {
        setAnnotationsByMonth(prev => ({ ...prev, [key]: result.data as EnrichedAnnotation[] }))
        loadedMonthsRef.current.add(key)
      }
    } catch (err) {
      console.error('加载标注失败:', err)
    }
  }, [getToken])

  // 获取指定月所有日期的标注颜色（用于日历渲染）
  const getAnnotationColorsForDate = useCallback((dateStr: string): string[] => {
    const monthKey = dateStr.slice(0, 7) // "2026-04"
    const monthData = annotationsByMonth[monthKey]
    if (!monthData) return []

    return monthData
      .filter(a => a.date === dateStr)
      .map(a => a.type?.color)
      .filter(Boolean) as string[]
  }, [annotationsByMonth])

  // 创建标注类型
  const createType = useCallback(async (label: string, color: string) => {
    const token = await getToken()
    if (!token) return null

    const res = await fetch('/api/annotations/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label, color }),
    })
    const result = await res.json()
    if (result.success) {
      setTypes(prev => [...prev, result.data])
    }
    return result
  }, [getToken])

  // 更新标注类型
  const updateType = useCallback(async (id: string, updates: { label?: string; color?: string }) => {
    const token = await getToken()
    if (!token) return null

    const res = await fetch(`/api/annotations/types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    const result = await res.json()
    if (result.success) {
      setTypes(prev => prev.map(t => t.id === id ? result.data : t))
      // 更新缓存中的颜色
      if (updates.color) {
        setAnnotationsByMonth(prev => {
          const next = { ...prev }
          for (const key of Object.keys(next)) {
            next[key] = next[key].map(a => ({
              ...a,
              type: a.type ? { ...a.type, color: updates.color! } : null,
            }))
          }
          return next
        })
      }
    }
    return result
  }, [getToken])

  // 删除标注类型
  const deleteType = useCallback(async (id: string) => {
    const token = await getToken()
    if (!token) return null

    const res = await fetch(`/api/annotations/types/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await res.json()
    if (result.success) {
      setTypes(prev => prev.filter(t => t.id !== id))
      // 清理缓存中该类型的标注
      setAnnotationsByMonth(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter(a => a.annotation_type_id !== id)
        }
        return next
      })
    }
    return result
  }, [getToken])

  // 添加标注到日期（幂等）
  const addAnnotation = useCallback(async (typeId: string, date: string) => {
    const token = await getToken()
    if (!token) return null

    const res = await fetch('/api/annotations/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type_id: typeId, date }),
    })
    const result = await res.json()
    if (result.success) {
      // 更新缓存
      const monthKey = date.slice(0, 7)
      const typeInfo = types.find(t => t.id === typeId)
      if (typeInfo && result.data) {
        setAnnotationsByMonth(prev => ({
          ...prev,
          [monthKey]: [
            ...(prev[monthKey] || []),
            { ...result.data, type: { label: typeInfo.label, color: typeInfo.color, id: typeId } } as EnrichedAnnotation,
          ],
        }))
      }
    }
    return result
  }, [getToken, types])

  // 从日期移除标注（幂等）
  const removeAnnotation = useCallback(async (typeId: string, date: string) => {
    const token = await getToken()
    if (!token) return null

    const res = await fetch(`/api/annotations/assignments?type_id=${typeId}&date=${date}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await res.json()
    if (result.success) {
      // 更新缓存
      const monthKey = date.slice(0, 7)
      setAnnotationsByMonth(prev => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).filter(a =>
          !(a.annotation_type_id === typeId && a.date === date)
        ),
      }))
    }
    return result
  }, [getToken])

  // 构建指定月的标注映射 date → {label, color}[]
  const buildAnnotationMap = useCallback((year: number, month: number): Record<string, { label: string; color: string }[]> => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthData = annotationsByMonth[key]
    if (!monthData?.length) return {}

    const map: Record<string, { label: string; color: string }[]> = {}
    for (const item of monthData) {
      if (item.type) {
        if (!map[item.date]) map[item.date] = []
        map[item.date].push(item.type)
      }
    }
    return map
  }, [annotationsByMonth])

  // 构建 { typeId → Set<dateStr> } 用于弹窗内判断日期是否已标注
  const buildAnnotatedDates = useCallback((year: number, month: number): Record<string, Set<string>> => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthData = annotationsByMonth[key]
    if (!monthData?.length) return {}

    const map: Record<string, Set<string>> = {}
    for (const item of monthData) {
      if (!map[item.annotation_type_id]) map[item.annotation_type_id] = new Set()
      map[item.annotation_type_id].add(item.date)
    }
    return map
  }, [annotationsByMonth])

  return {
    types,
    loading,
    maxTypes,
    annotationColors: ANNOTATION_COLORS,
    getAnnotationColorsForDate,
    buildAnnotationMap,
    buildAnnotatedDates,
    loadTypes,
    loadMonth,
    createType,
    updateType,
    deleteType,
    addAnnotation,
    removeAnnotation,
  }
}
