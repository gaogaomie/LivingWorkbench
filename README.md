# 日常集 · 生活工作台

一个把日常账目、习惯、身体数据、日程、购物愿望和书影音记录收进同一处的个人生活工作台。所有记录会统一汇入“今日总览”和“时光档案”，方便快速记录，也方便在以后回看某一天。

## 主要功能

- **今日总览**：聚合生活指数、快捷记录、财务、习惯、待办和最近动态。
- **记账理财**：记录收支、设置月度预算，并按月份和分类查看资金流向。
- **习惯健康**：管理布尔、计数和时长习惯，查看连续完成情况与 30 天热力图。
- **减脂健身**：记录体重、体脂与运动，观察趋势并管理个人目标。
- **日程统筹**：在七天视图中安排待办和日程，支持应用内提醒。
- **待买清单**：记录待买物品、预计价格和状态，汇总待买预算。
- **书影音**：收藏书籍、电影、剧集等作品，记录进度、评分、感受和封面。
- **时光档案**：按时间、来源和关键词检索跨模块记录，生成月度或年度回顾。
- **数据安全**：软删除与恢复记录，导出业务全量 Excel，并在恢复前完成格式和关联校验。
- **账号管理**：管理员创建成员账号，系统不开放公开注册，各账号的业务数据相互隔离。

## 工程架构

```text
apps/web          React + Vite Web 客户端
apps/server       Fastify JSON API
packages/shared   前后端共享 DTO、Zod Schema 与纯类型
```

- 正式业务数据只保存在服务端 SQLite，浏览器不维护业务副本。
- Web 只依赖带版本的 API 合约，不了解 Drizzle 表结构。
- Server Route 负责 HTTP 边界，业务编排、领域计算、Repository 与 AI 适配相互隔离。
- 数据变更使用乐观并发校验；删除采用软删除，可在回收站恢复。
- API 响应统一使用 `code / message / data` 结构。

## 本地开发

需要 [Bun](https://bun.sh/) 1.3 或更新版本。

```bash
bun install
cp .env.example .env
bun run --cwd apps/server db:migrate
ADMIN_USERNAME=owner ADMIN_PASSWORD='请替换为至少8位的强密码' bun run --cwd apps/server admin:init
bun run dev
```

默认地址：Web `http://localhost:5173`，API `http://localhost:8787`。Vite 会把 `/api` 请求代理到本地 API。

也可以分别启动前后端：

```bash
# 终端 1
bun run dev:server

# 终端 2
bun run dev:web
```

`admin:init` 只允许在空数据库中执行一次。密码使用 Argon2id 保存，不会以明文写入数据库或配置文件。部署前请替换 `.env` 中的 `SESSION_SECRET`，并确保数据目录位于持久化磁盘。

管理员登录后，可以从“账号管理”页面创建成员账号，并通过安全方式将用户名和初始密码告知本人。成员可以正常登录并使用所有生活记录功能，但不能查看或创建其他账号。

如果首次初始化时填错了凭据，可以在本机重置唯一管理员。重置会立即撤销已有登录会话：

```bash
ADMIN_USERNAME=新的用户名 ADMIN_PASSWORD='新的强密码' bun run --cwd apps/server admin:reset
```

## 常用命令

```bash
bun run lint
bun run check:web-size
bun run typecheck
bun run test
bun run test:e2e
bun run build
bun run check
```

## 项目文档

- [产品需求文档](./docs/PRD-日常集生活工作台.md)
- [Web 技术方案](./docs/技术方案-日常集生活工作台-Web一期.md)
- [前端编码规范](./docs/编码规范.md)
- [Fastify 后端编码规范](./docs/Fastify后端编码规范.md)
- [代码代理规则](./AGENTS.md)
