-- 调试函数：绕过 RLS 获取记录照片
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
LANGUAGE SQL
SECURITY DEFINER  -- 以函数所有者权限执行，绕过 RLS
AS $$
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
    ORDER BY p.display_order;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_record_photos_debug TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_photos_debug TO service_role;