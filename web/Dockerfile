# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码 - 将源代码复制放在依赖安装之后，这样代码变更时不会影响依赖缓存
COPY . .

# 添加时间戳来强制重新构建（可选）
ARG BUILD_DATE
RUN echo "Build date: ${BUILD_DATE:-$(date)}"

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine AS production

# 复制构建结果到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx-user
RUN adduser -S nginx-user -u 1001

# 更改文件所有权
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html
RUN chown -R nginx-user:nginx-user /var/cache/nginx
RUN chown -R nginx-user:nginx-user /var/log/nginx
RUN chown -R nginx-user:nginx-user /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginx-user:nginx-user /var/run/nginx.pid

# 切换到非 root 用户
USER nginx-user

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
