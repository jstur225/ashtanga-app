-- 生成 10 个季卡 + 10 个年卡（共 20 个测试激活码）

INSERT INTO activation_codes (code, type, duration_days, used, created_at) VALUES
-- 季卡（90天）10个
('QUAR-0001-TEST', 'quarter', 90, false, NOW()),
('QUAR-0002-TEST', 'quarter', 90, false, NOW()),
('QUAR-0003-TEST', 'quarter', 90, false, NOW()),
('QUAR-0004-TEST', 'quarter', 90, false, NOW()),
('QUAR-0005-TEST', 'quarter', 90, false, NOW()),
('QUAR-0006-TEST', 'quarter', 90, false, NOW()),
('QUAR-0007-TEST', 'quarter', 90, false, NOW()),
('QUAR-0008-TEST', 'quarter', 90, false, NOW()),
('QUAR-0009-TEST', 'quarter', 90, false, NOW()),
('QUAR-0010-TEST', 'quarter', 90, false, NOW()),

-- 年卡（365天）10个
('YEAR-0001-TEST', 'year', 365, false, NOW()),
('YEAR-0002-TEST', 'year', 365, false, NOW()),
('YEAR-0003-TEST', 'year', 365, false, NOW()),
('YEAR-0004-TEST', 'year', 365, false, NOW()),
('YEAR-0005-TEST', 'year', 365, false, NOW()),
('YEAR-0006-TEST', 'year', 365, false, NOW()),
('YEAR-0007-TEST', 'year', 365, false, NOW()),
('YEAR-0008-TEST', 'year', 365, false, NOW()),
('YEAR-0009-TEST', 'year', 365, false, NOW()),
('YEAR-0010-TEST', 'year', 365, false, NOW());

-- 查看所有未使用的激活码
SELECT code, type, duration_days
FROM activation_codes
WHERE used = false
ORDER BY type, code;
