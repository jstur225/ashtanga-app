-- 查询 didosheng@163.com 在 4月8日的觉察内容
-- 运行方式：Supabase 控制台 → SQL Editor → 粘贴运行

-- 方法1：通过 auth.users 找 -> 查 practice_records
SELECT
  au.email,
  pr.date,
  pr.type AS 练习类型,
  pr.duration AS 时长_分钟,
  pr.notes AS 觉察内容,
  pr.created_at AS 创建时间
FROM auth.users au
JOIN practice_records pr ON pr.user_id = au.id
WHERE au.email = 'didosheng@163.com'
  AND pr.date = '2026-04-08'
  AND (pr.notes IS NOT NULL AND pr.notes != '')
ORDER BY pr.created_at;
