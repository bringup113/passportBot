-- 等待PostgreSQL完全启动
SELECT pg_sleep(5);

-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 注意：这个脚本只会在数据库首次创建时运行
-- 实际的表结构会通过Prisma迁移来管理
-- 这里只是确保数据库连接正常
SELECT 'Database initialization script completed' as status;
