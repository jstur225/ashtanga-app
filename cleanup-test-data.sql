-- ==================== 清理测试数据 ====================
-- ⚠️ 警告：此脚本会删除所有测试数据，请在执行前确认

-- 1. 删除所有验证码记录
DELETE FROM verification_codes WHERE email = '519216978@qq.com';

-- 2. 删除用户配置（如果有的话）
DELETE FROM user_profiles WHERE email = '519216978@qq.com';

-- 3. 删除认证用户（需要超级用户权限）
-- 注意：这需要在 Supabase Dashboard 的 SQL Editor 中手动执行
-- DELETE FROM auth.users WHERE email = '519216978@qq.com';

-- 4. 清空所有验证码（可选，如果想全部清空）
-- DELETE FROM verification_codes;

-- 5. 查看当前认证用户列表（用于检查）
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email = '519216978@qq.com';

-- ==================== 说明 ====================
-- 如果第3步无法执行，请：
-- 1. 打开 Supabase Dashboard
-- 2. 进入 Authentication → Users
-- 3. 手动删除测试用户
