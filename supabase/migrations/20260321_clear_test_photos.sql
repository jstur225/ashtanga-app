-- 清除今天的测试照片记录（用于重新测试上传功能）
-- 执行前请确认：这会删除今天上传的所有照片记录，包括测试记录

-- 查看今天的照片记录
SELECT id, user_id, uploaded_at, oss_key
FROM photos
WHERE DATE(uploaded_at) = CURRENT_DATE
ORDER BY uploaded_at DESC;

-- 如果要删除今天的所有记录，取消下面这行的注释并执行：
-- DELETE FROM photos WHERE DATE(uploaded_at) = CURRENT_DATE;

-- 或者只删除特定用户的今天记录（需要先知道 user_id）：
-- DELETE FROM photos WHERE user_id = 'your-user-id-here' AND DATE(uploaded_at) = CURRENT_DATE;