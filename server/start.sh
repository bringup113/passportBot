#!/bin/sh

echo "等待数据库连接..."
until npx prisma db execute --url "$DATABASE_URL" --stdin <<EOF
SELECT 1
EOF
do
  echo "数据库不可用，等待..."
  sleep 2
done

echo "数据库已连接，开始运行迁移..."
npx prisma migrate deploy

echo "迁移完成，运行种子脚本..."
npx tsx prisma/seed.ts

echo "种子脚本完成，启动应用..."
exec node dist/src/main.js
