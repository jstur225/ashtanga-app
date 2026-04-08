-- 软删除照片函数（绕过 RLS）
CREATE OR REPLACE FUNCTION delete_photo_debug(
    p_photo_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE photos
    SET deleted_at = NOW()
    WHERE id = p_photo_id
      AND user_id = p_user_id
      AND deleted_at IS NULL;

    SELECT TRUE;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION delete_photo_debug TO authenticated;
GRANT EXECUTE ON FUNCTION delete_photo_debug TO service_role;