-- 第一步：查看你的 profile id
SELECT id, user_id, email, name
FROM user_profiles
WHERE email = '519216978@qq.com';

-- 执行上面语句后，把下面 'REPLACE_WITH_PROFILE_ID' 替换成查询到的 id

-- 第二步：查看会员记录
-- SELECT * FROM user_memberships WHERE user_id = 'REPLACE_WITH_PROFILE_ID';

-- 第三步：查看视图是否返回数据
-- SELECT * FROM user_membership_status WHERE user_id = 'REPLACE_WITH_PROFILE_ID';

-- 查看视图定义
SELECT definition FROM pg_views WHERE viewname = 'user_membership_status';
