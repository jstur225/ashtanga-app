-- 软删除照片函数（绕过 RLS，返回是否成功）
CREATE OR REPLACE FUNCTION soft_delete_photo(
    p_photo_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_rows INTEGER;
BEGIN
    UPDATE photos
    SET deleted_at = NOW()
    WHERE id = p_photo_id
      AND user_id = p_user_id
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    RETURN v_updated_rows > 0;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION soft_delete_photo TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_photo TO service_role;
