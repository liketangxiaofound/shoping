# 购物商城（Shopping App）

B2C 电商课程设计项目：Vue 3 前端 + Node.js/Express 后端 + PostgreSQL，支持买家购物、卖家后台、管理员数据分析与可选扩展功能（反爬虫、数据大屏、移动端适配等）。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3、Vite、Element Plus、Pinia、Vue Router、ECharts |
| 后端 | Node.js、Express、Prisma、PostgreSQL、Redis（可选） |
| 部署 | Docker Compose（后端 + 数据库 + Redis）、Nginx（前端静态 + `/api` 反代） |

## 目录结构

```
shopping/
├── front/          # 前端
├── back/           # 后端 API
├── 课程设计报告.md  # 课程设计文档
└── README.md
```

## 本地开发

### 环境要求

- Node.js 18+
- PostgreSQL
- Redis（可选，用于商品缓存与反爬虫）

### 后端

```bash
cd back
cp .env.example .env   # 若无 .env，参考 课程设计报告.md 配置 DATABASE_URL、JWT_SECRET、OSS 等
npm install
npx prisma migrate deploy
npx prisma generate
node scripts/seed.js     # 可选：初始化测试数据
npm run dev              # http://localhost:3000
```

### 前端

```bash
cd front
npm install
npm run dev              # http://localhost:3001
```

## 测试账号（seed 后）

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | 123456 |
| 卖家 | seller1 | 123456 |
| 买家 | user1 | 123456 |

## 生产部署（简要）

1. `cd back && docker compose up -d --build`
2. `cd front && npm run build`，将 `dist/*` 部署到 Nginx 站点目录
3. Nginx 配置 `location /api/` 反代到 `http://127.0.0.1:3000`
4. 访问使用 **HTTP**（未配置 SSL 时不要使用 `https://`）

详细步骤见 [课程设计报告.md](./课程设计报告.md) 第 4.2 节。

## 在线演示

- 站点首页：http://8.155.175.119/
- 登录页：http://8.155.175.119/#/login
- 管理后台：http://8.155.175.119/#/admin/dashboard（账号 `admin` / `123456`）
- 卖家中心：http://8.155.175.119/#/seller/products（账号 `seller1` / `123456`）

> 当前为 HTTP 访问，请勿使用 `https://`。

## 仓库

- GitHub: https://github.com/liketangxiaofound/shoping

## 说明

- 敏感配置（`.env`、OSS 密钥等）请勿提交到 Git
- 卖家分类管理由平台维护，卖家端仅可选择已有分类
