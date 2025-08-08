# GitHub 一键部署指南

## 🚀 快速开始

### Windows 用户
```cmd
# 1. 复制环境变量文件
copy env.github.example .env

# 2. 编辑 .env 文件，配置 GitHub 仓库信息
notepad .env

# 3. 生成安全的 JWT 密钥
generate-secret.bat

# 4. 运行 GitHub 部署
deploy-github.bat
```

### Linux/macOS 用户
```bash
# 1. 复制环境变量文件
cp env.github.example .env

# 2. 编辑 .env 文件，配置 GitHub 仓库信息
nano .env

# 3. 生成安全的 JWT 密钥
chmod +x generate-secret.sh
./generate-secret.sh

# 4. 给部署脚本执行权限
chmod +x deploy-github.sh

# 5. 运行 GitHub 部署
./deploy-github.sh
```

## 📋 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# GitHub 仓库配置
GITHUB_REPO=your-username/visa
GITHUB_BRANCH=main

# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=visa
DB_PORT=5432

# 后端服务配置
SERVER_PORT=3000

# 安全密钥（必须修改）
JWT_SECRET=your-secure-jwt-secret-key

# 前端服务配置
WEB_PORT=80

# 环境配置
NODE_ENV=production
```

## 🔧 手动部署

如果脚本有问题，可以手动执行：

```bash
# 1. 停止现有容器
docker-compose -f docker-compose.github.yml down

# 2. 清理缓存
docker system prune -f

# 3. 构建并启动服务
docker-compose -f docker-compose.github.yml up -d --build

# 4. 等待服务启动后，运行数据库迁移
docker-compose -f docker-compose.github.yml exec server npx prisma migrate deploy

# 5. 生成 Prisma 客户端
docker-compose -f docker-compose.github.yml exec server npx prisma generate

# 6. 填充初始数据
docker-compose -f docker-compose.github.yml exec server npm run prisma:seed
```

## 📱 访问应用

部署完成后，访问以下地址：

- **前端应用**: http://localhost:80
- **后端 API**: http://localhost:3000

## 🔍 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.github.yml ps

# 查看日志
docker-compose -f docker-compose.github.yml logs -f

# 停止服务
docker-compose -f docker-compose.github.yml down

# 重启服务
docker-compose -f docker-compose.github.yml restart

# 重新构建并启动
docker-compose -f docker-compose.github.yml up -d --build
```

## ⚠️ 重要提醒

1. **GitHub 仓库配置**：
   - 确保 `GITHUB_REPO` 指向正确的仓库地址
   - 确保仓库是公开的，或者配置了适当的访问权限

2. **安全配置**：
   - 必须修改 `JWT_SECRET` 为安全的密钥
   - 不要将 `.env` 文件提交到版本控制系统

3. **网络要求**：
   - 确保服务器能够访问 GitHub
   - 如果在内网环境，可能需要配置代理

4. **首次部署**：
   - 首次部署可能需要较长时间，因为需要从 GitHub 下载代码
   - 建议在稳定的网络环境下进行

## 🐛 故障排除

### 1. 构建失败
```bash
# 检查网络连接
curl -f https://github.com

# 清理 Docker 缓存
docker system prune -a -f

# 重新构建
docker-compose -f docker-compose.github.yml build --no-cache
```

### 2. 服务启动失败
```bash
# 查看详细日志
docker-compose -f docker-compose.github.yml logs server
docker-compose -f docker-compose.github.yml logs web
```

### 3. 数据库连接失败
```bash
# 检查数据库状态
docker-compose -f docker-compose.github.yml logs db
```

## 📞 支持

如果遇到问题，请：
1. 检查 `.env` 文件配置是否正确
2. 查看 Docker 日志获取详细错误信息
3. 确保 GitHub 仓库地址和分支名称正确
