# 护照签证管理系统

一个现代化的护照和签证管理系统，提供完整的客户管理、护照跟踪、签证到期提醒和通知功能。

## 🚀 功能特性

### 核心功能
- **客户管理** - 管理客户信息，支持客户分组和备注
- **护照管理** - 完整的护照信息管理，包括到期日期跟踪
- **签证管理** - 签证信息录入和到期提醒
- **逾期管理** - 自动检测护照和签证的逾期情况
- **通知系统** - 基于 Telegram 的到期提醒通知
- **用户管理** - 多用户权限管理
- **操作日志** - 完整的审计日志记录

### 技术特性
- **现代化前端** - React + TypeScript + Ant Design
- **高性能后端** - NestJS + Prisma + PostgreSQL
- **实时通知** - Telegram Bot 集成
- **响应式设计** - 支持桌面和移动设备
- **数据安全** - JWT 认证和密码加密

## 🛠 技术栈

### 前端 (web/)
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Vite** - 构建工具

### 后端 (server/)
- **NestJS** - Node.js 框架
- **Prisma** - 数据库 ORM
- **PostgreSQL** - 数据库
- **JWT** - 身份认证
- **Passport** - 认证策略
- **Cron** - 定时任务

### 基础设施
- **Docker Compose** - 容器化部署
- **PostgreSQL 16** - 数据库服务

## 📋 系统要求

- Node.js 18+
- Docker & Docker Compose
- Git

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd visa
```

### 2. 启动数据库
```bash
docker-compose up -d
```

### 3. 安装依赖
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

### 4. 环境配置
在 `server/` 目录下创建 `.env` 文件：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/visa"
JWT_SECRET="your-jwt-secret-key"
PORT=3000
```

### 5. 数据库迁移
```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 6. 启动服务
```bash
# 启动后端服务
cd server
npm run start:dev

# 启动前端服务（新终端）
cd web
npm run dev
```

### 7. 访问应用
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000

## 📁 项目结构

```
visa/
├── docker-compose.yml          # Docker 配置
├── README.md                   # 项目文档
├── server/                     # 后端服务
│   ├── src/
│   │   ├── auth/              # 认证模块
│   │   ├── clients/           # 客户管理
│   │   ├── passports/         # 护照管理
│   │   ├── visas/             # 签证管理
│   │   ├── overdue/           # 逾期管理
│   │   ├── notify/            # 通知系统
│   │   ├── users/             # 用户管理
│   │   ├── audit/             # 审计日志
│   │   └── prisma/            # 数据库服务
│   ├── prisma/
│   │   ├── schema.prisma      # 数据库模型
│   │   └── seed.ts            # 初始数据
│   └── package.json
└── web/                       # 前端应用
    ├── src/
    │   ├── pages/             # 页面组件
    │   ├── api/               # API 接口
    │   └── App.tsx            # 主应用
    └── package.json
```

## 🔧 开发指南

### 后端开发
```bash
cd server

# 开发模式
npm run start:dev

# 数据库操作
npm run prisma:generate    # 生成 Prisma 客户端
npm run prisma:migrate     # 运行数据库迁移
npm run prisma:seed        # 填充初始数据

# 测试
npm run test
npm run test:e2e
```

### 前端开发
```bash
cd web

# 开发模式
npm run dev

# 构建
npm run build

# 代码检查
npm run lint
```

## 📊 数据库模型

### 主要实体
- **User** - 系统用户
- **Client** - 客户信息
- **Passport** - 护照信息
- **Visa** - 签证信息
- **NotifySetting** - 通知设置
- **TelegramWhitelist** - Telegram 白名单
- **AuditLog** - 审计日志

## 🔐 认证与授权

系统使用 JWT 进行身份认证：
- 用户登录后获得 JWT Token
- Token 存储在 localStorage
- 所有 API 请求需要携带 Token
- 支持 Token 过期自动跳转登录

## 📱 通知系统

### Telegram 集成
- 支持 Telegram Bot 通知
- 可配置多个到期提醒阈值（15天、30天、90天、180天）
- 支持白名单管理
- 实时通知发送状态

### 通知配置
1. 在 Telegram 中创建 Bot
2. 获取 Bot Token
3. 在系统中配置 Token
4. 添加用户到白名单
5. 测试通知功能

## 🚀 部署

### 一键部署（推荐）

#### 1. 准备环境
确保已安装 Docker 和 Docker Compose：
```bash
# 检查 Docker 版本
docker --version
docker-compose --version
```

#### 2. 配置环境变量
```bash
# 复制环境变量示例文件
cp env.example .env

# 生成安全的 JWT 密钥（推荐）
chmod +x generate-secret.sh
./generate-secret.sh

# 或者手动编辑环境变量
nano .env
```

#### 3. 一键部署

**Linux/macOS:**
```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 运行一键部署
./deploy.sh
```

**Windows:**
```cmd
# 生成安全的 JWT 密钥（推荐）
generate-secret.bat

# 运行一键部署
deploy.bat
```

#### 4. 测试部署（可选）
```bash
# Linux/macOS
chmod +x test-deploy.sh
./test-deploy.sh

# Windows
test-deploy.bat
```

### 手动部署

#### 开发环境
```bash
# 启动数据库
docker-compose up -d

# 安装依赖并启动服务
cd server && npm install && npm run start:dev
cd ../web && npm install && npm run dev
```

#### 生产环境
```bash
# 使用默认配置（推荐）
docker-compose up -d

# 运行数据库迁移
docker-compose exec server npx prisma migrate deploy

# 或者使用生产环境配置
docker-compose -f docker-compose.prod.yml up -d
```

### 环境变量配置

#### 必需的环境变量
- `POSTGRES_USER` - 数据库用户名（默认：postgres）
- `POSTGRES_PASSWORD` - 数据库密码（默认：postgres）
- `POSTGRES_DB` - 数据库名称（默认：visa）
- `JWT_SECRET` - JWT 密钥（**必须修改为安全的密钥**）

#### 🔐 安全密钥配置
**重要：** JWT_SECRET 必须使用安全的随机密钥，不能使用默认值。

**生成安全密钥的方法：**

1. **使用提供的脚本（推荐）：**
   ```bash
   # Linux/macOS
   chmod +x generate-secret.sh
   ./generate-secret.sh
   
   # Windows
   generate-secret.bat
   ```

2. **使用在线工具：**
   - 访问：https://generate-secret.vercel.app/32
   - 复制生成的密钥到 .env 文件

3. **使用命令行：**
   ```bash
   # 使用 OpenSSL
   openssl rand -base64 32
   
   # 使用 Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

**安全提醒：**
- 密钥长度至少 32 字符
- 不要使用简单字符串或默认值
- 不要将 .env 文件提交到版本控制系统
- 在生产环境中使用更安全的密钥管理方式

#### 可选的环境变量
- `DB_PORT` - 数据库端口（默认：5432）
- `SERVER_PORT` - 后端服务端口（默认：3000）
- `WEB_PORT` - 前端服务端口（默认：80）
- `NGINX_PORT` - Nginx 代理端口（默认：8080）
- `NODE_ENV` - 环境标识（默认：production）

### 访问地址
部署完成后，可以通过以下地址访问：
- **前端应用**: http://localhost:80
- **后端 API**: http://localhost:3000
- **数据库**: localhost:5432

### 常用 Docker 命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 使用生产环境配置（可选）
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您遇到任何问题或有建议，请：
1. 查看 [Issues](../../issues)
2. 创建新的 Issue
3. 联系开发团队

---

**注意**: 这是一个内部管理系统，请确保在生产环境中正确配置安全设置。
