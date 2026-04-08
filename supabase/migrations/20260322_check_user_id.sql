-- 检查 user_id 是否匹配
-- 请在 Supabase SQL Editor 执行

-- 1. 查看当前登录用户的 ID
SELECT auth.uid() as current_user_id;

-- 2. 查看照片的 user_id
SELECT
    user_id as photo_user_id,
    practice_record_id,
    id as photo_id
FROM photos
WHERE practice_record_id = '1b11aa9c-77f5-422f-bf69-c9b80d96897e';

-- 3. 直接测试 RPC 函数是否能查到
SELECT * FROM get_record_photos_debug(
    '1b11aa9c-77f5-422f-bf69-c9b80d96897e',
    auth.uid()  -- 使用当前登录用户的 ID
);
