#!/bin/bash

echo "========================================"
echo "生成安全的 JWT 密钥"
echo "========================================"
echo

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，无法生成密钥"
    echo
    echo "请手动生成安全的 JWT 密钥："
    echo "1. 访问：https://generate-secret.vercel.app/32"
    echo "2. 复制生成的密钥"
    echo "3. 替换 .env 文件中的 JWT_SECRET"
    echo
    exit 1
fi

echo "🔐 正在生成安全的 JWT 密钥..."
echo

# 生成密钥
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "✅ 生成的 JWT 密钥："
echo
echo "$SECRET"
echo
echo "📝 请将此密钥复制到 .env 文件中的 JWT_SECRET 字段"
echo

# 检查 .env 文件是否存在
if [ -f .env ]; then
    echo "🔍 检测到 .env 文件，是否要自动更新？(y/N)"
    read -r choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        echo
        echo "📝 正在更新 .env 文件..."
        
        # 使用 sed 替换 JWT_SECRET
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS 版本
            sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$SECRET/" .env
        else
            # Linux 版本
            sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$SECRET/" .env
        fi
        
        echo "✅ .env 文件已更新！"
        echo
        echo "⚠️  重要提醒："
        echo "- 请确保 .env 文件不会被提交到版本控制系统"
        echo "- 在生产环境中，请使用更安全的密钥管理方式"
        echo
    else
        echo
        echo "ℹ️  请手动将密钥复制到 .env 文件中"
        echo
    fi
else
    echo "ℹ️  未检测到 .env 文件，请先运行部署脚本创建 .env 文件"
    echo
fi

echo "按任意键继续..."
read -n 1
