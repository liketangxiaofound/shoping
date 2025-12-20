#!/bin/bash
echo "🎨 部署 Vue.js 前端项目..."
echo "=========================================="

# 项目目录
PROJECT_DIR="/home/linger/projects/shopping-app/frontend"

# 检查项目目录
cd "$PROJECT_DIR" || { echo "❌ 无法进入项目目录: $PROJECT_DIR"; exit 1; }

echo "📁 当前目录: $(pwd)"
echo "📦 项目结构:"
ls -la

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json"
    echo "请上传项目文件到: $PROJECT_DIR"
    exit 1
fi

if [ ! -d "src" ]; then
    echo "❌ 未找到 src 目录"
    echo "请确保上传了完整的项目结构"
    exit 1
fi

# 1. 清理旧文件
echo ""
echo "🧹 清理旧文件..."
rm -rf dist node_modules

# 2. 检查 Node.js 版本
echo ""
echo "🟢 检查 Node.js 版本..."
node --version
npm --version

# 3. 安装依赖
echo ""
echo "📦 安装依赖..."
echo "这可能需要几分钟，请稍候..."

# 设置 npm 镜像（如果在中国）
# npm config set registry https://registry.npmmirror.com

npm install

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ npm install 失败，请检查网络连接"
    exit 1
fi

echo "✅ 依赖安装完成"

# 4. 检查 package.json 中的脚本
echo ""
echo "📄 检查 package.json 脚本..."
if [ -f "package.json" ]; then
    echo "可用的脚本:"
    cat package.json | grep '"scripts"' -A 20
fi

# 5. 修改 API 配置（如果需要）
echo ""
echo "🔧 修改 API 配置..."
API_TARGET="http://8.155.175.119:3000"

# 查找并修改 API 配置文件
find src -type f -name "*.js" -o -name "*.ts" -o -name "*.vue" | xargs grep -l "localhost:3000\|127.0.0.1:3000" 2>/dev/null | while read file; do
    echo "修改文件: $file"
    sed -i "s|http://localhost:3000|$API_TARGET|g" "$file"
    sed -i "s|http://127.0.0.1:3000|$API_TARGET|g" "$file"
    sed -i "s|localhost:3000|8.155.175.119:3000|g" "$file"
done

# 6. 构建项目
echo ""
echo "🔨 开始构建项目..."
echo "构建中..."

# 尝试不同的构建命令
if npm run build 2>/dev/null; then
    echo "✅ 使用 'npm run build' 构建成功"
elif npm run build:prod 2>/dev/null; then
    echo "✅ 使用 'npm run build:prod' 构建成功"
elif npm run build:production 2>/dev/null; then
    echo "✅ 使用 'npm run build:production' 构建成功"
else
    # 如果都没有，尝试使用 vite
    if [ -f "vite.config.js" ]; then
        npx vite build
        if [ $? -eq 0 ]; then
            echo "✅ 使用 vite 构建成功"
        else
            echo "❌ 构建失败，请检查错误信息"
            exit 1
        fi
    else
        echo "❌ 没有找到构建脚本"
        echo "请检查 package.json 中的 scripts 部分"
        exit 1
    fi
fi

# 7. 检查构建结果
echo ""
echo "📁 检查构建结果..."
if [ -d "dist" ]; then
    echo "✅ 构建成功！"
    echo ""
    echo "📊 构建文件统计:"
    du -sh dist/
    echo ""
    echo "📁 目录内容:"
    ls -lh dist/
    echo ""
    echo "📄 index.html 内容预览:"
    head -20 dist/index.html
else
    echo "❌ 构建失败，未生成 dist 目录"
    exit 1
fi

# 8. 创建 Nginx 配置
echo ""
echo "🌐 创建 Nginx 配置..."

sudo tee /etc/nginx/sites-available/shopping-frontend << 'NGINX'
server {
    listen 80;
    server_name 8.155.175.119;
    
    # 根目录指向构建结果
    root /home/linger/projects/shopping-app/frontend/dist;
    index index.html;
    
    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 代理后端 API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 上传文件访问
    location /uploads/ {
        alias /home/linger/projects/shopping-app/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
    
    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
NGINX

# 启用站点
sudo ln -sf /etc/nginx/sites-available/shopping-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t
if [ $? -eq 0 ]; then
    # 重启 Nginx
    sudo systemctl restart nginx
    echo "✅ Nginx 配置已应用"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "🎉 Vue.js 前端部署完成！"
echo ""
echo "🌍 访问地址: http://8.155.175.119"
echo ""
echo "📁 项目位置: $PROJECT_DIR"
echo "📁 构建目录: $PROJECT_DIR/dist"
echo ""
echo "🛠️ 常用命令:"
echo "  cd $PROJECT_DIR"
echo "  npm run dev        # 开发模式（如果配置了）"
echo "  npm run build      # 重新构建"
echo ""
echo "📄 查看日志:"
echo "  sudo tail -f /var/log/nginx/access.log"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔄 重新部署:"
echo "  rm -rf dist node_modules"
echo "  npm install"
echo "  npm run build"
echo "  sudo systemctl reload nginx"
echo "=========================================="
EOF