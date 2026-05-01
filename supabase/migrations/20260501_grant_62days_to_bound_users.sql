-- ============================================
-- 所有已绑定邮箱的用户统一授予 62 天 Pro 会员
-- 执行日期: 2026-05-01
-- 逻辑：不管当前剩多少天，全部硬性覆盖为 NOW() + 62 days
-- ============================================

-- 1. 预览：查看当前状态
SELECT
  up.email,
  up.name,
  (SELECT expires_at::TEXT FROM user_memberships
   WHERE user_id = up.id AND expires_at > NOW()
   ORDER BY expires_at DESC LIMIT 1) AS current_expires_at,
  (SELECT EXTRACT(DAY FROM expires_at - NOW())::INTEGER FROM user_memberships
   WHERE user_id = up.id AND expires_at > NOW()
   ORDER BY expires_at DESC LIMIT 1) AS current_remaining_days
FROM user_profiles up
WHERE up.email IS NOT NULL AND up.email != ''
ORDER BY up.email;

-- 2. 执行统一覆盖
-- 对已有会员的 → 最新那条记录改成 62 天
-- 对已有会员的 → 其他活跃记录强制过期（防止旧的更长天数干扰视图）
-- 对无会员的 → 插入 62 天记录
DO $$
DECLARE
  rec RECORD;
  existing_id UUID;
BEGIN
  FOR rec IN SELECT id, email FROM user_profiles WHERE email IS NOT NULL AND email != '' LOOP
    -- 查找该用户最新的活跃会员记录
    SELECT id INTO existing_id FROM user_memberships
    WHERE user_id = rec.id AND expires_at > NOW()
    ORDER BY expires_at DESC LIMIT 1;

    IF existing_id IS NOT NULL THEN
      -- 有活跃会员 → 更新到期日为 62 天后
      UPDATE user_memberships
      SET expires_at = NOW() + INTERVAL '62 days'
      WHERE id = existing_id;

      -- 其他活跃记录强制过期
      UPDATE user_memberships
      SET expires_at = NOW()
      WHERE user_id = rec.id
        AND expires_at > NOW()
        AND id != existing_id;
    ELSE
      -- 无会员 → 新插入 62 天记录
      INSERT INTO user_memberships (user_id, email, type, started_at, expires_at)
      VALUES (rec.id, rec.email, 'quarter', NOW(), NOW() + INTERVAL '62 days');
    END IF;
  END LOOP;
END $$;

-- 3. 验证：查看赠送后的状态
SELECT
  up.email,
  um.type,
  um.started_at,
  um.expires_at,
  EXTRACT(DAY FROM um.expires_at - NOW())::INTEGER AS days_remaining
FROM user_profiles up
JOIN user_memberships um ON um.user_id = up.id
WHERE up.email IS NOT NULL AND up.email != ''
  AND um.expires_at = (
    SELECT MAX(expires_at) FROM user_memberships WHERE user_id = up.id
  )
ORDER BY up.email;

-- ============================================
-- 回滚说明：
-- 由于此操作为硬性覆盖，不可逐条回滚。
-- 可通过备份数据手动恢复，或联系开发人员。
-- ============================================
