-- 为 user_memberships 表添加邮箱字段，方便查询

-- 1. 添加 email 字段
ALTER TABLE user_memberships
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. 添加邮箱索引
CREATE INDEX IF NOT EXISTS idx_user_memberships_email ON user_memberships(email);

-- 3. 更新视图，包含邮箱
CREATE OR REPLACE VIEW user_membership_status AS
SELECT
  up.id as user_id,
  up.user_id as auth_user_id,
  um.email,
  um.type as membership_type,
  um.expires_at,
  um.expires_at > NOW() as is_active,
  CASE
    WHEN um.expires_at > NOW() THEN EXTRACT(DAY FROM um.expires_at - NOW())::INTEGER
    ELSE 0
  END as days_remaining
FROM user_profiles up
LEFT JOIN LATERAL (
  SELECT * FROM user_memberships
  WHERE user_id = up.id
  ORDER BY expires_at DESC
  LIMIT 1
) um ON true;

-- 4. 添加注释
COMMENT ON COLUMN user_memberships.email IS '用户邮箱，方便管理员查询';
