-- 根据提供的 ID 诊断问题
-- 请在 Supabase SQL Editor 执行

-- 1. 查看这条记录的所有照片
SELECT
    p.id,
    p.practice_record_id,
    p.user_id,
    p.deleted_at IS NULL as is_active,
    p.uploaded_at
FROM photos p
WHERE p.practice_record_id = '1b11aa9c-77f5-422f-bf69-c9b80d96897e'
ORDER BY p.uploaded_at DESC;

-- 2. 查看照片 id=a12ff429... 的详情
SELECT
    p.id,
    p.practice_record_id,
    p.user_id,
    p.oss_url,
    p.deleted_at IS NULL as is_active
FROM photos p
WHERE p.id = 'a12ff429-cb67-4b14-a7dd-e619ebdc5909';

-- 3. 检查当前用户的 ID
SELECT auth.uid();

-- 4. 检查照片表中有多少条记录
SELECT COUNT(*) FROM photos;
SELECT COUNT(*) FROM photos WHERE deleted_at IS NULL;
