-- ==================== 检查并清理英文选项 ====================
-- 查看当前数据库中的所有练习选项
SELECT
  id,
  user_id,
  label,
  notes,
  is_custom,
  created_at
FROM practice_options
ORDER BY created_at DESC;

-- 查看哪些是英文选项（label 包含英文单词的）
SELECT
  id,
  user_id,
  label,
  notes,
  is_custom
FROM practice_options
WHERE
  label ~ '[a-zA-Z]'  -- 包含英文字母
  OR notes ~ '[a-zA-Z]'  -- 或者备注包含英文
ORDER BY created_at DESC;

-- ==================== 清理英文选项 ====================
-- ⚠️ 警告：删除前请先确认上面的查询结果

-- 方法1：删除特定用户的英文选项（推荐，更安全）
-- 替换 YOUR_USER_ID 为实际的用户ID
DELETE FROM practice_options
WHERE user_id = 'YOUR_USER_ID'
  AND (
    label ~ '[a-zA-Z]'
    OR notes ~ '[a-zA-Z]'
  );

-- 方法2：删除所有英文选项（⚠️ 危险，会影响所有用户）
-- DELETE FROM practice_options
-- WHERE label ~ '[a-zA-Z]' OR notes ~ '[a-zA-Z]';

-- ==================== 重置为默认中文选项 ====================
-- 删除后，会自动使用本地的 DEFAULT_OPTIONS（都是中文）
-- 本地默认选项：
-- 1. 一序列 - Mysore
-- 2. 一序列 - Led class
-- 3. 二序列 - Mysore
-- 4. 二序列 - Led class
-- 5. 半序列 - 站立+休息
-- 6. 休息日 - 满月/新月
