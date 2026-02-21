-- 为 user_profiles 表添加历史练习数据字段
-- 执行时间: 2026-02-21

-- 添加历史练习天数字段
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS historical_days INTEGER DEFAULT 0;

-- 添加历史平均时长字段
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS historical_avg_minutes INTEGER DEFAULT 0;

-- 验证字段是否添加成功
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('historical_days', 'historical_avg_minutes')
ORDER BY ordinal_position;
