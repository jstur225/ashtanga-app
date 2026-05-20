-- ============================================================
-- 熬汤日记 - 全量数据备份脚本
-- 运行方式：Supabase 控制台 → SQL Editor → 粘贴运行
-- 作用：将所有表的数据导出为 JSON，方便下载保存
-- ============================================================

-- 1. 创建备份快照表（如果不存在）
CREATE TABLE IF NOT EXISTS _data_backups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  backed_up_at TIMESTAMPTZ DEFAULT NOW(),
  backup_type TEXT NOT NULL DEFAULT 'manual',
  practice_records_snapshot JSONB,
  practice_options_snapshot JSONB,
  user_profiles_snapshot JSONB,
  photos_snapshot JSONB,
  record_count INT,
  user_count INT
);

-- 2. 获取所有用户列表
WITH user_list AS (
  SELECT id, email, raw_user_meta_data->>'name' AS display_name
  FROM auth.users
  ORDER BY created_at
),
-- 3. 备份练习记录（不含软删除的）
records_snapshot AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pr.id,
      'user_id', pr.user_id,
      'email', au.email,
      'name', au.raw_user_meta_data->>'name',
      'date', pr.date,
      'type', pr.type,
      'duration', pr.duration,
      'notes', pr.notes,
      'breakthrough', pr.breakthrough,
      'start_time', pr.start_time,
      'created_at', pr.created_at,
      'updated_at', pr.updated_at,
      'photos_count', COALESCE(cardinality(pr.photos), 0)
    )
    ORDER BY pr.date DESC
  ) AS data
  FROM practice_records pr
  LEFT JOIN auth.users au ON au.id = pr.user_id
  WHERE pr.deleted_at IS NULL
),
-- 4. 备份练习选项
options_snapshot AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', po.id,
      'user_id', po.user_id,
      'email', au.email,
      'name', au.raw_user_meta_data->>'name',
      'label', po.label,
      'notes', po.notes,
      'is_custom', po.is_custom,
      'created_at', po.created_at
    )
    ORDER BY po.user_id, po.is_custom, po.created_at
  ) AS data
  FROM practice_options po
  LEFT JOIN auth.users au ON au.id = po.user_id
),
-- 5. 备份用户资料
profiles_snapshot AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', up.id,
      'user_id', up.user_id,
      'email', au.email,
      'name', up.name,
      'signature', up.signature,
      'phone', au.phone,
      'historical_days', up.historical_days,
      'historical_avg_minutes', up.historical_avg_minutes,
      'created_at', up.created_at,
      'updated_at', up.updated_at,
      'is_pro', EXISTS(
        SELECT 1 FROM user_memberships um
        WHERE um.user_id = up.user_id
          AND um.expires_at > NOW()
      )
    )
    ORDER BY up.created_at
  ) AS data
  FROM user_profiles up
  LEFT JOIN auth.users au ON au.id = up.user_id
),
-- 6. 备份照片元数据
photos_snapshot AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'email', au.email,
      'practice_record_id', p.practice_record_id,
      'record_date', pr.date,
      'oss_url', p.oss_url,
      'file_size', p.file_size,
      'mime_type', p.mime_type,
      'display_order', p.display_order,
      'uploaded_at', p.uploaded_at
    )
    ORDER BY p.uploaded_at DESC
  ) AS data
  FROM photos p
  LEFT JOIN practice_records pr ON pr.id = p.practice_record_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.deleted_at IS NULL
)
-- 7. 插入备份记录
INSERT INTO _data_backups (
  backup_type,
  practice_records_snapshot,
  practice_options_snapshot,
  user_profiles_snapshot,
  photos_snapshot,
  record_count,
  user_count
)
SELECT
  'manual',
  (SELECT data FROM records_snapshot),
  (SELECT data FROM options_snapshot),
  (SELECT data FROM profiles_snapshot),
  (SELECT data FROM photos_snapshot),
  (SELECT COALESCE(jsonb_array_length(data), 0) FROM records_snapshot),
  (SELECT COUNT(*) FROM auth.users)
WHERE (SELECT data FROM records_snapshot) IS NOT NULL;

-- 8. 显示备份结果
SELECT
  NOW() AS 备份时间,
  (SELECT COUNT(*) FROM auth.users) AS 用户数,
  (SELECT COALESCE(jsonb_array_length(practice_records_snapshot), 0) FROM _data_backups ORDER BY backed_up_at DESC LIMIT 1) AS 记录数,
  (SELECT COUNT(*) FROM user_profiles) AS 用户资料数,
  (SELECT COUNT(*) FROM photos WHERE deleted_at IS NULL) AS 照片数,
  '✅ 备份完成' AS 状态;

-- ============================================================
-- 以下是导出备份数据的查询（复制结果保存到本地）
-- ============================================================

-- 查看最近一次备份
-- SELECT * FROM _data_backups ORDER BY backed_up_at DESC LIMIT 1;

-- 只看特定用户 (didosheng@163.com) 的所有记录
-- SELECT jsonb_pretty(
--   jsonb_build_object(
--     'backup_time', NOW(),
--     'user', 'didosheng@163.com',
--     'practice_records', (
--       SELECT jsonb_agg(to_jsonb(pr.*) ORDER BY pr.date DESC)
--       FROM practice_records pr
--       JOIN auth.users au ON au.id = pr.user_id
--       WHERE au.email = 'didosheng@163.com' AND pr.deleted_at IS NULL
--     ),
--     'practice_options', (
--       SELECT jsonb_agg(to_jsonb(po.*))
--       FROM practice_options po
--       JOIN auth.users au ON au.id = po.user_id
--       WHERE au.email = 'didosheng@163.com'
--     ),
--     'profile', (
--       SELECT to_jsonb(up.*)
--       FROM user_profiles up
--       JOIN auth.users au ON au.id = up.user_id
--       WHERE au.email = 'didosheng@163.com'
--     )
--   )
-- );
