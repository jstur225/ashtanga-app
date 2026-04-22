-- 每日活跃用户追踪表
-- 每次 app 打开时记录一行（每用户每天只写一次）
CREATE TABLE IF NOT EXISTS daily_user_activity (
  date DATE NOT NULL,
  uuid UUID NOT NULL,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, uuid)
);

CREATE INDEX IF NOT EXISTS idx_daily_user_activity_date ON daily_user_activity(date);
