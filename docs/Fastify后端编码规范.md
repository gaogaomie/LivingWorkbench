# Fastify 后端企业级编码规范

版本：1.0  
适用范围：`apps/server`、`packages/shared` 中的服务端契约  
规范等级：强制  

本文用于约束人工开发、代码生成工具和大模型代理。目标不是让代码“看起来分层”，而是控制变更放大、认知负担和隐性依赖，使后端在持续迭代后仍然可理解、可测试、可审计、可替换。

## 1. 规范用语

- **必须（MUST）**：违反即不得合并。
- **禁止（MUST NOT）**：出现即视为阻断问题。
- **应该（SHOULD）**：默认遵守；偏离时必须在变更说明中给出理由。
- **可以（MAY）**：按场景选择，不形成默认依赖。

规范发生冲突时，按以下优先级处理：数据安全与正确性 > API 契约 > 模块边界 > 可测试性 > 性能 > 局部代码风格。

## 2. 总体设计原则

### 2.1 控制复杂度

- 一个需求若需要修改三个以上业务模块，应先检查是否存在知识泄漏或抽象缺失。
- 模块必须隐藏至少一项重要决策，例如存储结构、认证细节、文件格式或第三方协议。
- 禁止为了“分层”创建只转发参数、没有校验、编排或策略的浅包装类。
- 公共接口应少而稳定，复杂度下沉到模块内部；不要把默认值、重试、序列化等决策推给每个调用方。
- 功能开发和大范围重构应分开提交；当前需求范围外不得顺手重写整个模块。

### 2.2 单向依赖

服务端依赖方向固定为：

```text
Route / Plugin
      ↓
Application Service
      ↓
Domain Policy / Repository Interface
      ↓
Repository Implementation / External Adapter
      ↓
Database / File System / Third-party API
```

必须遵守：

- Route 可以依赖 Service、共享 Schema 和 HTTP 工具。
- Service 可以依赖 Repository 接口、领域类型和事务边界。
- Repository 可以依赖 Drizzle、数据库 Schema 和持久化映射。
- 底层模块禁止反向导入 Route、Fastify Request/Reply 或 Web 代码。
- `packages/shared` 禁止依赖 Fastify、Drizzle、Node 文件系统或浏览器实现。

### 2.3 当前仓库目录职责

```text
apps/server/src/
  app.ts                 # Composition Root，只装配依赖和插件
  server.ts              # 进程入口，只负责启动和优雅退出
  config/                # 环境变量读取、校验和配置类型
  plugins/               # 全局或基础设施 Fastify 插件
  routes/<module>/       # HTTP 路由插件与路由集成测试
  services/              # 用例编排、事务、外部资源流程
  repositories/          # 数据访问和持久化映射
  db/                    # 连接、Schema、迁移
  security/              # 认证、授权、Token、CSRF
  test/                  # 通用测试基础设施
```

当单个业务模块超过约 5 个文件或跨层修改频繁时，可以迁移为 `modules/<domain>/` 纵向目录；迁移必须保持上述依赖方向，不能同时存在两套业务实现。

## 3. Fastify 应用与插件

### 3.1 Application Factory

- `buildApp()` 必须返回 Fastify 实例，禁止在其中调用 `listen()` 或 `process.exit()`。
- `server.ts` 是唯一允许监听端口和处理进程信号的文件。
- 测试必须通过 `buildApp()` 和 `app.inject()` 启动，不占用真实端口。
- 数据库、配置、时钟、外部客户端等副作用依赖必须可注入，禁止在 Route 模块顶层创建连接。
- 应用关闭必须通过 `onClose` 释放数据库、文件句柄、定时器和外部连接。

### 3.2 插件封装

- 每个业务域使用一个明确命名的 `FastifyPluginAsync` 注册路由。
- `app.register()` 默认创建封装作用域。认证 Hook、错误处理器和装饰器应注册在最小必要作用域。
- 只有需要向父级或兄弟插件暴露装饰器的基础设施插件，才可以使用 `fastify-plugin` 打破封装。
- 插件注册顺序是依赖图的一部分：基础安全插件 → 解析器 → 响应和错误处理 → 健康检查 → 业务路由。
- 插件 Options 必须定义显式接口，禁止传递无类型配置袋或整个全局容器。
- 禁止在插件加载后动态修改已经完成注册的依赖或装饰器。

### 3.3 Decorator

- Decorator 只用于真正的请求级或应用级公共能力，例如数据库连接、认证上下文、跟踪信息。
- 名称必须带业务含义，避免 `utils`、`helper`、`ctx` 等通用名字。
- Request Decorator 必须在请求创建前声明稳定形状，禁止按请求临时添加任意属性。
- 禁止把大型 Service Locator 或整个依赖容器挂到 Fastify 实例上。

### 3.4 Hook 选择

| Hook | 允许职责 | 禁止职责 |
| --- | --- | --- |
| `onRequest` | 请求 ID、基础追踪、极早期拒绝 | 读取尚未解析的 Body |
| `preParsing` | 流级别限制和转换 | 业务校验 |
| `preValidation` | 同步补充校验上下文 | 数据库查询、远程调用 |
| `preHandler` | 认证、授权、需要 I/O 的前置检查 | 执行业务用例主体 |
| `preSerialization` | 响应契约校验或序列化前转换 | 数据库写入 |
| `onSend` | Header、缓存策略、最终载荷处理 | 再次执行业务逻辑 |
| `onResponse` | 指标、耗时、审计事件 | 修改已经发送的响应 |
| `onClose` | 释放资源 | 启动新后台任务 |

同一函数禁止混用 callback 与 `async/await`。Hook 抛出的异常交给统一错误处理器，不得吞掉后继续请求。

## 4. Route 编码规范

### 4.1 Route 的唯一职责

Route Handler 只做以下五步：

1. 读取已验证的身份和请求数据；
2. 调用一个明确的应用用例；
3. 将领域错误映射为 HTTP 状态和业务错误码；
4. 将结果映射为公开 DTO；
5. 使用统一响应函数返回。

Route 中禁止：

- 直接导入数据库表或写 Drizzle 查询；
- 开启事务或跨多表编排；
- 写复杂统计、金额计算和状态机；
- 直接操作文件系统或第三方 SDK；
- 使用 `try/catch` 捕获所有异常后返回 200；
- 读取 `process.env`；
- 返回裸对象、裸数组、裸错误或空响应。

推荐形态：

```ts
app.post("/records", async (request, reply) => {
  const session = requireMutation(request, reply, authService, config);
  if (!session) return;

  const parsed = createRecordSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(reply, parsed.error);

  const record = await recordService.create(session.user.id, parsed.data);
  return reply.status(201).send(createApiSuccess(recordResponseSchema.parse(record)));
});
```

### 4.2 路由命名与 HTTP 语义

- URL 使用复数名词和 `kebab-case`，禁止动词堆叠，例如优先 `/orders/:id/cancellation`，谨慎使用 `/doCancelOrder`。
- GET 必须无业务副作用；不得创建记录、刷新 Token 或改变核心状态。
- POST 用于创建或命令；PUT 用于完整替换或幂等保存；PATCH 用于局部状态变化；DELETE 用于删除语义。
- 创建可返回 HTTP 201；成功业务码仍固定为数字 `200`。
- 禁止返回 204、304 等无响应体状态，因为本项目要求所有 API 返回统一响应结构。
- 列表接口必须设置上限；大量数据必须使用游标分页，禁止无界返回整表。
- 对重复提交敏感的创建操作，应使用客户端 UUID、幂等键或唯一约束。

## 5. 请求校验与响应序列化

### 5.1 输入边界

- `body`、`params`、`query`、关键 Header 和上传文件全部是不可信输入。
- 输入必须在进入 Service 前通过共享 Zod Schema 或等价的声明式 Schema 校验。
- 禁止 `request.body as Xxx` 直接断言可信类型。
- Schema 必须限制字符串长度、数组数量、数字范围、枚举、日期格式和可空性。
- 数据库存在性、权限和唯一性等异步规则放在 Service 或 `preHandler`，禁止放入异步 Schema 校验器。
- Schema 是应用代码，禁止接收用户上传的动态 Schema 并交给 Fastify/Ajv 编译。
- 未声明字段的处理策略必须明确；安全敏感输入默认拒绝未知字段。

### 5.2 输出边界

- 数据库 Row、ORM 实体和第三方响应禁止直接返回给客户端。
- Route 必须通过公开 Response Schema 或显式 Mapper 生成 DTO。
- DTO 不得包含密码哈希、Session 哈希、密钥、内部路径、软删除实现字段等内部信息。
- 所有 API 必须遵循 [`编码规范.md`](./编码规范.md) 的 `code/message/data` 契约。
- 响应 Schema 与统一响应守卫必须同时存在：Schema 控制业务字段，守卫控制顶层契约。

## 6. Service 与领域逻辑

- Service 方法应表达业务用例，如 `createEntry`、`restoreBackup`，避免 `handle`、`processData`。
- 一个方法只处理一个用例，但不要机械追求 4 行函数；模块应隐藏足够复杂度，而不是制造多层转发。
- 业务规则、权限决策、状态转换和跨资源编排必须集中，禁止散落在 Route、页面和 Repository 中各写一份。
- 三个以上参数优先使用命名参数对象；布尔参数通常应拆成两个明确用例或枚举策略。
- 查询方法不得产生隐藏写副作用；命令方法的副作用必须从名称和接口上可见。
- 第三方 SDK 必须包在 Adapter 内，并把供应商异常翻译成内部领域错误。
- 禁止 Service 返回 Fastify Reply、HTTP 状态码或框架错误对象。

## 7. Repository 与数据库

- Repository 负责数据访问、持久化映射和必要的数据库级查询优化。
- 禁止 Repository 依赖 Fastify、Cookie、Header 或响应 DTO。
- 所有查询必须包含用户/租户边界；管理员能力也必须显式授权，不能依赖“目前只有一个用户”。
- 使用 Drizzle 参数化表达式，禁止字符串拼接 SQL。
- 多表原子操作必须在单个事务中完成；外部网络调用不得放在数据库事务内部。
- 事务必须短小，且按稳定顺序更新资源，降低锁竞争和死锁风险。
- 新表必须定义主键、外键删除策略、必要索引、唯一约束和时间字段语义。
- 金额使用最小整数单位；日期、时区和排序兜底规则必须显式。
- 查询必须选择所需列；禁止在热路径无条件 `select *`、N+1 查询或无界扫描。
- Migration 只允许追加；已投入使用的 Migration 禁止改写。
- Schema 变更必须同时提供迁移、回滚/恢复说明、兼容策略和迁移测试。

## 8. 错误模型

### 8.1 错误分类

| 类别 | 示例 | HTTP | 处理方式 |
| --- | --- | --- | --- |
| 输入错误 | `VALIDATION_ERROR` | 400 | 返回安全的字段或请求信息 |
| 未认证 | `UNAUTHENTICATED` | 401 | 不泄露账号存在性 |
| 无权限 | `FORBIDDEN` | 403 | 不暴露资源细节 |
| 未找到 | `NOT_FOUND` | 404 | 使用稳定业务码 |
| 并发冲突 | `CONFLICT` | 409 | 返回刷新或重试提示 |
| 限流 | `RATE_LIMITED` | 429 | 可提供安全的重试信息 |
| 依赖不可用 | `DATABASE_UNAVAILABLE` | 503 | 记录内部原因，外部用通用文案 |
| 未知异常 | `SERVER_UNAVAILABLE` | 500 | 不返回内部 message 和 stack |

- 预期业务失败使用稳定结果类型或领域错误；未知编程错误必须抛出并由根错误处理器处理。
- 禁止 `catch (error) { return null; }`、空 catch、仅写日志后继续成功响应。
- 只捕获当前层能够处理或翻译的错误；其余错误继续抛出。
- 错误信息必须包含供内部定位的上下文，但公开响应不得包含堆栈、SQL、文件路径或供应商原文。
- 一个错误只能记录一次完整堆栈，避免每层重复日志。

## 9. 认证、授权与安全

- 认证回答“是谁”，授权回答“能否操作这个资源”；两者必须分开验证。
- 所有写操作必须验证 Session、Origin 和 CSRF；敏感读操作也必须验证资源所有权。
- Cookie 必须使用 `HttpOnly`、合理的 `SameSite`、生产 HTTPS 下的 `Secure` 和明确作用域。
- 密码使用 Argon2id 等专用密码哈希；Token 和 CSRF 值只存哈希。
- 登录、密码重置、上传、恢复和高成本查询必须限流。
- Header、日志和错误响应不得回显秘密；生产日志必须配置字段脱敏。
- 文件上传必须限制请求体、文件数、文件大小、真实内容、解码像素和最终存储路径。
- 存储路径必须由服务端生成并校验，禁止把用户文件名直接拼接为磁盘路径。
- 外部请求必须配置连接/响应超时、响应大小上限和允许的目标地址，防止 SSRF 与资源耗尽。
- 安全相关依赖升级必须审阅变更日志并执行依赖审计；审计工具失败不等于没有漏洞。

## 10. 异步、并发与资源管理

- 所有 Promise 必须 `await`、返回或明确使用 `void` 并附带错误处理；禁止浮动 Promise。
- 禁止在请求热路径执行可替代的同步文件 I/O、CPU 密集循环或无上限解压/解码。
- 当前 `better-sqlite3` 同步访问是明确的架构例外；新增重查询前必须评估事件循环阻塞。
- 外部 I/O 必须有超时和取消策略；重试仅用于幂等操作，必须设置次数、退避和抖动。
- 禁止在内存中保存无界 Map、数组、上传内容或跨请求状态。
- 后台任务必须有所有者、停止机制、失败日志和重复执行保护；禁止在 Route 中随手 `setInterval`。
- 优雅停机期间停止接收新请求，等待在途请求到合理期限并关闭资源。

## 11. 日志、指标与审计

- 使用 Fastify/Pino 的结构化日志，禁止 `console.log/error`。
- 日志事件使用稳定英文事件名，面向人的说明可使用中文。
- 每条错误日志至少包含 `requestId`、稳定错误码、模块和必要的非敏感实体 ID。
- 禁止记录完整请求 Body；需要诊断时只记录白名单字段或摘要。
- 健康检查、静态资源等高频低价值日志应降低级别或采样。
- `onResponse` 记录状态、耗时和路由模板，不记录包含用户输入的原始 URL。
- 认证失败、权限拒绝、备份恢复、管理员操作和敏感配置变化应产生审计事件。
- 日志 Serializer 必须纯净且不得抛异常。

## 12. TypeScript 与可读性

- 必须开启 `strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`。
- 禁止显式 `any`、双重断言和用 `as` 跳过边界校验；外部库例外必须封装并写明原因。
- 名称必须表达意图：类/接口用名词，函数用动词，布尔值使用 `is/has/can/should`。
- 同一概念只用一个词，例如项目内统一 `get` 或 `find` 的语义，不混用 `fetch/retrieve/load`。
- 常量替代魔法数字，尤其是超时、大小、重试、分页和安全参数。
- 函数保持单一抽象层；超过约 40 行、嵌套超过 3 层或参数超过 3 个时必须审查是否需要拆分。
- 注释解释“为什么、约束和不变量”，禁止复述代码、保留注释掉的旧代码或写文件内变更日志。
- 公共模块必须写接口契约说明：输入、输出、错误、幂等性、副作用和性能边界。

## 13. 配置与依赖

- `process.env` 只允许出现在配置模块和受控 CLI 入口；业务代码只依赖已校验的 Config 类型。
- 启动时一次性验证全部必需配置，生产环境禁止危险默认值。
- 配置项名称、单位和默认值必须明确，例如 `REQUEST_TIMEOUT_MS`，禁止含糊的 `TIMEOUT`。
- 新依赖必须说明：现有能力为何不足、维护状态、许可证、安全风险、包体和替换成本。
- 禁止为一个简单函数引入大型依赖；优先使用标准库和已有依赖。
- Fastify、核心插件和 Node 运行时版本必须遵循兼容矩阵和 LTS 策略。

## 14. 测试规范

### 14.1 测试层级

- 纯函数和领域规则：单元测试。
- Repository：真实 SQLite 内存库和迁移后的集成测试。
- Route：`buildApp()` + `app.inject()`，覆盖完整认证、校验和响应契约。
- 文件与备份：临时目录和真实序列化流程，不访问正式目录。
- 关键用户流程：少量浏览器端到端测试。

### 14.2 每个接口的最低覆盖

1. 正常成功；
2. 未认证或无权限；
3. Body/Params/Query 边界错误；
4. 未找到、冲突或依赖失败；
5. `code/message/data` 精确顶层结构；
6. 数据隔离，不能读取或修改其他用户记录；
7. 幂等、分页、时间或事务等该接口特有不变量。

测试必须快速、独立、可重复、自验证：

- 固定时钟或注入时间源，禁止依赖真实日期。
- 禁止依赖执行顺序、外部网络、开发机数据库和真实环境变量。
- 每个测试只表达一个行为概念，名称描述“场景 + 期望”。
- 不为了提高覆盖率测试私有实现细节；测试公开行为和重要不变量。
- Bug 修复必须先添加能复现问题的回归测试。

## 15. 性能与容量

- 列表端点必须有最大 `limit`；默认值和上限必须是命名常量。
- 禁止先读取全表再在内存筛选、排序和分页，除非数据规模有明确上限并记录理由。
- 避免 N+1 查询；需要时使用 Join、批量查询或预加载 Map。
- 大文件禁止长期使用 Base64 JSON；达到容量阈值后改为受控的短时下载 URL，并在 ADR 中记录契约变化。
- 缓存必须定义键、TTL、最大容量、失效方式和数据隔离规则。
- 性能优化必须有测量依据；禁止用难读代码换取未经验证的微小收益。

## 16. API 版本与兼容性

- 公共 API 使用显式版本前缀；破坏性变更必须进入新版本或提供迁移窗口。
- 添加可选字段通常向后兼容；删除、重命名、改变类型或语义属于破坏性变更。
- 错误码一经发布视为公共契约，禁止随意复用或改变含义。
- 数据库 Schema 版本、备份格式版本和 API 版本分别管理，禁止混为一个版本号。
- 废弃能力必须记录替代方案、警告期和删除日期。

## 17. 大模型与代码代理强制规则

任何大模型或代码代理开始修改后端前，必须依次完成：

1. 阅读根目录 `AGENTS.md`、本规范和 `docs/编码规范.md`；
2. 检查当前工作区状态，保护用户已有改动；
3. 使用代码知识图谱定位入口、调用方和影响范围；
4. 写明本次变更的不变量、允许修改范围和验证命令；
5. 优先修改现有深模块，禁止未经证明新增 `manager/helper/utils/common`；
6. 先补或更新行为测试，再完成实现；
7. 不新增依赖、不改数据库 Schema、不改变公共 API，除非任务明确要求；
8. 完成后运行 `bun run check:backend`；
9. 使用搜索确认没有遗留旧响应、204/304、`any`、`console` 或越层数据库访问；
10. 只报告实际执行并通过的检查，禁止根据旧文档声称“全绿”。

`check:backend` 只负责可机械识别的最低门槛，不能替代架构、安全和业务正确性审查。脚本通过不代表整份规范自动合规。

大模型禁止行为：

- 根据文件名猜实现而不读取真实代码；
- 复制粘贴一个近似 Route 后只改名字；
- 用 `as any`、`@ts-ignore`、禁用 Lint 或删除测试换取通过；
- 同时重构无关模块、格式化全仓或覆盖用户改动；
- 创建兼容层、Legacy 分支、重复实现却不说明删除计划；
- 捕获异常后静默成功；
- 遇到检查失败时隐瞒、归因不明或声称“应该没问题”。

## 18. Definition of Done

后端变更只有同时满足以下条件才算完成：

- 需求和边界条件已实现；
- Route、Service、Repository 职责没有越界；
- 输入、输出和错误均有明确契约；
- 认证、授权、用户隔离和敏感数据处理已检查；
- 新行为和失败路径有自动化测试；
- 没有新增未说明的同步阻塞、无界查询或内存增长；
- `bun run check:backend` 通过；
- 变更说明包含范围、兼容性、验证结果和已知限制；
- 代码审查从正确性、可读性、架构、安全和性能五个维度通过。

## 19. Fastify 官方依据

- [Plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/)
- [Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [Errors](https://fastify.dev/docs/latest/Reference/Errors/)
- [Logging](https://fastify.dev/docs/latest/Reference/Logging/)

本规范结合当前项目约束，比 Fastify 默认行为更严格。例如 Fastify 默认错误响应可能包含 `statusCode/error/message`，本项目必须由统一错误处理器转换为 `code/message/data`。
