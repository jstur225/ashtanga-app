-- 熬汤日记 全量备份 (简化版)
-- Supabase SQL Editor 运行

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

INSERT INTO _data_backups (backup_type, practice_records_snapshot, practice_options_snapshot, user_profiles_snapshot, photos_snapshot, record_count, user_count)
SELECT
  'manual',
  (SELECT jsonb_agg(jsonb_build_object('id',pr.id,'user_id',pr.user_id,'email',au.email,'name',au.raw_user_meta_data->>'name','date',pr.date,'type',pr.type,'duration',pr.duration,'notes',pr.notes,'breakthrough',pr.breakthrough,'start_time',pr.start_time,'created_at',pr.created_at,'updated_at',pr.updated_at,'photos_count',COALESCE(cardinality(pr.photos),0)) ORDER BY pr.date DESC) FROM practice_records pr LEFT JOIN auth.users au ON au.id=pr.user_id WHERE pr.deleted_at IS NULL),
  (SELECT jsonb_agg(jsonb_build_object('id',po.id,'user_id',po.user_id,'email',au.email,'name',au.raw_user_meta_data->>'name','label',po.label,'notes',po.notes,'is_custom',po.is_custom,'created_at',po.created_at) ORDER BY po.user_id,po.is_custom,po.created_at) FROM practice_options po LEFT JOIN auth.users au ON au.id=po.user_id),
  (SELECT jsonb_agg(jsonb_build_object('id',up.id,'user_id',up.user_id,'email',au.email,'name',up.name,'signature',up.signature,'historical_days',up.historical_days,'historical_avg_minutes',up.historical_avg_minutes,'created_at',up.created_at,'updated_at',up.updated_at,'is_pro',EXISTS(SELECT 1 FROM user_memberships um WHERE um.user_id=up.user_id AND um.expires_at>NOW())) ORDER BY up.created_at) FROM user_profiles up LEFT JOIN auth.users au ON au.id=up.user_id),
  (SELECT jsonb_agg(jsonb_build_object('id',p.id,'user_id',p.user_id,'email',au.email,'practice_record_id',p.practice_record_id,'record_date',pr.date,'oss_url',p.oss_url,'file_size',p.file_size,'mime_type',p.mime_type,'display_order',p.display_order,'uploaded_at',p.uploaded_at) ORDER BY p.uploaded_at DESC) FROM photos p LEFT JOIN practice_records pr ON pr.id=p.practice_record_id LEFT JOIN auth.users au ON au.id=p.user_id WHERE p.deleted_at IS NULL),
  (SELECT COUNT(*) FROM practice_records WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM auth.users);

SELECT NOW() AS 备份时间, (SELECT COUNT(*) FROM auth.users) AS 用户数, (SELECT record_count FROM _data_backups ORDER BY backed_up_at DESC LIMIT 1) AS 记录数, '完成' AS 状态;
