-- =====================================================
-- 照片关联修复脚本 - 一键修复版本
-- 用途：将 photos 表中的 URL 关联到 practice_records
-- =====================================================

-- 第1步：查看当前状态（安全查询）
SELECT '=== 修复前状态 ===' as info;
SELECT
    'Practice Records' as table_name,
    COUNT(*) FILTER (WHERE photos IS NULL) as null_photos,
    COUNT(*) FILTER (WHERE photos IS NOT NULL) as has_photos,
    COUNT(*) as total
FROM practice_records
WHERE deleted_at IS NULL

UNION ALL

SELECT
    'Photos' as table_name,
    NULL as null_photos,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as has_photos,
    COUNT(*) as total
FROM photos;

-- 第2步：查看可以关联的记录
SELECT '=== 可以修复的记录 ===' as info;
SELECT
    r.id as record_id,
    r.date,
    r.type,
    COUNT(p.id) as photo_count,
    json_agg(p.oss_url) as urls
FROM practice_records r
JOIN photos p ON r.id = p.practice_record_id
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND r.photos IS NULL
GROUP BY r.id, r.date, r.type
ORDER BY r.date DESC
LIMIT 20;

-- 第3步：执行修复（取消注释后执行）
-- 将 photos 表的 URL 写入 practice_records.photos

-- UPDATE practice_records r
-- SET photos = (
--     SELECT json_agg(p.oss_url ORDER BY p.uploaded_at)
--     FROM photos p
--     WHERE p.practice_record_id = r.id
--       AND p.deleted_at IS NULL
--       AND p.oss_url IS NOT NULL
--       AND p.oss_url != ''
-- )
-- WHERE r.deleted_at IS NULL
--   AND r.photos IS NULL
--   AND EXISTS (
--       SELECT 1 FROM photos p
--       WHERE p.practice_record_id = r.id
--         AND p.deleted_at IS NULL
--         AND p.oss_url IS NOT NULL
--         AND p.oss_url != ''
--   );

-- 第4步：验证修复结果（执行修复后运行）
-- SELECT '=== 修复后状态 ===' as info;
-- SELECT
--     COUNT(*) FILTER (WHERE photos IS NULL) as null_photos,
--     COUNT(*) FILTER (WHERE photos IS NOT NULL) as has_photos,
--     COUNT(*) as total
-- FROM practice_records
-- WHERE deleted_at IS NULL;
