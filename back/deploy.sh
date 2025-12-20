# back/deploy.sh
#!/bin/bash
set -e

echo "🚀 开始部署Node.js + PostgreSQL后端..."

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，正在安装..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker安装完成"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，正在安装..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️ 未找到.env文件，从.example复制"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️ 请编辑.env文件，设置正确的数据库密码等配置"
        exit 1
    else
        echo "❌ 未找到.env.example文件"
        exit 1
    fi
fi

# 停止并删除现有容器
echo "🛑 停止现有服务..."
docker-compose down || true

# 构建镜像
echo "🔨 构建Docker镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 执行数据库迁移
echo "🗄️ 执行数据库迁移..."
docker-compose exec -T app npx prisma migrate deploy || echo "迁移可能已执行"

# 检查服务状态
echo "📊 服务状态:"
docker-compose ps

# 查看日志
echo "📄 查看应用日志:"
docker-compose logs app --tail=20

echo ""
echo "🎉 部署完成！"
echo "🌐 API地址: http://localhost:3000"
echo "🗄️ 数据库地址: localhost:5432"
echo "🔧 管理命令:"
echo "  docker-compose logs -f app    # 查看应用日志"
echo "  docker-compose exec app sh    # 进入应用容器"
echo "  docker-compose exec db psql -U postgres -d shoppingdb  # 进入数据库"