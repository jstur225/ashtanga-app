-- 为 user_profiles 表添加历史练习数据字段
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS historical_days INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS historical_avg_minutes INTEGER DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN user_profiles.historical_days IS '历史练习天数（App使用前的练习天数）';
COMMENT ON COLUMN user_profiles.historical_avg_minutes IS '历史平均每次练习时长（分钟）';

-- 更新现有数据：将 NULL 设置为默认值 0
UPDATE user_profiles
SET historical_days = 0
WHERE historical_days IS NULL;

UPDATE user_profiles
SET historical_avg_minutes = 0
WHERE historical_avg_minutes IS NULL;
