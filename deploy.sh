#!/bin/bash

# 护照签证管理系统一键部署脚本

set -e

echo "🚀 开始部署护照签证管理系统..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo
    echo "⚠️  SECURITY WARNING: JWT_SECRET must be changed to a secure key!"
    echo
    echo "To generate a secure JWT secret, run:"
    echo "  chmod +x generate-secret.sh"
    echo "  ./generate-secret.sh"
    echo
    echo "Or manually edit .env file and change JWT_SECRET to a secure value."
    echo
    read -p "Press Enter to continue..."
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
docker-compose exec -T server npx prisma migrate deploy

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
docker-compose exec -T server npx prisma generate

# 填充初始数据（如果需要）
echo "📊 填充初始数据..."
docker-compose exec -T server npm run prisma:seed || echo "⚠️  初始数据填充失败，请手动检查"

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 访问地址："
echo "   - 前端: http://localhost:80"
echo "   - 后端 API: http://localhost:3000"
echo ""
echo "🔧 常用命令："
echo "   - 查看日志: docker-compose logs -f"
echo "   - 停止服务: docker-compose down"
echo "   - 重启服务: docker-compose restart"
echo ""
echo
echo "⚠️  SECURITY WARNING:"
echo "    - Make sure JWT_SECRET in .env file is changed to a secure key"
echo "    - Run './generate-secret.sh' to generate a secure key"
echo "    - Never commit .env file to version control"
echo
