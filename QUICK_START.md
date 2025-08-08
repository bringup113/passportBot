# 🚀 快速开始

## 一键部署（最简单的方法）

### Windows 用户
```cmd
# 1. 复制环境变量文件
copy env.example .env

# 2. 生成安全的 JWT 密钥（推荐）
generate-secret.bat

# 3. 运行一键部署
deploy.bat
```

### Linux/macOS 用户
```bash
# 1. 复制环境变量文件
cp env.example .env

# 2. 生成安全的 JWT 密钥（推荐）
chmod +x generate-secret.sh
./generate-secret.sh

# 3. 给脚本执行权限
chmod +x deploy.sh

# 4. 运行一键部署
./deploy.sh
```

## 手动部署（如果脚本有问题）

```bash
# 1. 构建并启动所有服务
docker-compose up -d --build

# 2. 等待服务启动后，运行数据库迁移
docker-compose exec server npx prisma migrate deploy

# 3. 生成 Prisma 客户端
docker-compose exec server npx prisma generate

# 4. 填充初始数据
docker-compose exec server npm run prisma:seed
```

## 访问应用

部署完成后，访问以下地址：

- **前端应用**: http://localhost:80
- **后端 API**: http://localhost:3000

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

## 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=visa

# 后端配置（重要：必须修改为安全的密钥）
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET_KEY_AT_LEAST_32_CHARACTERS

# 端口配置（可选）
DB_PORT=5432
SERVER_PORT=3000
WEB_PORT=80
```

## 故障排除

### 1. 端口冲突
如果端口被占用，修改 `.env` 文件中的端口配置。

### 2. 构建失败
```bash
# 清理缓存重新构建
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### 3. 数据库连接失败
```bash
# 检查数据库日志
docker-compose logs db
```

### 4. 查看详细日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f db
```

## 测试部署

运行测试脚本验证部署是否成功：

```bash
# Linux/macOS
./test-deploy.sh

# Windows
test-deploy.bat
```

---

**注意**: 
- 请确保在生产环境中修改 `JWT_SECRET` 为安全的密钥！
- 使用 `generate-secret.bat` (Windows) 或 `./generate-secret.sh` (Linux/macOS) 生成安全密钥
- 不要将 `.env` 文件提交到版本控制系统
