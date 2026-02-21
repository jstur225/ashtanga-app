-- ============================================
-- 清理设备限制相关字段和功能
-- 执行日期: 2026-02-18
-- ============================================

-- 1. 删除 user_profiles 表中的 logged_in_devices 字段
-- 这个字段之前用于限制设备登录，现在已经不需要了

ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS logged_in_devices;

-- ============================================
-- 执行说明：
-- 1. 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- 2. 或者使用 psql 命令行工具执行
-- 3. DROP COLUMN IF EXISTS 确保字段存在时才删除，避免报错
-- ============================================

-- 验证删除是否成功（可选）
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public';
-- 确认结果中没有 logged_in_devices 字段

-- ============================================
-- 注意事项：
-- ⚠️ 此操作不可逆，删除字段后数据将永久丢失
-- ✅ 但当前代码已经不再使用此字段，删除是安全的
-- ============================================
