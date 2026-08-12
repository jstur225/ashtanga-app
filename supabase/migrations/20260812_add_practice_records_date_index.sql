-- 2026-08-12 为 practice_records(date) 添加索引
-- 背景：/api/stats/today 按 date 统计当日练习次数，此前无索引导致全表扫描。
-- 网页版与小程序共用该表；索引只加速查询，不改任何业务行为。
CREATE INDEX IF NOT EXISTS idx_practice_records_date ON practice_records (date);