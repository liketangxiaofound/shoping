# back/manage.sh
#!/bin/bash
case $1 in
    start)
        echo "🚀 启动服务..."
        docker-compose up -d
        ;;
    stop)
        echo "🛑 停止服务..."
        docker-compose down
        ;;
    restart)
        echo "🔄 重启服务..."
        docker-compose restart
        ;;
    status)
        echo "📊 服务状态:"
        docker-compose ps
        echo ""
        echo "📈 资源使用:"
        docker stats --no-stream
        ;;
    logs)
        echo "📄 查看日志..."
        docker-compose logs -f
        ;;
    logs-app)
        echo "📄 查看应用日志..."
        docker-compose logs -f app
        ;;
    logs-db)
        echo "🗄️ 查看数据库日志..."
        docker-compose logs -f db
        ;;
    migrate)
        echo "🗄️ 执行数据库迁移..."
        docker-compose exec app npx prisma migrate deploy
        ;;
    studio)
        echo "🖥️ 启动Prisma Studio..."
        docker-compose exec app npx prisma studio
        ;;
    backup)
        echo "💾 备份数据库..."
        docker-compose exec db pg_dump -U postgres shoppingdb > backup_$(date +%Y%m%d_%H%M%S).sql
        echo "✅ 备份完成"
        ;;
    shell)
        echo "🐚 进入应用容器..."
        docker-compose exec app sh
        ;;
    db)
        echo "🗄️ 进入数据库..."
        docker-compose exec db psql -U postgres -d shoppingdb
        ;;
    update)
        echo "🔄 更新代码并重新部署..."
        git pull origin main
        docker-compose down
        docker-compose build
        docker-compose up -d
        docker-compose exec app npx prisma migrate deploy
        echo "✅ 更新完成"
        ;;
    *)
        echo "用法: ./manage.sh {start|stop|restart|status|logs|logs-app|logs-db|migrate|studio|backup|shell|db|update}"
        echo ""
        echo "命令说明:"
        echo "  start      - 启动服务"
        echo "  stop       - 停止服务"
        echo "  restart    - 重启服务"
        echo "  status     - 查看状态"
        echo "  logs       - 查看所有日志"
        echo "  logs-app   - 查看应用日志"
        echo "  logs-db    - 查看数据库日志"
        echo "  migrate    - 执行数据库迁移"
        echo "  studio     - 启动Prisma Studio"
        echo "  backup     - 备份数据库"
        echo "  shell      - 进入应用容器"
        echo "  db         - 进入数据库"
        echo "  update     - 更新代码并重新部署"
        ;;
esac