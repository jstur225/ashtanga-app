-- 检查照片的 OSS URL 格式
-- 请在 Supabase SQL Editor 执行

SELECT
    id,
    practice_record_id,
    oss_url,
    LEFT(oss_url, 80) as url_preview,
    uploaded_at
FROM photos
WHERE deleted_at IS NULL
ORDER BY uploaded_at DESC
LIMIT 3;
