# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

WORKDIR /app

# 安装 dumb-init 和 curl 用于进程管理和健康检查
RUN apk add --no-cache dumb-init curl

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制 Prisma 文件
COPY prisma ./prisma/

# 生成 Prisma 客户端
RUN npx prisma generate

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist

# 复制启动脚本
COPY start.sh ./start.sh

# 创建必要的目录
RUN mkdir -p /app/logs

# 更改文件所有权
RUN chown -R nestjs:nodejs /app

# 设置启动脚本权限
RUN chmod +x start.sh

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]
