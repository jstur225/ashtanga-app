-- 检查 practice_records 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'practice_records';

-- 检查主键约束
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
    AND tc.constraint_type = 'PRIMARY KEY';

-- 检查唯一约束
SELECT
    tc.constraint_name,
    kcu.column_name
FROM
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
WHERE
    tc.table_name = 'practice_records'
    AND tc.constraint_type = 'UNIQUE';

-- 检查表中的记录数量
SELECT COUNT(*) as total_records FROM practice_records;

-- 检查是否有重复ID
SELECT id, COUNT(*) as count
FROM practice_records
GROUP BY id
HAVING COUNT(*) > 1;
