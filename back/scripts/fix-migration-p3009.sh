#!/bin/sh
# 修复 Prisma P3009：迁移 20260527100000 失败后容器无法启动
# 用法（在 backend 目录）: docker compose run --rm app sh scripts/fix-migration-p3009.sh

set -e
MIGRATION_NAME="20260527100000_add_category_activity_seller"

echo "1) 标记失败迁移为已回滚..."
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"

echo "2) 重新应用迁移..."
npx prisma migrate deploy

echo "3) 完成。请执行: docker compose up -d"
