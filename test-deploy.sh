#!/bin/bash

echo "🧪 测试部署配置..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请启动 Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "⚠️  请编辑 .env 文件，特别是 JWT_SECRET"
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker system prune -f

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查容器日志
echo "📋 检查容器日志..."
echo "=== 数据库日志 ==="
docker-compose logs db --tail=10

echo "=== 后端日志 ==="
docker-compose logs server --tail=10

echo "=== 前端日志 ==="
docker-compose logs web --tail=10

# 测试健康检查
echo "🏥 测试健康检查..."
echo "数据库健康检查:"
docker-compose exec -T db pg_isready -U postgres

echo "后端健康检查:"
curl -f http://localhost:3000/health || echo "后端健康检查失败"

echo "前端健康检查:"
curl -f http://localhost:80/health || echo "前端健康检查失败"

echo ""
echo "✅ 测试完成！"
echo ""
echo "📱 访问地址："
echo "   - 前端: http://localhost:80"
echo "   - 后端 API: http://localhost:3000"
echo ""
echo "🔧 查看日志："
echo "   docker-compose logs -f"
echo ""
echo "🛑 停止服务："
echo "   docker-compose down"
