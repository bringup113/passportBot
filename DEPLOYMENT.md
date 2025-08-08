# 部署说明

## 🐳 Docker 部署架构

本系统采用完全容器化的部署方式，包含以下服务：

### 服务架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端服务      │    │   后端服务      │    │   数据库服务    │
│   (Nginx)       │    │   (NestJS)      │    │   (PostgreSQL)  │
│   Port: 80      │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 容器化详情

#### 1. 前端服务 (web)
- **基础镜像**: `nginx:alpine`
- **构建过程**: 
  - 使用 `node:18-alpine` 构建 React 应用
  - 将构建结果复制到 nginx 容器
  - 配置 nginx 代理 API 请求到后端
- **端口**: 80
- **功能**: 
  - 提供静态文件服务
  - API 代理到后端
  - SPA 路由支持

#### 2. 后端服务 (server)
- **基础镜像**: `node:18-alpine`
- **构建过程**:
  - 多阶段构建优化镜像大小
  - 安装生产依赖
  - 生成 Prisma 客户端
  - 构建 NestJS 应用
- **端口**: 3000
- **功能**:
  - RESTful API 服务
  - 数据库操作
  - 认证授权
  - 定时任务

#### 3. 数据库服务 (db)
- **基础镜像**: `postgres:16-alpine`
- **端口**: 5432
- **功能**:
  - PostgreSQL 数据库
  - 数据持久化
  - 健康检查

## 🚀 部署步骤

### 方法一：一键部署（推荐）

#### Windows 用户
```cmd
# 1. 复制环境变量文件
copy env.example .env

# 2. 编辑环境变量（重要：修改 JWT_SECRET）
notepad .env

# 3. 运行一键部署
deploy.bat

# 4. 测试部署（可选）
test-deploy.bat
```

#### Linux/macOS 用户
```bash
# 1. 复制环境变量文件
cp env.example .env

# 2. 编辑环境变量（重要：修改 JWT_SECRET）
nano .env

# 3. 给脚本执行权限
chmod +x deploy.sh test-deploy.sh

# 4. 运行一键部署
./deploy.sh

# 5. 测试部署（可选）
./test-deploy.sh
```

### 方法二：手动部署

```bash
# 1. 构建所有镜像
docker-compose -f docker-compose.prod.yml build

# 2. 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 运行数据库迁移
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# 4. 生成 Prisma 客户端
docker-compose -f docker-compose.prod.yml exec server npx prisma generate

# 5. 填充初始数据
docker-compose -f docker-compose.prod.yml exec server npm run prisma:seed
```

## 🔧 环境变量配置

### 必需的环境变量
```env
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=visa

# 后端配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 可选的环境变量
```env
# 端口配置
DB_PORT=5432
SERVER_PORT=3000
WEB_PORT=80

# 环境配置
NODE_ENV=production
```

## 📊 服务状态检查

### 查看所有服务状态
```bash
docker-compose -f docker-compose.prod.yml ps
```

### 查看服务日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f server
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f db
```

### 健康检查
```bash
# 数据库健康检查
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# 后端健康检查
curl http://localhost:3000/health

# 前端健康检查
curl http://localhost:80/health
```

## 🔍 故障排除

### 常见问题

#### 1. 端口冲突
如果端口被占用，修改 `.env` 文件中的端口配置：
```env
DB_PORT=5433
SERVER_PORT=3001
WEB_PORT=8080
```

#### 2. 数据库连接失败
检查数据库服务是否正常启动：
```bash
docker-compose -f docker-compose.prod.yml logs db
```

#### 3. 前端无法访问后端 API
检查 nginx 配置和网络连接：
```bash
docker-compose -f docker-compose.prod.yml exec web nginx -t
```

#### 4. 构建失败
清理缓存重新构建：
```bash
docker-compose -f docker-compose.prod.yml down
docker system prune -f
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 调试命令

#### 进入容器调试
```bash
# 进入后端容器
docker-compose -f docker-compose.prod.yml exec server sh

# 进入前端容器
docker-compose -f docker-compose.prod.yml exec web sh

# 进入数据库容器
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d visa
```

#### 查看容器资源使用
```bash
docker stats
```

## 🔄 更新部署

### 重新构建并部署
```bash
# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 运行迁移
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 仅更新代码（不重新构建）
```bash
# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

## 🛡️ 安全建议

1. **修改默认密码**: 更改 `.env` 文件中的数据库密码
2. **设置强 JWT 密钥**: 使用强随机字符串作为 JWT_SECRET
3. **限制端口访问**: 在生产环境中限制端口访问
4. **定期更新镜像**: 定期更新基础镜像以修复安全漏洞
5. **备份数据**: 定期备份数据库数据

## 📈 性能优化

1. **资源限制**: 在 docker-compose.yml 中设置资源限制
2. **缓存优化**: 前端静态资源已配置缓存
3. **数据库优化**: 根据数据量调整 PostgreSQL 配置
4. **监控**: 使用 Docker 监控工具监控容器状态

## 🆘 获取帮助

如果遇到部署问题：

1. 查看容器日志: `docker-compose -f docker-compose.prod.yml logs`
2. 检查服务状态: `docker-compose -f docker-compose.prod.yml ps`
3. 运行测试脚本: `./test-deploy.sh` 或 `test-deploy.bat`
4. 查看本文档的故障排除部分
