-- 为 practice_records 表添加练习开始时间字段
-- 修改：从 VARCHAR(5) 改为 TIMESTAMPTZ 以存储完整 ISO 8601 时间戳

-- 如果列不存在则添加
ALTER TABLE practice_records
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;

-- 如果列已存在但类型不对（从之前版本升级），修改类型
-- 注：VARCHAR 数据会自动转换，无法转换的会变为 NULL
DO $$
BEGIN
    -- 检查列是否存在且是字符类型（VARCHAR/TEXT）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'practice_records'
        AND column_name = 'start_time'
        AND data_type IN ('character varying', 'text')
    ) THEN
        -- 修改列类型为 TIMESTAMPTZ（现有数据会被转换或设为 NULL）
        ALTER TABLE practice_records
        ALTER COLUMN start_time TYPE TIMESTAMPTZ
        USING CASE
            WHEN start_time IS NULL THEN NULL
            -- 尝试将 HH:MM 格式与当前日期组合（无法确定原始日期，使用当前日期）
            ELSE CURRENT_DATE + start_time::TIME
        END;
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN practice_records.start_time IS '练习开始时间，ISO 8601 格式（如 2026-03-05T11:53:00+08:00），包含完整日期时间和时区信息';

-- 注：TIMESTAMPTZ 类型会自动处理时区转换，存储为 UTC，查询时根据会话时区显示
