-- 诊断照片查询问题
-- 请执行这个查询，告诉我结果

-- 1. 查看这条记录的所有照片（不管用户ID）
SELECT
    p.id,
    p.practice_record_id,
    p.user_id,
    p.oss_url,
    p.deleted_at IS NULL as is_active,
    p.uploaded_at
FROM photos p
WHERE p.practice_record_id = '1b11aa9c-77f5-422f-bf69-c9b80d96897e'
   OR p.practice_record_id LIKE '1b11aa9c%'
ORDER BY p.uploaded_at DESC;

-- 2. 检查 RPC 函数是否能查到
SELECT * FROM get_record_photos_debug(
    '1b11aa9c-77f5-422f-bf69-c9b80d96897e',
    (SELECT user_id FROM photos WHERE practice_record_id LIKE '1b11aa9c%' LIMIT 1)
);

-- 3. 查看这条记录的实际 practice_record_id 格式
SELECT DISTINCT practice_record_id
FROM photos
WHERE practice_record_id LIKE '1b11aa9c%';