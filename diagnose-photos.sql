-- =====================================================
-- 照片数据诊断脚本
-- 用途：查看 Supabase 照片表的实际数据状态
-- =====================================================

-- 1. 查看 photos 表结构
SELECT '=== Photos 表结构 ===' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'photos'
ORDER BY ordinal_position;

-- 2. 查看 practice_records 表的 photos 字段类型
SELECT '=== Practice Records 表结构 ===' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'practice_records'
  AND column_name IN ('id', 'user_id', 'photos', 'deleted_at')
ORDER BY ordinal_position;

-- 3. 查看最新的几条照片记录
SELECT '=== 最新照片记录（前10条） ===' as info;
SELECT
    p.id,
    p.practice_record_id,
    p.user_id,
    LEFT(p.oss_url, 50) as oss_url_preview,
    p.oss_key,
    p.file_size,
    p.deleted_at,
    p.uploaded_at,
    p.created_at
FROM photos p
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. 查看有照片的 practice_records
SELECT '=== 有照片的 Practice Records（前10条） ===' as info;
SELECT
    r.id,
    r.user_id,
    r.date,
    r.type,
    LEFT(r.photos::text, 100) as photos_preview,
    r.deleted_at,
    r.created_at
FROM practice_records r
WHERE r.photos IS NOT NULL
  AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT 10;

-- 5. 按用户统计照片情况
SELECT '=== 按用户统计照片 ===' as info;
SELECT
    p.user_id,
    COUNT(*) as total_photos,
    COUNT(CASE WHEN p.deleted_at IS NULL THEN 1 END) as active_photos,
    COUNT(CASE WHEN p.deleted_at IS NOT NULL THEN 1 END) as deleted_photos,
    COUNT(DISTINCT p.practice_record_id) as linked_records
FROM photos p
GROUP BY p.user_id
ORDER BY total_photos DESC;

-- 6. 查看 photos 表与 practice_records 表的关联情况
SELECT '=== 照片关联情况 ===' as info;
SELECT
    'Active photos with valid records' as status,
    COUNT(*) as count
FROM photos p
JOIN practice_records r ON p.practice_record_id = r.id
WHERE p.deleted_at IS NULL AND r.deleted_at IS NULL

UNION ALL

SELECT
    'Active photos with deleted records' as status,
    COUNT(*) as count
FROM photos p
JOIN practice_records r ON p.practice_record_id = r.id
WHERE p.deleted_at IS NULL AND r.deleted_at IS NOT NULL

UNION ALL

SELECT
    'Soft deleted photos' as status,
    COUNT(*) as count
FROM photos
WHERE deleted_at IS NOT NULL;

-- 7. 查看 photos 字段格式问题
SELECT '=== Photos 字段格式分析 ===' as info;
SELECT
    CASE
        WHEN photos IS NULL THEN 'NULL'
        WHEN photos::text = 'null' THEN '字符串null'
        WHEN photos::text = '"null"' THEN '带引号的null'
        WHEN photos::text = '[]' THEN '空数组'
        WHEN photos::text LIKE '[%http%' THEN '有效URL数组'
        WHEN photos::text LIKE '[%http%' THEN 'JSON数组'
        ELSE '其他: ' || LEFT(photos::text, 50)
    END as photo_format,
    COUNT(*) as count
FROM practice_records
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY count DESC;

-- 8. 查看某个具体用户的测试数据（如果有用户ID的话）
-- 替换 'your-user-id-here' 为实际的用户ID
-- SELECT '=== 特定用户数据 ===' as info;
-- SELECT
--     r.id,
--     r.date,
--     r.type,
--     r.photos,
--     (SELECT COUNT(*) FROM photos p WHERE p.practice_record_id = r.id) as photo_count
-- FROM practice_records r
-- WHERE r.user_id = 'your-user-id-here'
--   AND r.deleted_at IS NULL
-- ORDER BY r.date DESC
-- LIMIT 20;
