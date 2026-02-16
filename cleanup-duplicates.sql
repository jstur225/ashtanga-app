-- 清理重复记录（保留 created_at 最早的记录）
WITH ranked_records AS (
    SELECT
        id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as rn
    FROM practice_records
)
DELETE FROM practice_records
WHERE id IN (
    SELECT id
    FROM ranked_records
    WHERE rn > 1
);

-- 或者，如果问题是多条记录有相同内容但不同 ID，可以按内容去重
-- 先查看有多少条记录
SELECT COUNT(*) as total_after_cleanup FROM practice_records;
