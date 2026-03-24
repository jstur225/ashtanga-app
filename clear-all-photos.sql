-- =====================================================
-- 清空所有照片数据脚本
-- 用途：软删除所有照片，重置测试环境
-- 警告：此操作会将所有照片标记为已删除，但保留记录
-- =====================================================

-- 第1步：查看清空前的统计
SELECT '=== 清空前状态 ===' as info;
SELECT
    'Photos 表' as item,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted,
    COUNT(*) as total
FROM photos

UNION ALL

SELECT
    'Practice Records (有照片)' as item,
    COUNT(*) FILTER (WHERE photos IS NOT NULL AND deleted_at IS NULL),
    NULL,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)
FROM practice_records;

-- 第2步：软删除所有未删除的照片
UPDATE photos
SET deleted_at = NOW()
WHERE deleted_at IS NULL;

-- 第3步：清空 practice_records 的 photos 字段
UPDATE practice_records
SET photos = NULL
WHERE deleted_at IS NULL;

-- 第4步：验证清空结果
SELECT '=== 清空后状态 ===' as info;
SELECT
    'Photos 表' as item,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted,
    COUNT(*) as total
FROM photos

UNION ALL

SELECT
    'Practice Records (有照片)' as item,
    COUNT(*) FILTER (WHERE photos IS NOT NULL AND deleted_at IS NULL),
    NULL,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)
FROM practice_records;

-- 第5步：查看被软删除的照片记录（用于确认）
SELECT '=== 被软删除的照片记录（前10条） ===' as info;
SELECT
    id,
    practice_record_id,
    user_id,
    LEFT(oss_url, 50) as url_preview,
    deleted_at
FROM photos
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;
