-- 在 Supabase SQL Editor 中执行以下语句

-- 1. 给 practice_records 表添加 updated_at 字段
ALTER TABLE practice_records
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. 为已有记录设置 updated_at = created_at
UPDATE practice_records
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 3. 创建触发器：更新记录时自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS update_practice_records_updated_at ON practice_records;

-- 5. 创建触发器
CREATE TRIGGER update_practice_records_updated_at
    BEFORE UPDATE ON practice_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
