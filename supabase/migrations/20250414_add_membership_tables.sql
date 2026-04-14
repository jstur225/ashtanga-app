-- 会员系统表结构迁移
-- 创建时间: 2025-04-14

-- 1. 激活码池
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,      -- 如：X7B9-K2M4-P5Q8
  type VARCHAR(20) NOT NULL,             -- quarter / year
  duration_days INTEGER NOT NULL,        -- 90 / 365
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES user_profiles(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,   -- 码本身有效期（未使用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 激活码索引
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used_by ON activation_codes(used_by);

-- 2. 会员记录表（每次开通一条记录，支持历史追溯）
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  type VARCHAR(20) NOT NULL,             -- quarter / year
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_by_code_id UUID REFERENCES activation_codes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会员记录索引
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires_at ON user_memberships(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_expires ON user_memberships(user_id, expires_at DESC);

-- 3. 会员状态视图（查询时实时计算）
CREATE OR REPLACE VIEW user_membership_status AS
SELECT
  up.id as user_id,
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

-- 4. 添加注释说明
COMMENT ON TABLE activation_codes IS '激活码池，存储所有生成的激活码';
COMMENT ON TABLE user_memberships IS '会员开通记录，每次激活生成一条记录';
COMMENT ON VIEW user_membership_status IS '会员状态视图，实时计算用户当前会员状态';

-- 5. 启用 RLS（行级安全）
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略
-- 激活码：仅服务角色可读写
CREATE POLICY "Service role full access on activation_codes"
  ON activation_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 会员记录：用户只能查看自己的记录
CREATE POLICY "Users can view own memberships"
  ON user_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 会员记录：服务角色可插入
CREATE POLICY "Service role can insert memberships"
  ON user_memberships
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 视图权限：所有认证用户可查询
GRANT SELECT ON user_membership_status TO authenticated;
GRANT SELECT ON user_membership_status TO anon;
