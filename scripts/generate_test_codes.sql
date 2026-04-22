-- 清空并重新生成正式激活码（月/季/年各10个）

DELETE FROM activation_codes;

INSERT INTO activation_codes (code, type, duration_days, used, created_at) VALUES
-- 月卡（31天）10个
('A3K7-M2R9-X5B1', 'month', 31, false, NOW()),
('N4P8-Q1W6-Y7D3', 'month', 31, false, NOW()),
('F2J5-T8H4-C6V0', 'month', 31, false, NOW()),
('G9L1-S3E7-Z2U8', 'month', 31, false, NOW()),
('B6K0-R4A2-X9N5', 'month', 31, false, NOW()),
('M7P3-W1F8-D5J2', 'month', 31, false, NOW()),
('H1T6-V9C4-Y3G8', 'month', 31, false, NOW()),
('E8S2-A5Z7-L4Q0', 'month', 31, false, NOW()),
('U5D9-B2N6-K1R3', 'month', 31, false, NOW()),
('J4W0-F7M3-P8H1', 'month', 31, false, NOW()),
-- 季卡（90天）10个
('K8X2-R5P7-N1C9', 'quarter', 90, false, NOW()),
('Q3G6-W9T4-J7A1', 'quarter', 90, false, NOW()),
('M2F8-D5B0-H3L6', 'quarter', 90, false, NOW()),
('V1S7-Z4E9-U8K3', 'quarter', 90, false, NOW()),
('C6N2-P9W5-A3R8', 'quarter', 90, false, NOW()),
('Y4T1-L7G3-X0J5', 'quarter', 90, false, NOW()),
('B9H4-F2Q8-S6M0', 'quarter', 90, false, NOW()),
('E5A1-D8V3-G7U2', 'quarter', 90, false, NOW()),
('R3J6-K0Z9-W4P7', 'quarter', 90, false, NOW()),
('T8C5-N1X2-Q6H0', 'quarter', 90, false, NOW()),
-- 年卡（365天）10个
('P7L3-Z1U6-W9A5', 'year', 365, false, NOW()),
('G2R8-S5K0-N4C7', 'year', 365, false, NOW()),
('D1J7-V4M2-Y8E3', 'year', 365, false, NOW()),
('F9B4-H6Q1-T3X8', 'year', 365, false, NOW()),
('M5P2-C8W6-A1R4', 'year', 365, false, NOW()),
('U7E0-K3L9-S2G5', 'year', 365, false, NOW()),
('J6N3-B9F1-H4W8', 'year', 365, false, NOW()),
('Q0V5-X2T7-P8D3', 'year', 365, false, NOW()),
('L4A9-G1R6-Z5S0', 'year', 365, false, NOW()),
('C3H8-M2E4-N7J5', 'year', 365, false, NOW());

SELECT code, type, duration_days FROM activation_codes ORDER BY type, code;
