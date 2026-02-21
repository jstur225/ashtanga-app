-- 为 user_profiles 表添加 updated_at 字段（用于同步时判断最新版本）
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 创建索引（提高同步查询速度）
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);

-- 添加注释
COMMENT ON COLUMN user_profiles.updated_at IS '最后修改时间，用于同步时判断最新版本';

-- 更新现有数据：将 updated_at 设置为 created_at（如果没有的话）
UPDATE user_profiles
SET updated_at = created_at
WHERE updated_at IS NULL;
