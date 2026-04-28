// 日历标注类型定义

export interface AnnotationType {
  id: string
  user_id: string
  label: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CalendarAnnotation {
  id: string
  annotation_type_id: string
  date: string
  created_at: string
}

// API 返回的富化标注数据（带类型信息）
export interface EnrichedAnnotation {
  id: string
  annotation_type_id: string
  date: string
  created_at: string
  type: {
    label: string
    color: string
    id?: string
  } | null
}

// date → AnnotationType[]
export type AnnotationMap = Record<string, AnnotationType[]>
