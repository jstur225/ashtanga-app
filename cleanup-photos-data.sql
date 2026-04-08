-- =====================================================
-- 照片数据清理脚本
-- 用途：清理 Supabase 中的照片脏数据，重置测试环境
-- 执行前请备份数据！
-- =====================================================

-- 1. 查看当前照片数据统计
SELECT '=== 照片表统计 ===' as info;
SELECT
    COUNT(*) as total_photos,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_photos,
    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted_photos,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT practice_record_id) as linked_records
FROM photos;

-- 2. 查看 practice_records 表中的 photos 字段统计
SELECT '=== 练习记录表照片字段统计 ===' as info;
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN photos IS NULL THEN 1 END) as null_photos,
    COUNT(CASE WHEN photos IS NOT NULL THEN 1 END) as has_photos,
    COUNT(CASE WHEN photos = '[]' THEN 1 END) as empty_array,
    COUNT(CASE WHEN photos LIKE '%http%' THEN 1 END) as has_url
FROM practice_records
WHERE deleted_at IS NULL;

-- 3. 查看孤立的 photos（关联的记录已被软删除）
SELECT '=== 孤立照片（关联记录已删除） ===' as info;
SELECT p.id, p.oss_url, p.practice_record_id, p.user_id, p.created_at
FROM photos p
LEFT JOIN practice_records r ON p.practice_record_id = r.id
WHERE r.deleted_at IS NOT NULL AND p.deleted_at IS NULL;

-- 4. 查看 photos 表中 URL 为空的记录
SELECT '=== URL 为空的照片 ===' as info;
SELECT id, practice_record_id, user_id, oss_url, created_at
FROM photos
WHERE oss_url IS NULL OR oss_url = '';

-- =====================================================
-- 清理操作（取消注释后执行）
-- =====================================================

-- 步骤 1: 软删除孤立的照片（关联记录已被删除）
-- UPDATE photos
-- SET deleted_at = NOW()
-- WHERE id IN (
--     SELECT p.id
--     FROM photos p
--     LEFT JOIN practice_records r ON p.practice_record_id = r.id
--     WHERE r.deleted_at IS NOT NULL AND p.deleted_at IS NULL
-- );

-- 步骤 2: 软删除 URL 为空的照片
-- UPDATE photos
-- SET deleted_at = NOW()
-- WHERE oss_url IS NULL OR oss_url = '';

-- 步骤 3: 重置所有 practice_records 的 photos 字段为 null
-- UPDATE practice_records
-- SET photos = null
-- WHERE deleted_at IS NULL;

-- 步骤 4: 重新关联 photos 到 practice_records（基于 photos 表中的数据）
-- UPDATE practice_records r
-- SET photos = (
--     SELECT json_agg(p.oss_url)
--     FROM photos p
--     WHERE p.practice_record_id = r.id
--       AND p.deleted_at IS NULL
--       AND p.oss_url IS NOT NULL
-- )
-- WHERE r.deleted_at IS NULL
--   AND EXISTS (
--       SELECT 1 FROM photos p
--       WHERE p.practice_record_id = r.id
--         AND p.deleted_at IS NULL
--   );

-- =====================================================
-- 彻底清理（危险操作！会永久删除数据）
-- =====================================================

-- 永久删除已软删除的照片（超过7天的）
-- DELETE FROM photos
-- WHERE deleted_at IS NOT NULL
--   AND deleted_at < NOW() - INTERVAL '7 days';

-- 永久删除孤立的 photos（关联记录已删除）
-- DELETE FROM photos p
-- WHERE p.practice_record_id IN (
--     SELECT r.id FROM practice_records r WHERE r.deleted_at IS NOT NULL
-- );

-- =====================================================
-- 验证清理结果
-- =====================================================

SELECT '=== 清理后验证 ===' as info;

-- 查看有照片关联的记录
SELECT '关联了照片的记录' as info;
SELECT
    r.id,
    r.date,
    r.type,
    r.photos,
    COUNT(p.id) as photo_count
FROM practice_records r
LEFT JOIN photos p ON r.id = p.practice_record_id AND p.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.date, r.type, r.photos
HAVING COUNT(p.id) > 0
ORDER BY r.date DESC
LIMIT 10;
