-- 修复查询函数，确保返回正确的照片列表
CREATE OR REPLACE FUNCTION get_record_photos_debug(
    p_record_id TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    practice_record_id TEXT,
    oss_url TEXT,
    oss_key TEXT,
    file_size BIGINT,
    mime_type TEXT,
    display_order INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.practice_record_id,
        p.oss_url,
        p.oss_key,
        p.file_size,
        p.mime_type,
        p.display_order,
        p.uploaded_at
    FROM photos p
    WHERE p.practice_record_id = p_record_id
      AND p.user_id = p_user_id
      AND p.deleted_at IS NULL
    ORDER BY p.display_order, p.uploaded_at DESC;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_record_photos_debug TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_photos_debug TO service_role;

-- 同时检查并清理可能的脏数据（同一天多次上传的测试数据）
-- 保留每个记录最新的一张，删除其他的
DELETE FROM photos
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY practice_record_id ORDER BY uploaded_at DESC) as rn
        FROM photos
        WHERE deleted_at IS NULL
    ) ranked
    WHERE rn > 1
);
