-- 修复 has_practiced 因 UTC/北京时区不一致导致的日期错位
-- 原因：heartbeat 和 record-practice 之前用 UTC 日期，practice_records 用北京时间
-- 结果：0:00-8:00 北京时间练习的设备，has_practiced 被标记到了前一天（UTC日期）

-- Step 1: 把错位的 has_practiced=true 记录搬到正确的北京时间日期
WITH misaligned AS (
  SELECT
    uuid,
    has_practiced,
    is_new,
    created_at,
    (created_at + interval '8 hours')::date AS beijing_date
  FROM daily_user_activity
  WHERE has_practiced = true
    AND date != (created_at + interval '8 hours')::date
)
INSERT INTO daily_user_activity (date, uuid, has_practiced, is_new, created_at)
SELECT beijing_date, uuid, true, false, created_at
FROM misaligned
ON CONFLICT (date, uuid) DO UPDATE SET has_practiced = true;

-- Step 2: 清除错位记录上的 has_practiced（它们已经搬到正确日期了）
UPDATE daily_user_activity
SET has_practiced = false
WHERE has_practiced = true
  AND date != (created_at + interval '8 hours')::date;
