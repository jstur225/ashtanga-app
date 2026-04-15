-- ============================================
-- 重置会员系统数据脚本
-- ============================================

-- 使用 DELETE 代替 TRUNCATE（因为有外键约束）

-- 第一步：删除所有会员记录
DELETE FROM user_memberships;

-- 第二步：删除所有激活码
DELETE FROM activation_codes;

-- 第三步：生成测试激活码
INSERT INTO activation_codes (code, type, duration_days, used, used_at, created_at) VALUES
-- 季卡（90天）
('ABCD-EFGH-IJKL', 'quarter', 90, false, null, NOW()),
('1111-2222-3333', 'quarter', 90, false, null, NOW()),
('AAAA-BBBB-CCCC', 'quarter', 90, false, null, NOW()),

-- 年卡（365天）
('ZZZZ-YYYY-XXXX', 'year', 365, false, null, NOW()),
('9999-8888-7777', 'year', 365, false, null, NOW()),
('TEST-YEAR-CARD', 'year', 365, false, null, NOW());

-- 第四步：查看生成的激活码
SELECT
    code,
    type,
    duration_days,
    used,
    CASE
        WHEN type = 'quarter' THEN '季卡'
        WHEN type = 'year' THEN '年卡'
        ELSE type
    END as card_type
FROM activation_codes
ORDER BY type, code;
