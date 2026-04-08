-- =====================================================
-- 照片数据修复和清理脚本
-- 用途：清理测试数据，修复照片关联
-- =====================================================

-- =====================================================
-- 第1步：诊断（先运行这些查询了解情况）
-- =====================================================

-- 1.1 查看有多少记录有照片字段
SELECT '当前照片状态' as info,
       COUNT(*) FILTER (WHERE photos IS NULL) as null_photos,
       COUNT(*) FILTER (WHERE photos IS NOT NULL) as has_photos,
       COUNT(*) FILTER (WHERE photos = '[]') as empty_array,
       COUNT(*) as total
FROM practice_records
WHERE deleted_at IS NULL;

-- 1.2 查看 photos 表的记录数
SELECT 'Photos表统计' as info,
       COUNT(*) as total_photos,
       COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_photos,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted
FROM photos;

-- =====================================================
-- 第2步：清理测试数据（取消注释后执行）
-- =====================================================

-- 2.1 软删除孤立的 photos（关联的记录已删除）
-- UPDATE photos
-- SET deleted_at = NOW()
-- WHERE id IN (
--     SELECT p.id
--     FROM photos p
--     LEFT JOIN practice_records r ON p.practice_record_id = r.id
--     WHERE (r.id IS NULL OR r.deleted_at IS NOT NULL)
--       AND p.deleted_at IS NULL
-- );

-- 2.2 重置所有 practice_records 的 photos 字段
-- 这将清空所有照片关联，用于重新开始测试
-- UPDATE practice_records
-- SET photos = NULL
-- WHERE deleted_at IS NULL;

-- =====================================================
-- 第3步：从 photos 表重新建立关联（推荐）
-- =====================================================

-- 3.1 先查看哪些照片可以关联
SELECT '可以关联的照片' as info,
       p.id as photo_id,
       p.practice_record_id,
       p.oss_url,
       r.id as record_id,
       r.photos as current_photos
FROM photos p
JOIN practice_records r ON p.practice_record_id = r.id
WHERE p.deleted_at IS NULL
  AND r.deleted_at IS NULL
  AND r.photos IS NULL
LIMIT 10;

-- 3.2 建立关联：将 photos 表的 URL 写入 practice_records.photos
-- 这个操作会为有照片但 photos 字段为空的记录建立关联
-- UPDATE practice_records r
-- SET photos = (
--     SELECT json_agg(p.oss_url)
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

-- =====================================================
-- 第4步：验证修复结果
-- =====================================================

-- 4.1 查看修复后的统计
SELECT '修复后照片状态' as info,
       COUNT(*) FILTER (WHERE photos IS NULL) as null_photos,
       COUNT(*) FILTER (WHERE photos IS NOT NULL) as has_photos,
       COUNT(*) FILTER (WHERE photos = '[]') as empty_array,
       COUNT(*) as total
FROM practice_records
WHERE deleted_at IS NULL;

-- 4.2 查看成功关联的记录
SELECT '成功关联的记录' as info,
       r.id,
       r.date,
       r.type,
       r.photos,
       (SELECT COUNT(*) FROM photos p WHERE p.practice_record_id = r.id AND p.deleted_at IS NULL) as photo_count
FROM practice_records r
WHERE r.photos IS NOT NULL
  AND r.photos != '[]'
  AND r.deleted_at IS NULL
ORDER BY r.date DESC
LIMIT 10;

-- =====================================================
-- 第5步：彻底删除测试数据（危险！谨慎执行）
-- =====================================================

-- 5.1 永久删除已软删除超过7天的照片
-- DELETE FROM photos
-- WHERE deleted_at IS NOT NULL
--   AND deleted_at < NOW() - INTERVAL '7 days';

-- 5.2 删除特定用户的测试照片（替换 user_id）
-- DELETE FROM photos
-- WHERE user_id = 'your-test-user-id';

-- 5.3 重置特定用户的 practice_records.photos
-- UPDATE practice_records
-- SET photos = NULL
-- WHERE user_id = 'your-test-user-id'
--   AND deleted_at IS NULL;
