# 更完善的 Dockerfile
FROM node:18-alpine

# 使用国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统工具
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app

# 设置虚拟环境变量
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# 复制包文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --only=production

# 复制Prisma schema
COPY prisma ./prisma/

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 检查入口文件并创建启动脚本
RUN echo "检查应用入口文件..." && \
    ls -la && \
    if [ -f "src/app.js" ]; then \
        echo "找到入口文件: src/app.js"; \
        ENTRY_FILE="src/app.js"; \
    elif [ -f "app.js" ]; then \
        echo "找到入口文件: app.js"; \
        ENTRY_FILE="app.js"; \
    else \
        echo "错误：未找到入口文件"; \
        find . -name "*.js" | head -10; \
        exit 1; \
    fi && \
    echo "入口文件: $ENTRY_FILE" > /app/entrypoint.info

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app  # 修正为绝对路径

USER nodeuser

EXPOSE 3000

# 智能启动命令
CMD ["sh", "-c", "npx prisma generate && (node src/app.js || node app.js || echo '未找到入口文件')"]