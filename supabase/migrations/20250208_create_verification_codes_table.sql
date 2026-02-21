-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引（提高查询速度）
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- 添加注释
COMMENT ON TABLE verification_codes IS '验证码表：用于忘记密码、邮箱验证等功能';
COMMENT ON COLUMN verification_codes.email IS '用户邮箱';
COMMENT ON COLUMN verification_codes.code IS '6位验证码';
COMMENT ON COLUMN verification_codes.type IS '验证码类型：reset_password, email_verification';
COMMENT ON COLUMN verification_codes.expires_at IS '过期时间（默认5分钟）';
COMMENT ON COLUMN verification_codes.used IS '是否已使用';
