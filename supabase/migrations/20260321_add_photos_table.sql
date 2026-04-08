-- 创建照片元数据表（支持多照片扩展，最多9张）
-- 注意：practice_record_id 使用 TEXT 类型以兼容现有表结构
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    practice_record_id TEXT NOT NULL,  -- 改为 TEXT 以兼容 practice_records.id

    -- OSS 信息
    oss_url TEXT NOT NULL,              -- 完整访问 URL
    oss_key TEXT NOT NULL,              -- OSS 对象键
    file_size BIGINT NOT NULL,          -- 文件大小（字节）
    mime_type TEXT,                     -- 图片类型

    -- 排序支持（多照片时按此排序）
    display_order INTEGER DEFAULT 0,    -- 显示顺序，支持多照片拖拽排序

    -- 上传限制
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE, -- 软删除标记

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 索引（为多照片查询优化）
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_record_id ON photos(practice_record_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_record_order ON photos(practice_record_id, display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);

-- 注释
COMMENT ON TABLE photos IS '练习照片元数据表，支持单条记录最多 9 张照片';
COMMENT ON COLUMN photos.display_order IS '照片显示顺序，支持多照片拖拽排序';
COMMENT ON COLUMN photos.deleted_at IS '软删除时间戳，NULL 表示未删除';

-- 启用 RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 查询策略：只能查看自己的照片
CREATE POLICY "Users can view own photos"
    ON photos FOR SELECT
    USING (auth.uid() = user_id);

-- 插入策略：只能插入自己的照片
CREATE POLICY "Users can insert own photos"
    ON photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 更新策略：只能更新自己的照片（用于软删除）
CREATE POLICY "Users can update own photos"
    ON photos FOR UPDATE
    USING (auth.uid() = user_id);

-- 删除策略：只能删除自己的照片
CREATE POLICY "Users can delete own photos"
    ON photos FOR DELETE
    USING (auth.uid() = user_id);

-- 获取用户今日照片数量
CREATE OR REPLACE FUNCTION get_user_today_photo_count(user_uuid UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM photos
    WHERE user_id = user_uuid
      AND deleted_at IS NULL
      AND DATE_TRUNC('day', uploaded_at) = DATE_TRUNC('day', NOW());
$$;

-- 检查用户今日是否还能上传（支持传入限额参数，默认 1 张）
CREATE OR REPLACE FUNCTION can_user_upload_today(
    user_uuid UUID,
    max_photos INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT get_user_today_photo_count(user_uuid) < max_photos;
$$;

-- 获取记录的照片数量（支持多照片检查）
CREATE OR REPLACE FUNCTION get_record_photo_count(record_uuid UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM photos
    WHERE practice_record_id = record_uuid
      AND deleted_at IS NULL;
$$;

-- 检查记录是否还能添加照片（支持传入限额参数）
CREATE OR REPLACE FUNCTION can_record_add_photo(
    record_uuid UUID,
    max_per_record INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT get_record_photo_count(record_uuid) < max_per_record;
$$;
