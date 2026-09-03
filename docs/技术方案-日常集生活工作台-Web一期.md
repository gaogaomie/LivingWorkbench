# 日常集·生活工作台 Web 一期技术方案

> 文档版本：V1.1  
> 日期：2026-09-02  
> 对应产品文档：《日常集·生活工作台复刻版 PRD》V1.2  
> 目标形态：在线 Web 应用，Node.js API 与服务端 SQLite 是唯一数据源  
> 二期方向：Tauri 桌面客户端，复用同一套 React 页面和 Node.js API
> V1.1 架构变更：取消浏览器正式存储、PWA 离线与数据同步，改为单一在线服务端数据源

## 1. 结论摘要

一期采用以下方案：

```text
React + TypeScript + Vite
├── React Router：页面路由与按路由拆包
├── animal-island-ui：基础 UI 与设计变量
├── 自研业务组件：工作台布局、图表、热力图、周历、AI 卡片
├── TanStack Query：服务端状态、请求缓存与失效刷新
├── Zustand：纯临时 UI 状态
├── Node.js + Fastify：业务 API、鉴权、统计、AI 代理与导出
├── Drizzle ORM + SQLite：服务端事务数据库与版本化迁移
├── Zod：前后端输入、API DTO 与 AI 输出校验
├── Tauri（二期）：复用 Web 前端的桌面客户端
└── Vitest + Testing Library + Playwright：前后端测试体系
```

不使用 Next.js，不做离线业务数据库，不做浏览器与服务端的双向同步。Web 与桌面端都是在线客户端，通过 HTTPS API 访问同一个 Node.js 服务，正式业务数据只存在服务端 SQLite。AI 密钥由用户提供，由服务端加密保存并代理模型请求。

### 架构评分

按“深模块、信息隐藏、低变更放大”的软件设计标准，当前选型评分为 **9.5/10**。补齐以下工程约束后可达到 10/10：

1. 前端只依赖有版本的 API Client 和 DTO，不了解 SQLite 表结构。
2. 服务端业务统计集中在纯领域模块，不散落在 Route Handler 中。
3. AI 通过服务端统一引擎调用，前端不接触供应商请求协议和完整密钥。
4. SQLite 自动异机备份，并在第一次发布前完成恢复演练。
5. Web 与 Tauri 复用 API Client、DTO、页面和业务组件。

## 2. 目标、约束与非目标

### 2.1 技术目标

- 一套 React 界面同时服务桌面和移动浏览器，二期复用到 Tauri。
- 所有正式业务数据由 Node.js API 读写服务端 SQLite。
- 换浏览器、换电脑或使用桌面客户端时，登录后读取同一份数据。
- 业务记录修改后，总览、统计和时光档案自动更新。
- AI 不参与金额、BMI、连续天数等确定性计算。
- 服务端数据库可自动备份、校验和恢复。

### 2.2 已确认约束

- 个人自用，不考虑 animal-island-ui 的商业授权问题。
- 一期做 Web 客户端与 Node.js 后端，二期做 Tauri 桌面客户端。
- Web 与桌面端都不考虑离线使用。
- 正式数据使用服务端 SQLite 保存。
- AI 使用用户自带密钥，并每 7 天提醒用户检查或更换。
- 应用需要联网和登录后才能读写业务数据。

### 2.3 本期非目标

- 离线 CRUD、本地业务数据库和双向同步。
- 多人协作、组织权限和复杂 RBAC。
- 银行账单、可穿戴设备和影视数据库自动同步。
- 医疗诊断、投资建议和自动购物。
- IndexedDB、SQLite WASM/OPFS 和 Service Worker 业务缓存。

## 3. 总体架构

```text
浏览器 React ─────┐
                    ├── HTTPS JSON API ── Node.js + Fastify
Tauri + React ────┘                         │
                                                ├── Use Cases / Domain
                                                ├── AI Provider Adapter ── AI 服务
                                                ├── Export / Backup
                                                └── Repository ── Drizzle ── SQLite
                                                                               │
                                                                      定时异机加密备份
```

### 3.1 分层规则

| 层 | 可以依赖 | 禁止依赖 |
|---|---|---|
| Web 页面/组件 | API Client、Query Hooks、共享 DTO、UI 组件 | SQLite、Drizzle、AI SDK、服务端密钥 |
| Web API Client | HTTP 协议、共享 DTO | 页面实现、SQLite 表 |
| Server Route | 鉴权、用例、输入 Schema | SQL、React、第三方模型细节 |
| Server Use Case | Repository、领域计算、AI 引擎 | React、DOM、具体路由对象 |
| Domain | 共享领域类型、日期与数值工具 | Fastify、Drizzle、React、网络 API |
| Repository | Drizzle、SQLite Schema | React、页面组件、HTTP Response |
| AI 引擎 | 快照构建器、Provider Adapter、Zod | 前端状态、Route Handler |

规则的目的不是追求层数，而是隐藏三项会变化的知识：HTTP 协议、SQLite 存储细节和 AI 供应商协议。

## 4. 技术栈明细

| 能力 | 选型 | 使用原则 |
|---|---|---|
| 构建 | Vite | SPA 构建、开发服务器、环境变量，仅暴露非敏感构建变量 |
| UI | React + TypeScript | 函数组件，TypeScript strict 模式 |
| 路由 | React Router Data Router | Router 在 React 树外创建；页面路由懒加载 |
| 组件库 | animal-island-ui | 从包根导入，入口只导入一次样式 |
| 服务端状态 | TanStack Query | 统一请求缓存、加载、重试、失效与乐观更新 |
| 临时状态 | Zustand | 仅导航、弹窗、筛选、视图偏好等临时状态 |
| API | Node.js + Fastify | JSON API、Cookie Session、统一错误、请求日志与限流 |
| 数据库 | SQLite + Drizzle ORM | 单机持久化磁盘；版本化 SQL migration |
| 校验 | Zod | 前后端共享 DTO；服务端再次校验所有外部输入 |
| 图表 | ECharts | 按页面动态加载；统一主题适配层 |
| 日期 | date-fns | 纯函数处理日期；业务日期使用 `YYYY-MM-DD` |
| ID | Runtime Crypto UUID | 由 Server 使用 `crypto.randomUUID()` 生成，前端不决定正式实体 ID |
| 导出 | ExcelJS（Server） | 由服务端流式生成，前端只触发下载 |
| 鉴权 | Server Session + HttpOnly Cookie | 单用户登录，不向 LocalStorage 写入 Token |
| 桌面 | Tauri（二期） | 内置 React 静态产物，仍访问同一 Node API |
| 测试 | Vitest/Testing Library/Playwright | 领域、API、组件、端到端四层测试 |

### 4.1 依赖管理原则

- 不在方案中硬编码具体小版本；创建项目时安装当前稳定版并提交锁文件。
- 每个依赖必须有明确职责，禁止同时引入功能重叠的状态库、表单库或日期库。
- 前端的 ECharts 采用动态导入；Excel 和 AI Provider SDK 只安装在 Server。
- Web API Client 优先使用标准 `fetch`，不额外引入 Axios。
- 前端不安装 SQLite、Drizzle 或 AI 厂商 SDK。
- Web 与 Server 之间只共享类型和纯函数，不共享依赖 Node.js 或 DOM 的实现。

## 5. 工程目录

```text
apps/web/src/
├── assets/                         # 本地图片与字体
├── components/
│   ├── animal/                  # animal-island-ui 的轻量业务封装
│   ├── business/                # 跨页面复用的业务组件
│   ├── charts/                  # 折线图、饼图、热力图
│   ├── feedback/                # 空状态、错误、加载、更新提示
│   ├── forms/
│   └── index.ts
├── config/
│   ├── app.config.ts
│   ├── env.ts
│   └── query-client.config.ts
├── constants/
│   ├── route-paths.ts
│   ├── storage-keys.ts
│   └── business-defaults.ts
├── contexts/
│   ├── AppProviders.tsx
│   └── QueryProvider.tsx
├── data-provider/                    # 前端 API 访问与 Query Hooks
│   ├── api-client.ts
│   ├── endpoints/
│   ├── query-keys.ts
│   └── queries/
├── docs/                            # 前端模块说明
├── hooks/
│   ├── use-app-bootstrap.ts
│   ├── use-online-status.ts
│   └── use-auth-session.ts
├── layouts/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   └── MobileNavigation.tsx
├── lib/                             # 前端纯工具与平台适配
│   ├── platform/
│   └── validators/
├── pages/                           # 所有路由页面
│   ├── overview/
│   │   ├── index.tsx
│   │   └── components/
│   ├── finance/
│   ├── habits/
│   ├── fitness/
│   ├── schedule/
│   ├── shopping/
│   ├── media/
│   ├── timeline/
│   ├── settings/
│   └── not-found/
├── router/                          # 只负责路由表、懒加载和路由守卫
│   ├── index.tsx
│   ├── routes.tsx
│   └── error-element.tsx
├── services/                        # 页面级交互编排，不写 SQL/领域规则
│   ├── download.service.ts
│   └── notification.service.ts
├── stores/                          # Zustand 临时 UI 状态
│   └── ui.store.ts
├── styles/
│   ├── animal-overrides.css
│   ├── app.css
│   └── responsive.css
├── types/
│   ├── entities/
│   ├── ui.ts
│   ├── result.ts
│   └── chart.ts
├── utils/
│   ├── date.ts
│   ├── money.ts
│   ├── logger.ts
│   └── hash.ts
├── test/
│   ├── factories/
│   ├── fixtures/
│   └── setup.ts
├── App.css
├── App.tsx
├── main.tsx
└── vite-env.d.ts

apps/server/src/
├── app.ts
├── server.ts
├── config/
├── plugins/                         # DB、Session、安全头、限流
├── routes/                          # HTTP 路由与 Zod 输入边界
│   ├── auth/
│   ├── finance/
│   ├── habits/
│   ├── fitness/
│   ├── schedule/
│   ├── shopping/
│   ├── media/
│   ├── timeline/
│   ├── insights/
│   └── settings/
├── services/                        # 应用用例与事务边界
├── domain/
│   ├── calculators/
│   ├── policies/
│   └── validators/
├── repositories/
├── db/
│   ├── client.ts
│   ├── schema/
│   ├── migrations/
│   └── seed-demo.ts
├── ai/
│   ├── insight-engine.ts
│   ├── snapshot-builders/
│   ├── output-schemas.ts
│   ├── safety-policy.ts
│   └── providers/
├── jobs/                            # 自动备份与清理任务
├── security/                        # 密码、Session、CSRF、密钥加密
└── test/

packages/shared/src/
├── entities/                        # 领域类型
├── contracts/                       # API request/response DTO
├── schemas/                         # 可前后端共享的 Zod schema
└── constants/
```

### 5.1 目录约束

- `apps/web/src/pages` 只放置路由页面；页面负责布局和交互编排，不直接访问数据库，不保存统计规则。
- `pages/<route>/components` 只放该页面私有组件；被两个及以上页面使用后，再移入顶层 `components`。
- `router` 只定义 URL、页面懒加载、错误页和路由元信息，不写业务逻辑。
- Web `data-provider` 是唯一组装 HTTP 请求和 TanStack Query Hook 的目录。
- Server `services` 负责协调 Repository、领域计算和 AI 引擎，Route Handler 只做鉴权、校验和转换。
- Server `domain` 保存纯业务计算和策略，不导入 Fastify、Drizzle 或 React。
- Server `db` 是唯一知道 SQLite 表结构的目录；Repository 将其隐藏在业务接口后。
- Server `ai` 是唯一知道模型供应商协议的目录。
- Web `stores` 只保存 Zustand 临时 UI 状态，服务端状态由 TanStack Query 管理。
- 通用组件必须至少被两个页面复用；否则留在对应 `pages/<route>` 内，避免“为了复用而复用”。

目录之间的主依赖方向固定为：

```text
Web pages / components / hooks
                 ↓
       data-provider / API Client
                 ↓ HTTPS
          Server routes / auth
                 ↓
          Server services
          ↙      ↓       ↘
     domain   repositories   AI engine
                    ↓
             Drizzle / SQLite
```

禁止反向依赖，例如 Server Repository 导入 Route Handler，或前端页面导入 Server DB Schema。

### 5.2 页面目录标准

每个一级路由都使用一个同名目录，最小结构如下：

```text
pages/finance/
├── index.tsx               # 路由懒加载入口，默认导出页面
├── components/            # 仅财务页使用的组件
│   ├── FinanceEntryForm.tsx
│   └── ExpenseStructureChart.tsx
├── hooks/                 # 仅财务页使用的组合式 Hook
└── finance-page.test.tsx  # 页面级测试可与页面就近放置
```

新增页面时只需完成两处修改：在 `pages/<name>/index.tsx` 实现页面，在 `router/routes.tsx` 注册路由。若还需要在多个不相干目录里同步登记，说明路由元信息已发生泄漏，应优先收敛到路由表。

## 6. 路由设计

```text
/login             登录
/                 今日总览
/finance          记账理财
/habits           习惯健康
/fitness          减脂健身
/schedule          日程统筹
/shopping          待买清单
/media             书影音
/timeline          时光档案
/settings          设置
/settings/ai       AI 模型与密钥
/settings/data     存储、备份、导入和清空
/settings/appearance 外观与语言
```

实现要求：

- 使用 `createBrowserRouter`，Router 实例在 React 树外创建。
- `/login` 是公开路由，其余业务路由由统一 Auth Guard 检查 Session。
- 八个业务页面使用懒加载；总览和应用壳进入主包。
- 静态托管必须配置 SPA fallback，将未知路径回退到 `index.html`。
- 路由级错误使用统一错误页；局部卡片错误由局部 Error Boundary 处理。
- 筛选条件写入 URL 查询参数，例如 `/finance?month=2026-09&type=expense`，便于刷新恢复。

## 7. Animal Island UI 实施规范

### 7.1 初始化

应用入口只导入一次：

```ts
import 'animal-island-ui/style';
import './styles/animal-overrides.css';
import './styles/app.css';
```

禁止深层导入；组件和类型都从 `animal-island-ui` 包根导入。

### 7.2 组件映射

| 场景 | 组件 |
|---|---|
| 主按钮、提交、危险确认 | `Button` |
| 统计卡片、空状态、快捷入口 | `Card` |
| 页面装饰标题 | `Title` |
| 分组切换 | `Tabs`、`Tag` |
| 表单 | `Form`、`FormItem`、`Input`、`Select`、`DatePicker`、`TimePicker` |
| 布尔设置 | `Switch` |
| 多选项 | `Checkbox` |
| 确认删除、首次引导 | `Modal` |
| 移动侧栏、快捷录入 | `Drawer` |
| 成功、失败、更新状态 | `Notification` |
| 保存或目标进度 | `Progress` |
| 页面与卡片加载 | `Skeleton` |
| 明细表 | `Table`、`Pagination` |
| 书影音封面 | `Image` |

### 7.3 自研组件

以下组件不由组件库提供，需自研：

- `AppShell`：侧栏、移动抽屉、主内容区域。
- `PageHeader`：日期、标题、保存状态、页面操作。
- `MetricCard`：统一数值、单位、趋势、空状态。
- `MoneyInput`、`NumberStepper`、`DurationInput`。
- `DonutChart`、`TrendChart`、`HabitHeatmap`。
- `WeekCalendar`、`TimelineDayGroup`、`MediaCoverGrid`。
- `AiDailySummaryCard`、`AiEvidenceList`、`AiKeyForm`。
- `LoginForm`、`ServerStatusCard`、`BackupStatusCard`。

自研组件只能使用 `--animal-*` CSS 变量，不硬编码颜色、圆角和阴影。交互控件圆角不得低于 12px；主按钮才使用 3D 堆叠阴影；卡片不加盒阴影。字体使用 Nunito 与 Noto Sans SC。动画控制在 0.15–0.35 秒，并尊重 `prefers-reduced-motion`。

内置图标仅使用组件库 `Icon` 的合法名称。V1 不引入第三方图标库；无法对应的业务操作使用文字标签，避免图标风格割裂。

### 7.4 表单方案

使用 animal-island-ui 自带 `Form` 管理字段交互和即时校验，Zod 负责领域边界的最终校验。避免同时引入 React Hook Form，减少两套表单状态同步。

提交链路：

```text
Form 通过基础校验
    ↓
Zod 解析为领域 Command
    ↓
API Client 发送请求
    ↓
Server 重复校验并执行 Use Case
    ↓
Repository 事务写入 SQLite
    ↓
TanStack Query 失效相关缓存
    ↓
Notification 成功反馈
```

## 8. 领域模型与数据库

### 8.1 通用类型

```ts
type EntityId = string;
type LocalDate = string;     // YYYY-MM-DD，用户时区下的业务日期
type YearMonth = string;     // YYYY-MM
type ISODateTime = string;   // ISO 8601 UTC 时间戳

interface EntityMeta {
  id: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
  isDemo: boolean;
  schemaVersion: number;
}
```

业务日期与创建时间分开：统计按 `LocalDate`，排序冲突和审计按 UTC 时间戳。禁止用 `new Date('YYYY-MM-DD')` 直接推导本地日期，统一通过日期工具模块转换。

### 8.2 实体定义

#### 设置

```ts
interface AppSettings {
  key: 'app';
  locale: 'zh-CN' | 'en';
  timezone: string;
  currency: 'CNY';
  weightUnit: 'kg' | 'jin';
  theme: 'animal-default';
  storageReminderEnabled: boolean;
  backupReminderDays: number;
  updatedAt: ISODateTime;
}
```

#### 财务

```ts
type FinanceType = 'expense' | 'income';

interface FinanceEntry extends EntityMeta {
  type: FinanceType;
  amountFen: number;
  categoryId: string;
  date: LocalDate;
  month: YearMonth;
  note?: string;
}

interface MonthlyBudget extends EntityMeta {
  month: YearMonth;
  amountFen: number;
}
```

金额始终使用整数分，禁止用浮点数存人民币。

#### 习惯

```ts
type HabitTargetType = 'boolean' | 'count' | 'duration';
type HabitStatus = 'active' | 'paused' | 'archived';

interface Habit extends EntityMeta {
  name: string;
  targetType: HabitTargetType;
  targetValue: number;
  unit: string;
  weekdays: number[];
  startDate: LocalDate;
  colorKey: string;
  status: HabitStatus;
  sortOrder: number;
}

interface HabitLog extends EntityMeta {
  habitId: EntityId;
  date: LocalDate;
  value: number;
  completed: boolean;
}
```

`habitId + date` 唯一，每个习惯每天只有一条累计记录。目标变更需记录生效日期；若 V1 不做完整目标历史，禁止回算旧日期完成状态。

#### 健身

```ts
interface FitnessProfile extends EntityMeta {
  singletonKey: 'default';
  heightCm?: number;
  birthYear?: number;
  sexForFormula?: 'female' | 'male' | 'unspecified';
  startWeightKg?: number;
  targetWeightKg?: number;
  targetDate?: LocalDate;
}

interface FitnessLog extends EntityMeta {
  date: LocalDate;
  weightKg?: number;
  bodyFatPercent?: number;
  calorieIntakeKcal?: number;
  exerciseMinutes?: number;
  steps?: number;
  note?: string;
}
```

`date` 唯一；同一天重复录入进入编辑流程，不新增第二条主记录。

#### 日程

```ts
type TodoStatus = 'pending' | 'completed' | 'cancelled';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface TodoItem extends EntityMeta {
  title: string;
  date: LocalDate;
  time?: string; // HH:mm
  listId: EntityId;
  priority: Priority;
  note?: string;
  reminderMinutesBefore?: number;
  status: TodoStatus;
  completedAt?: ISODateTime;
}

interface TodoList extends EntityMeta {
  name: string;
  colorKey: string;
  sortOrder: number;
}
```

逾期是派生状态，不写入数据库：`status=pending && dueAt < now`。

#### 待买

```ts
type ShoppingStatus = 'wanted' | 'purchased';

interface ShoppingItem extends EntityMeta {
  name: string;
  quantity: number;
  unit?: string;
  categoryId: string;
  estimatedUnitPriceFen?: number;
  actualUnitPriceFen?: number;
  priority: Priority;
  note?: string;
  status: ShoppingStatus;
  purchasedOn?: LocalDate;
}
```

#### 书影音

```ts
type MediaType = 'book' | 'movie' | 'series' | 'show' | 'anime' | 'podcast' | 'other';
type MediaStatus = 'wishlist' | 'in_progress' | 'completed' | 'paused';

interface MediaItem extends EntityMeta {
  name: string;
  type: MediaType;
  status: MediaStatus;
  rating?: 1 | 2 | 3 | 4 | 5;
  recordedOn: LocalDate;
  completedOn?: LocalDate;
  review?: string;
  coverAssetId?: EntityId;
}

interface AssetRecord extends EntityMeta {
  ownerType: 'media-cover';
  ownerId: EntityId;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  storageKey: string;
  checksumSha256: string;
  width: number;
  height: number;
  size: number;
}
```

封面上传到 Server 后校验真实 MIME、尺寸与文件大小，再压缩为 WebP。业务实体只存 `coverAssetId`，资源表只存服务器相对 `storageKey`；删除作品时通过用例同时清理孤立资源。

#### 草稿与 AI

```ts
interface DraftRecord {
  key: string;            // module + form identity
  module: string;
  payload: unknown;
  updatedAt: ISODateTime;
  expiresAt?: ISODateTime;
}

interface AiProviderConfig {
  id: string;
  provider: 'openai-compatible';
  label: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  maskedKeyHint?: string;
  keyUpdatedAt?: ISODateTime;
  lastConnectionTestAt?: ISODateTime;
  updatedAt: ISODateTime;
}

interface AiConsent {
  id: string;
  scope: 'basic_stats' | 'finance_summary' | 'health_summary' | 'free_text_notes';
  grantedAt: ISODateTime;
  revokedAt?: ISODateTime;
}

interface AiInsight extends EntityMeta {
  type: 'daily_summary' | 'fitness_weekly' | 'finance_monthly' | 'habit_weekly';
  periodStart: LocalDate;
  periodEnd: LocalDate;
  dataVersion: string;
  providerId: string;
  model: string;
  promptVersion: string;
  content: AiInsightContent;
  sourceRefs: Array<{ entityType: string; entityId: string }>;
  safetyStatus: 'passed' | 'fallback' | 'blocked';
  generatedAt: ISODateTime;
}
```

API Key 的密文与 `AiProviderConfig` 分表保存。密文只能由 Server `SecretService` 解密，主密钥来自服务器环境变量，不存入 SQLite、代码库或备份。

### 8.3 SQLite Schema V1

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = FULL;

CREATE UNIQUE INDEX habit_logs_habit_date_uq
  ON habit_logs(habit_id, date);
CREATE UNIQUE INDEX fitness_logs_date_uq
  ON fitness_logs(date);
CREATE UNIQUE INDEX monthly_budgets_month_uq
  ON monthly_budgets(month);
CREATE INDEX finance_entries_type_date_idx
  ON finance_entries(type, date);
CREATE INDEX finance_entries_category_date_idx
  ON finance_entries(category_id, date);
CREATE INDEX todos_status_date_idx
  ON todos(status, date);
CREATE INDEX shopping_items_status_idx
  ON shopping_items(status);
CREATE INDEX media_items_type_status_idx
  ON media_items(type, status);
CREATE INDEX ai_insights_type_period_idx
  ON ai_insights(type, period_end);
```

核心表：`users`、`sessions`、`settings`、`finance_entries`、`monthly_budgets`、`habits`、`habit_logs`、`fitness_profiles`、`fitness_logs`、`todo_lists`、`todos`、`shopping_items`、`media_items`、`assets`、`drafts`、`ai_provider_configs`、`ai_secrets`、`ai_consents`、`ai_insights`。

表名和列名在 SQLite 使用 `snake_case`，API DTO 使用 `camelCase`，映射只在 Repository 内完成。只为真实查询条件创建索引；备注、评论和 AI 正文不建索引。图片优先保存到服务器持久化文件目录，SQLite 只存元数据和相对路径，避免大量 Blob 放大备份成本。

### 8.4 数据库启动流程

```text
启动 Node.js Server
  ↓
校验环境变量与持久化目录权限
  ↓
打开 SQLite，执行未应用的 Drizzle migration
  ↓
设置 WAL、foreign_keys、busy_timeout 和 synchronous
  ↓
校验 AppSettings 与唯一管理员账号
  ↓
首次运行则进入初始化管理员流程
  ↓
启动备份调度与健康检查
  ↓
开始接受 API 请求
```

数据库打不开、migration 失败或持久化目录不可写时，Server 健康检查返回失败并停止提供写接口，不自动删库重建。

### 8.5 Migration 规则

- 每次索引、字段或约束变更都生成新 SQL migration，禁止修改已发布的 migration。
- 发布时先对 SQLite 做一致性快照，再执行 migration。
- 数据回填和建表分开；大型变更使用新表、数据拷贝、验证后换表。
- Server 版本不允许连接比自身更新的 Schema 版本。
- CI 从空库和上一个正式版本备份各执行一次全量 migration。
- Migration 失败时保留旧数据并停止写入，禁止自动删库重建。

## 9. Repository 与用例接口

### 9.1 顶层接口

```ts
interface LifeRepository {
  finance: FinanceRepository;
  habits: HabitRepository;
  fitness: FitnessRepository;
  schedule: ScheduleRepository;
  shopping: ShoppingRepository;
  media: MediaRepository;
  insights: InsightRepository;
  preferences: PreferenceRepository;
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
```

不要设计一个泛型 `Repository<T>` 向用例层暴露 SQL、Drizzle Query Builder 或表名。每个领域接口直接表达业务能力。

### 9.2 示例领域接口

```ts
interface FinanceRepository {
  saveEntry(command: SaveFinanceEntry): Promise<FinanceEntry>;
  updateEntry(id: EntityId, patch: UpdateFinanceEntry): Promise<FinanceEntry>;
  removeEntry(id: EntityId): Promise<void>;
  getEntry(id: EntityId): Promise<FinanceEntry | undefined>;
  listEntries(query: FinanceQuery): Promise<FinanceEntry[]>;
  getMonthSnapshot(month: YearMonth): Promise<MonthlyFinanceSnapshot>;
  setBudget(month: YearMonth, amountFen: number): Promise<MonthlyBudget>;
}

interface HabitRepository {
  saveHabit(command: SaveHabit): Promise<Habit>;
  recordProgress(habitId: EntityId, date: LocalDate, value: number): Promise<HabitLog>;
  getDayStatus(date: LocalDate): Promise<HabitDayStatus[]>;
  getAnalytics(range: DateRange): Promise<HabitAnalytics>;
}

interface FitnessRepository {
  saveProfile(command: SaveFitnessProfile): Promise<FitnessProfile>;
  saveDailyLog(command: SaveFitnessLog): Promise<FitnessLog>;
  getDailyLog(date: LocalDate): Promise<FitnessLog | undefined>;
  getTrend(range: DateRange): Promise<FitnessTrend>;
}
```

### 9.3 写入约定

- Command 进入用例前经过 Zod 校验。
- Repository 内生成 ID 与时间戳并完成事务。
- 删除默认软删除；封面等从属资源可事务硬删除。
- 返回完整实体，页面不自己合并 patch。
- API 写入成功后返回完整实体和服务端时间；前端失效相关 TanStack Query，禁止在 Zustand 中维护第二份业务列表。

## 10. 统计与业务规则

### 10.1 计算模块

```text
domain/calculators/
├── finance-summary.ts
├── habit-streak.ts
├── habit-completion-rate.ts
├── fitness-bmi.ts
├── fitness-moving-average.ts
├── schedule-buckets.ts
├── shopping-budget.ts
├── media-year-summary.ts
└── life-score.ts
```

全部计算器为纯函数：输入明确数据和时区，输出不可变结果，不读取数据库和当前系统时间。当前时间作为参数传入，确保测试可复现。

### 10.2 关键口径

- 金额：整数分累加，展示时格式化。
- 本月：用户时区自然月。
- 习惯完成率：计划执行日中的已完成数量 / 应执行数量。
- 连续天数：只遍历计划日，非计划日不打断。
- BMI：kg / m²，只展示数值和一般说明。
- 体重 7 日均线：只平均有效记录，不用 0 填补缺失日。
- 今日待办：日期为今天且未完成。
- 逾期：未完成且完整截止时间早于传入的 `now`。
- 待买预算：待买项目数量 × 预计单价，缺价项目不计金额。
- 书影音年度完成数：按完成日期统计。
- 时光档案：从来源实体即时映射，不存重复事实数据。

### 10.3 Server 计算边界

不引入 Web Worker。服务端负责：

- 需要跨模块数据的今日总览、时光档案和 AI 快照。
- XLSX/JSON 导出和 SQLite 备份快照。
- 封面图片校验、压缩和持久化。
- 定时备份、过期 Session 清理和 AI 结果缓存清理。

前端只处理展示级排序和格式化。数据量小时不引入独立任务队列；超过 2 秒的后台任务再通过 `jobs` 模块返回 `jobId` 与进度。

## 11. Zustand 状态边界

```ts
interface UiState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  activeModal?: string;
  filters: Record<string, unknown>;
  chartRange: Record<string, string>;
  setSidebarCollapsed(value: boolean): void;
  openModal(id: string): void;
  closeModal(): void;
}
```

禁止放入 Zustand：Session 凭证、账目、习惯列表、体重记录、待办列表、统计结果、AI 洞察正文。这些由 HttpOnly Cookie 或 TanStack Query 管理。

TanStack Query 约定：

- Query Key 集中定义，例如 `['finance', { month, type }]`。
- 正常业务查询 `staleTime` 可设 30–60 秒；总览在页面聚焦时刷新。
- Mutation 成功后只失效受影响的模块、总览和时光档案 Query。
- 只对可安全重试的 GET 请求自动重试；Mutation 不自动无限重试。
- 不启用持久化 Query Cache，页面刷新后从服务端重新读取。

## 12. AI 技术方案

### 12.1 AI 设置页

字段：

- 服务类型：OpenAI Compatible。
- API Base URL：从 Server 预设供应商中选择，V1 不开放任意脚本或代理地址。
- API Key：密码输入框，提交后只由 Server 接收，后续只返回掩码提示。
- 模型名称：从连接测试结果选择或手动填写。
- “启用该配置”：关闭时 Server 不允许发起模型请求。
- “允许发送的内容”：基础统计、财务摘要、健康摘要、自由文本备注分别授权。
- 测试连接、保存配置、删除密钥。

### 12.2 密钥周提醒

`keyUpdatedAt` 记录保存或确认检查时间。启动应用时满足以下条件显示温和提醒：

```text
配置 enabled = true
AND 当前时间 - keyUpdatedAt >= 7 天
AND 本周尚未提醒
```

提醒提供：

- “现在更换”进入设置页。
- “我已检查，7 天后提醒”只更新检查时间，不修改密钥。
- “暂时忽略”当天不再提示。

系统不能自动轮换第三方密钥；每周提醒是运维习惯，不代替服务端加密、访问控制和日志脱敏。

### 12.3 Provider Adapter

```ts
interface AiProvider {
  testConnection(config: AiRuntimeConfig, signal?: AbortSignal): Promise<ConnectionResult>;
  generateStructured<T>(request: StructuredAiRequest<T>): Promise<AiProviderResult<T>>;
}

interface StructuredAiRequest<T> {
  systemInstruction: string;
  data: unknown;
  outputSchema: ZodType<T>;
  model: string;
  timeoutMs: number;
  signal?: AbortSignal;
}
```

Server 业务用例只调用 `AiInsightEngine.generateDailySummary(date)`，不知道具体 URL、Header 或模型请求格式。前端只调用 `/api/v1/insights/daily`。

### 12.4 今日总结生成链路

```text
点击“总结今天”
  ↓
前端提交日期并附带 HttpOnly Session Cookie
  ↓
Server 检查登录、授权、密钥与数据量
  ↓
SnapshotBuilder 从 Repository 读取数据
  ↓
领域计算器生成确定性事实
  ↓
移除未授权字段和备注原文
  ↓
计算 dataVersion 哈希并检查缓存
  ↓
SafetyPolicy 构建受限提示
  ↓
Provider 返回结构化 JSON
  ↓
Zod 校验字段与来源引用
  ↓
事实交叉校验
  ↓
保存 AiInsight 并展示
```

输出至少包含：

```ts
interface DailyInsightContent {
  facts: Array<{ text: string; sourceIds: string[] }>;
  positive?: { text: string; sourceIds: string[] };
  attention?: { text: string; sourceIds: string[]; confidence: 'low' | 'medium' | 'high' };
  nextStep?: { text: string; targetModule?: string };
  missingData: string[];
  disclaimer?: string;
}
```

### 12.5 AI 安全与隐私

- 用户笔记、待办标题和媒体短评全部视为不可信数据，不能改变系统指令。
- 默认只发送聚合结果，例如“餐饮支出 80 元”，不发送账目备注。
- 请求和响应不得写入控制台、错误上报或分析日志。
- API Key 提交后不再返回前端，不进入 URL、DOM 属性、Zustand DevTools、备份或错误信息。
- AI Key 使用 AES-256-GCM 和每条记录的随机 nonce 加密。SQLite 只保存密文、nonce、认证标签、算法版本和掩码提示。
- 32 字节主密钥通过 Server 环境变量或密钥管理器注入；更换主密钥时由专用管理命令逐条重加密。
- 使用 `AbortController` 支持超时和用户取消。
- 每日总结同一数据版本最多重新生成 3 次。
- 健身建议只允许从低风险模板库中选择行动方向；模型负责表达，不自由生成医疗处方。
- 模型超时、密钥错误、供应商异常或输出校验失败时，Server 返回规则生成的日摘要。

### 12.6 CSP 与供应商约束

V1 在 Server 建立供应商注册表，明确每个供应商的：

- Base URL。
- 请求格式。
- 结构化输出能力。
- 错误码与限流语义。
- 最大超时和模型列表。

部署设置 Content Security Policy：

- `default-src 'self'`。
- `script-src 'self'`，不加载第三方运行时脚本。
- Web 的 `connect-src 'self'`，不允许浏览器直连模型域名。
- `img-src 'self' blob: data:`。
- `font-src 'self' data:`。
- `object-src 'none'`。
- `base-uri 'self'`。

不建议允许任意 `https:` 连接，否则用户输入一个未知 Base URL 就会削弱整体安全边界。

## 13. API、鉴权与在线策略

### 13.1 API 约定

- API 统一使用 `/api/v1` 前缀，资源名使用复数名词。
- 列表查询显式接收日期范围、状态、分页和排序，不接受任意 SQL 式筛选。
- 成功统一返回 `{ data, meta? }`；失败统一返回 `{ error: { code, message, fieldErrors?, requestId } }`。
- 创建请求接受 `Idempotency-Key`，避免网络超时后用户重试产生重复记录。
- 更新实体携带 `updatedAt` 或版本号；版本不一致返回 `409 CONFLICT`。
- 时间戳一律使用 UTC ISO 8601，业务日期使用用户时区下的 `YYYY-MM-DD`。

一期核心接口：

| 模块 | 主要接口 |
|---|---|
| 鉴权 | `POST /auth/login`、`POST /auth/logout`、`GET /auth/session` |
| 总览 | `GET /overview?date=` |
| 财务 | `GET/POST /finance/entries`、`PATCH/DELETE /finance/entries/:id`、`GET /finance/summary` |
| 习惯 | `GET/POST /habits`、`PUT /habits/:id/progress/:date`、`GET /habits/analytics` |
| 健身 | `GET/PUT /fitness/profile`、`GET/PUT /fitness/logs/:date`、`GET /fitness/trend` |
| 日程 | `GET/POST /todos`、`PATCH/DELETE /todos/:id`、`POST /todos/:id/complete` |
| 待买 | `GET/POST /shopping-items`、`PATCH/DELETE /shopping-items/:id`、`POST /shopping-items/:id/purchase` |
| 书影音 | `GET/POST /media-items`、`PATCH/DELETE /media-items/:id`、`POST /assets/media-cover` |
| 档案 | `GET /timeline?from=&to=&types=` |
| AI | `GET/PUT /settings/ai`、`POST /settings/ai/test`、`POST /insights/daily`、`POST /insights/fitness-weekly` |
| 数据 | `GET /exports/:module.xlsx`、`GET /admin/backups/status`、`POST /admin/backups/run` |

接口表表达业务意图，不必为每个 Repository 方法创建一个薄封装路由。聚合页优先使用聚合 API，降低客户端请求编排成本。

### 13.2 单用户鉴权

- 首次启动通过 CLI 或一次性 Setup Token 创建唯一管理员，后续立即关闭初始化入口，不开放公开注册。
- 密码使用 Argon2id 哈希，数据库不保存明文密码。
- 登录后使用随机 Server Session，Cookie 设置 `HttpOnly; Secure; SameSite=Lax`。
- Session ID 只保存哈希；注销、修改密码和管理员操作可撤销所有 Session。
- 状态修改请求校验 Origin/CSRF Token，登录接口限流并记录失败次数。
- 前端通过 `/api/v1/auth/session` 获取当前登录状态，不读取 Cookie 内容。

### 13.3 网络与错误处理

- Web 与 API 优先同域部署，避免不必要的 CORS 和跨站 Cookie 复杂度。
- 无网络时显示统一全局提示，不展示伪造成功状态，不缓存待同步操作。
- GET 请求可按错误类型有限重试；鉴权失败直接进入登录页。
- 当服务端不可用时，保留当前页面上已渲染的数据，但所有写操作进入禁用或可重试状态。
- V1 不注册 Service Worker，不支持离线启动、离线写入或同步冲突处理。

### 13.4 服务器安全基线

- 全站 HTTPS，启用 HSTS、CSP、`X-Content-Type-Options` 等安全头。
- 请求体、上传文件、查询范围和超时都有明确上限。
- SQLite、上传目录和备份目录不可通过静态 Web 路径直接访问。
- 日志默认不记录 Cookie、Authorization、API Key、健康数据和自由文本备注。
- 若只供个人使用，优先通过私有网络/VPN 访问；公网部署也不能省略鉴权。

## 14. 数据安全、备份与恢复

### 14.1 持久化检查

- SQLite 数据库、WAL 文件、上传资源和备份目录必须位于服务器持久化磁盘。
- 启动时检查目录可写、剩余空间、SQLite `quick_check` 与最后备份时间。
- 健康接口分为 `live` 与 `ready`：进程存活不代表数据库可写。
- 剩余空间达到警戒线时停止封面上传并发出告警，不等待 SQLite 写满。

### 14.2 备份格式

自动备份为加密的 `.riji-server-backup.zip`：

```text
manifest.json
database.sqlite
assets/
  <asset-id>.webp
checksum.json
```

`manifest.json`：

```ts
interface BackupManifest {
  format: 'riji-workbench-backup';
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  exportedAt: ISODateTime;
  locale: string;
  entityCounts: Record<string, number>;
  includesEncryptedSecrets: boolean;
}
```

### 14.3 导出规则

- AI Key 密文默认不进入用户下载的业务导出；灾备快照如包含密文，也不包含服务器主密钥。
- 通过 SQLite Online Backup API 或 `VACUUM INTO` 产生在线一致性快照，禁止在运行时直接复制单个 `.db` 文件。
- 快照完成后执行校验、压缩、加密，然后复制到不同机器或对象存储。
- 允许用户从 API 导出单模块 CSV/XLSX；该格式不用于整库恢复。
- 备份保留策略：7 个每日、8 个每周、12 个每月快照。

### 14.4 恢复流程

```text
管理员选择已验证备份
  ↓
将 Server 切换到维护模式，拒绝新写入
  ↓
对当前数据库和资源目录生成恢复前快照
  ↓
解密并校验 manifest、checksum、SQLite integrity 和 Schema 版本
  ↓
恢复到临时目录并启动临时进程验证关键查询
  ↓
管理员二次确认
  ↓
原子切换数据库与资源目录
  ↓
重启 Server，健康检查通过后退出维护模式
```

V1 只支持整体替换恢复，不做复杂合并。恢复失败立即切回恢复前快照。

### 14.5 备份提醒

- Server 每日自动备份，前端不要求用户手动下载才算完成备份。
- 设置页显示最后备份时间、备份库存、异机复制状态与最后恢复演练时间。
- 超过 26 小时没有成功备份或异机复制失败时，显示高优先级告警。
- 每月至少完成一次真实恢复演练。

## 15. 页面实现说明

### 15.1 今日总览

- 前端只请求一个 `/api/v1/overview?date=...` 聚合接口，不在浏览器并发拼接八个模块。
- Server `DailyOverviewService` 并行查询独立数据，返回稳定的页面视图模型。
- 四个快捷入口使用 Drawer；成功后失效当前模块、总览和时光档案 Query。
- AI 总结由 Server 生成；未配置密钥时跳转设置页。
- 最近记录从统一 Timeline Mapper 生成，不存冗余时间线表。

### 15.2 记账理财

- 左侧录入表单；右侧统计和明细。
- 图表模块动态加载。
- 月份放入 URL 查询参数。
- 编辑与删除通过 Modal 确认；删除后通知可提供短时间撤销。
- 月度聚合以一次范围查询取得数据后交给纯函数计算。

### 15.3 习惯健康

- 每个习惯的当日记录按 `(habit_id, date)` 唯一索引查询和更新。
- 计数型打卡使用事务防止快速连续点击丢增量。
- 热力图只渲染当前范围，单元格带可访问文本。
- 习惯目标变更显示“从哪天生效”。

### 15.4 减脂健身

- 表单内部统一转换斤/kg，数据库只存 kg。
- BMI 与移动平均由纯函数生成。
- 步数为可选字段，为 AI 周建议预留。
- 同日已有数据时进入编辑态。
- 图表不连接缺失日期，也不以 0 补值。

### 15.5 日程统筹

- 智能清单通过状态和日期派生，不建立额外表。
- 周日历只展示摘要；点击日期更新列表查询参数。
- V1 将提醒定位为“应用打开时提醒”；二期 Tauri 再接入系统通知。

### 15.6 待买清单

- 标记已买通过一个事务更新状态、实际价格和购买日期。
- 不自动生成财务账目；只提供“记为支出”建议，用户确认后创建。

### 15.7 书影音

- 封面选择后在写库前压缩，生成预览 URL，并在组件卸载时调用 `URL.revokeObjectURL`。
- 列表与封面墙共享查询和筛选状态。
- 作品统计只读取已完成记录。

### 15.8 时光档案

- 各领域实体映射为统一 `TimelineItem`。
- 映射器包含来源、摘要、日期、排序时间和详情路由。
- 不复制备注全文；列表先展示摘要，进入来源页看详情。

## 16. React 性能策略

- 路由级代码分割；前端图表按需加载，Excel 和 AI Provider 仅存在 Server。
- 避免通用 barrel 文件将整个图表或导出模块带入首页。
- TanStack Query 只请求页面所需范围，禁止后端全表返回后在组件中筛选。
- 计算量大的视图模型使用稳定、原始依赖；简单表达式不滥用 `useMemo`。
- Zustand selector 订阅最小状态，不订阅整个 store。
- 事件逻辑放在事件处理函数中，不通过 `useEffect` 间接触发。
- 长时间线使用分页；数据超过 500 条后再引入虚拟列表。
- 封面图片指定尺寸并懒加载。
- ECharts 动画尊重系统减少动态效果设置。
- 总览、档案等聚合结果使用短时 Query Cache，写入成功后精确失效。

## 17. 错误处理与日志

### 17.1 Result 模型

```ts
type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'SERVER_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'MIGRATION_FAILED'
  | 'BACKUP_FAILED'
  | 'AI_KEY_INVALID'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_OUTPUT_INVALID';

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: AppErrorCode; message: string; cause?: unknown } };
```

### 17.2 用户反馈

- 字段问题显示在字段下方。
- 操作成功使用 `Notification.success`。
- 可恢复错误显示重试按钮。
- 未登录进入登录页；数据库或 Migration 错误进入 Server 维护故障页。
- 删除、清空和恢复使用 Modal 二次确认。

### 17.3 日志隐私

日志只记录错误代码、模块、应用版本、request ID、耗时与非敏感状态。禁止记录：

- API Key、Authorization Header。
- 财务金额和备注。
- 体重、体脂和健康备注。
- 待办内容、书影音短评。
- AI 输入和完整输出。

## 18. 测试方案

### 18.1 单元测试

必须覆盖：

- 金额整数化和格式化。
- 月度预算、收入、支出、结余与环比。
- 习惯计划日、连续天数、完成率和跨日边界。
- BMI、单位转换、7 日均线和缺失值。
- 今日、计划内、逾期和完成状态。
- 待买预算和已买月份。
- 年度书影音统计和平均评分。
- 生活指数计算。
- AI 数据快照、dataVersion 和事实引用校验。

### 18.2 Repository 与 API 集成测试

使用临时 SQLite 数据库和 Fastify `inject` 测试：

- Schema 初始化和每一次 migration。
- 唯一索引约束。
- 事务回滚。
- 软删除和恢复。
- 登录、Session 过期、CSRF、限流与未授权访问。
- API DTO 校验、错误格式、幂等创建与冲突更新。
- 删除书影音时关联封面清理。
- 在线备份、checksum、加密与恢复后实体一致。

### 18.3 组件测试

- 所有表单必填、边界值和错误状态。
- 快捷 Drawer 提交与关闭。
- 删除 Modal 的确认与取消。
- 图表的文本摘要和空状态。
- AI 卡片的加载、取消、降级和来源展开。
- 键盘操作与焦点恢复。

### 18.4 端到端测试

1. 初始化管理员、登录、注销和 Session 过期。
2. 快捷记账后首页和时光档案同步。
3. 创建习惯、打卡、刷新后数据保留。
4. 连续录入体重并显示 7 日均线。
5. 创建、完成、恢复和逾期待办。
6. 标记商品已买并生成记账候选。
7. 添加封面作品并切换视图。
8. 导出 XLSX、查看备份状态并在预发环境执行恢复。
9. 模拟断网、Server 500 与请求超时，确认不会伪造成功或重复写入。
10. AI 密钥连接、加密保存、今日总结、失败降级和七天提醒。

### 18.5 AI 测试

- Provider 使用 Mock，不在自动测试中消耗真实额度。
- 固定快照验证结构化输出 schema。
- AI 引用不存在的 source ID 时必须拒绝保存。
- 笔记包含“忽略之前指令”等文本时仍只作为数据处理。
- 健身样本不足时不能生成明确趋势和达成日期。
- 模型返回医疗、投资或危险建议时触发拦截与降级。

### 18.6 发布前手工验证

- Chrome、Edge、Safari、Firefox 最新稳定版。
- 桌面宽屏、平板和手机三档布局。
- 正常模式、断网、Session 过期、Server 维护和磁盘告警模式。
- 中文/英文切换。
- 系统减少动态效果模式。
- 清除浏览器缓存和 Cookie 后，重新登录仍能读取完整服务端数据。

## 19. Web 与 Server 部署

### 19.1 环境

- 使用单机长驻 Node.js 进程与持久化本地磁盘，不部署到临时文件系统的无状态 Serverless 函数。
- 必须使用 HTTPS；优先让 Web 和 API 处于同一 Origin。
- SQLite 与 Node.js 必须在同一台机器的本地文件系统，不使用 NFS 共享文件。
- 只运行一个会写该 SQLite 文件的 Server 实例。
- 静态资源使用内容 hash 和长缓存。
- `index.html` 使用短缓存或不缓存，确保能发现新版本。
- 配置 SPA fallback。

### 19.2 环境变量

前端 `VITE_*` 环境变量全部视为公开信息，只允许：

- 应用版本。
- 构建时间。
- 功能开关默认值。
- API 公开 Base URL（同域部署可不配）。

服务端环境变量至少包含：`DATABASE_PATH`、`UPLOAD_DIR`、`BACKUP_DIR`、`SESSION_SECRET`、`AI_MASTER_KEY`、`APP_ORIGIN`。禁止将任何服务端密钥通过 `VITE_*` 暴露。

### 19.3 发布检查

- 类型检查、Lint、单测、组件测试、构建全部通过。
- 检查主包体积和按路由拆包结果。
- 从上一个正式版本备份执行 migration 与恢复测试。
- 验证 HTTPS、Cookie、CSRF、安全头、限流和 SQLite 目录不可公开访问。
- 验证每日备份、异机复制、告警和恢复演练。
- 验证 CSP 未阻塞字体、图片和同域 API。

## 20. 开发阶段与交付顺序

### 阶段 0：工程基础

- 初始化 pnpm workspace、Web、Server 和 Shared 三个 package。
- 配置 TypeScript strict、路由、Lint、格式化、测试和路径别名。
- 集成 animal-island-ui 并建立主题覆盖文件。
- 建立 Fastify App、健康接口、统一错误和前端 API Client。

完成标准：Web 可访问 Server 健康接口，八个空白路由可导航，CI 通过。

### 阶段 1：数据内核

- 定义共享领域实体、API DTO 和 Zod schema。
- 实现 SQLite Schema、Drizzle Migration、Repository 与示例数据。
- 实现初始化管理员、登录、Session、CSRF 与限流。
- 前端接入 TanStack Query 和 Auth Guard。

完成标准：换浏览器重新登录后数据仍存在，页面不知道 SQLite/Drizzle。

### 阶段 2：四个高频模块

- 记账理财。
- 习惯健康。
- 减脂健身。
- 日程统筹。

完成标准：CRUD、统计、空状态、编辑删除和单元测试完成。

### 阶段 3：长尾模块与聚合

- 待买清单。
- 书影音与封面资源。
- 今日总览。
- 时光档案。

完成标准：任何来源记录变化都能自动同步总览和档案。

### 阶段 4：AI

- AI 设置页、Server SecretService、密钥加密与七天提醒。
- Provider Adapter、连接测试、超时取消。
- 今日总结快照、结构化输出、引用校验和规则降级。
- 健身周建议基础能力。

完成标准：密钥不返回前端、不进入日志；模型失败不影响核心功能。

### 阶段 5：备份、导出与部署

- SQLite 在线快照、checksum、加密和异机复制。
- 备份保留、失败告警和恢复工具。
- 财务和健身 Excel 服务端导出。
- HTTPS、反向代理、持久化目录、健康检查和日志轮换。

完成标准：每日备份可自动执行，完成一次预发环境整库恢复演练。

### 阶段 6：质量收口

- 性能、响应式、无障碍和兼容性。
- 完整 E2E。
- 示例数据、首次引导和错误文案。
- 发布检查与用户操作说明。

## 21. 建议提交拆分

每个提交保持可运行：

1. `chore: initialize pnpm web server shared workspace`
2. `feat: add animal theme and responsive app shell`
3. `feat: add shared api contracts and validation schemas`
4. `feat: add sqlite schema migrations and repositories`
5. `feat: add admin login session and csrf protection`
6. `feat: add web api client and query foundation`
7. `feat: add finance recording and monthly summary`
8. `feat: add habit tracking and heatmap`
9. `feat: add fitness logs and moving average`
10. `feat: add schedule and smart lists`
11. `feat: add shopping workflow`
12. `feat: add media collection and cover storage`
13. `feat: add daily overview aggregation`
14. `feat: add derived timeline`
15. `feat: add encrypted ai provider configuration`
16. `feat: add server-side daily ai insight`
17. `feat: add automated sqlite backup and restore tooling`
18. `feat: add server-side excel exports`
19. `test: cover authenticated cross-module journeys`

## 22. 二期桌面版迁移预留

二期采用 Tauri 包装现有 React 构建产物，继续访问同一 Node.js API：

```text
Web 客户端 ────┐
                ├── 共享 React UI + API Client ── Node API ── SQLite
Tauri 客户端 ──┘
```

一期必须坚持以下约束，才能低成本迁移：

- 页面只通过共享 API Client 读写数据。
- 共享 API Client 依赖 `AuthTransport`：Web 使用 HttpOnly Cookie；Desktop 可使用同一 Session 体系的不透明 Token，并保存到系统安全存储。
- 建立 `PlatformService` 封装通知、文件保存、外部链接和版本更新。
- Web 使用 Browser 实现，Desktop 使用 Tauri 实现，页面不写运行时分支。
- Tauri 不内置 Node.js 进程，不再维护一份本地 SQLite。
- 桌面端增加系统通知、托盘、快捷键和自动更新，业务模块不重写。

桌面端不存储正式业务数据，清理桌面端缓存后重新登录即可恢复全部数据。

## 23. 风险清单

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 服务器磁盘故障或误删 | 全部业务数据丢失 | SQLite 一致性快照、每日自动备份、异机加密复制、恢复演练 |
| 使用临时磁盘/Serverless | 重启或重部署后丢数据 | 只部署单机长驻 Server，启动检查持久化目录 |
| 账号被攻击 | 隐私数据泄露 | HTTPS、Argon2id、Session、CSRF、限流、安全头、可选私有网络 |
| BYOK 泄露 | 模型额度和隐私风险 | Server 加密、主密钥分离、不返回前端、不记录、费用限额 |
| SQLite 多实例并发写 | 锁竞争或部署复杂 | 单写实例、WAL、busy timeout、不使用 NFS |
| 封面占用磁盘 | 空间不足 | WebP 压缩、尺寸限制、孤立资源清理、空间告警 |
| 重试产生重复写入 | 数据重复 | `Idempotency-Key`、唯一索引、数据库事务 |
| 时区/夏令时 | 跨日统计错误 | LocalDate 与 UTC 时间分离、固定时区测试 |
| AI 幻觉 | 总结不可信 | 确定性快照、来源引用、Zod 与事实校验 |
| 模块越来越耦合 | 修改成本上升 | Repository、领域计算与聚合服务边界 |

## 24. Definition of Done

一期可以发布必须同时满足：

1. 八个页面均完成 PRD 中的 MVP 功能。
2. 所有正式数据只存在服务端 SQLite，不存在 Zustand、LocalStorage 或 IndexedDB 副本。
3. 每个业务模块通过鉴权 API 和 Repository 写入，并具有核心规则测试。
4. 首页和时光档案能响应各模块新增、编辑和删除。
5. SQLite 和封面可每日自动异机备份，备份经过校验且可完整恢复。
6. AI 总结具有来源引用，模型失败时安全降级。
7. AI Key 由 Server 加密保存且不返回前端，七天检查提醒可用。
8. 断网或 Server 失败时界面能明确反馈，不伪造成功、不重复写入。
9. Chrome、Edge、Safari、Firefox 完成主要路径验证。
10. 桌面、平板、手机布局可用，键盘导航和减少动态效果有效。
11. 没有已知的未鉴权访问、数据损坏、密钥泄露或不可恢复 migration 问题。
12. 完成一次真实环境的备份恢复演练。

## 25. 实施时参考资料

- [React Router Data Router](https://reactrouter.com/start/data/routing)
- [TanStack Query React 文档](https://tanstack.com/query/latest/docs/framework/react/installation)
- [Fastify 验证与序列化](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [SQLite 适用场景](https://www.sqlite.org/whentouse.html)
- [SQLite 事务隔离与 WAL](https://www.sqlite.org/isolation.html)
- [SQLite Online Backup API](https://www.sqlite.org/backup.html)
- [animal-island-ui 仓库与文档](https://github.com/guokaigdg/animal-island-ui)
- [WHO 成年人身体活动建议](https://www.who.int/initiatives/behealthy/physical-activity)
- [FDA 低风险一般健康产品政策](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices)
