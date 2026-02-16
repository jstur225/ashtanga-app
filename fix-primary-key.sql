-- 修复：添加主键约束（如果还没有的话）
-- 注意：如果表中已有数据且 id 有重复，这个操作会失败，需要先清理重复数据

-- 方法1：如果 id 字段已经是主键，跳过
DO $$
BEGIN
    -- 检查是否已有主键
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'practice_records'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- 添加主键约束
        ALTER TABLE practice_records
        ADD PRIMARY KEY (id);

        RAISE NOTICE '主键约束添加成功';
    ELSE
        RAISE NOTICE '主键约束已存在';
    END IF;
END $$;

-- 方法2：或者添加唯一约束（如果不适合做主键）
-- ALTER TABLE practice_records
-- ADD CONSTRAINT practice_records_id_unique UNIQUE (id);

-- 验证修复结果
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
WHERE
    tc.table_name = 'practice_records'
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE');
