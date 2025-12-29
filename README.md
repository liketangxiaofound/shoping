Shopping App
学号：202330450191
姓名：陈焕林
部署：见实验报告
简介
这是一个示例电商项目，后端使用 Node.js + Express + Prisma，前端使用 Vue 3 + Vite。仓库包含后端服务、前端应用、数据库迁移与部署脚本等。

📁 项目结构 & 主要文件说明
back — 后端（Express + Prisma）

src/app.js：后端应用入口
src/controllers/：处理请求、组织响应的控制器（如 productController.js、orderController.js 等）
src/routes/：路由定义（如 productRoutes.js、orderRoutes.js）
src/services/：业务逻辑与第三方集成（如 emailService.js、orderService.js）
src/middleware/：中间件（auth.js, admin.js）
prisma/：数据库 schema（schema.prisma）及迁移脚本
scripts/seed.js：数据库种子脚本
Dockerfile、docker-compose.yml（若存在于 back）：后端容器化与部署配置
front — 前端（Vue 3 + Vite）

src/main.js：前端入口
src/App.vue：根组件
src/views/：页面视图（如 Home.vue, Cart.vue, Checkout.vue）
src/store/：状态管理（cart.js, user.js）
src/utils/request.js：前端 HTTP 请求封装
vite.config.js：构建及本地开发配置
deploy-vue-frontend.sh：前端部署脚本（仓库根目录）
根目录重要文件

docker-compose.yml：整体服务编排（可用于本地或生产部署）
README.md：项目说明（本文件）
.gitlab-ci.yml：CI/CD 配置（若存在）
ci-test.txt、其他脚本与配置文件

▶️ 快速运行（开发环境示例）
后端：
进入 back，安装依赖：npm install
配置 .env（参考 .env 示例），运行：npm run dev
前端：
进入 front，安装依赖：npm install
运行：npm run dev
使用 Docker（可选）：
在仓库根目录运行：docker-compose up --build

ℹ️ 备注
数据库 schema 位于 schema.prisma，迁移文件在 migrations。
若需运行种子数据，使用 node back/scripts/seed.js（根据实际脚本说明）。
若希望我直接将此内容写入项目根目录的 README.md，请回复“保存”或授权我更新，我会替你写入并提交更改。✅
