-- 日历标注功能：两张表
-- 遵循会员系统模式，不启用 RLS（通过 service role API 控制）

-- ==================== 1. 标注类型定义 ====================
CREATE TABLE IF NOT EXISTS annotation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  label VARCHAR(50) NOT NULL,
  color VARCHAR(9) NOT NULL,  -- hex 颜色，如 #D4A5A5
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, label)
);

CREATE INDEX IF NOT EXISTS idx_annotation_types_user_id ON annotation_types(user_id);

-- ==================== 2. 日期到标注类型的映射 ====================
-- 不存 user_id，通过 annotation_type_id 推导
CREATE TABLE IF NOT EXISTS calendar_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_type_id UUID NOT NULL REFERENCES annotation_types(id) ON DELETE CASCADE,
  date VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(annotation_type_id, date)
);

-- 按月查询优化：按 annotation_type_id + date 索引
CREATE INDEX IF NOT EXISTS idx_calendar_annotations_type_date ON calendar_annotations(annotation_type_id, date);
