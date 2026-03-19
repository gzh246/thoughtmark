---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd.md']
workflowType: 'architecture'
project_name: 'Thoughtmark'
user_name: 'A-pc'
date: '2026-03-20'
status: 'complete'
completedAt: '2026-03-20'
---

# Architecture Decision Document — Thoughtmark

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**功能需求（6 个能力域，FR1-FR31）：**

| 能力域 | FR 范围 | 核心架构含义 |
|---|---|---|
| 账户与认证 | FR1-FR6 | OAuth + JWT，数据原子删除（GDPR）|
| 书签收藏 | FR7-FR12 | 插件轻量化，离线队列，去重逻辑 |
| 时间轴与浏览 | FR13-FR17 | 读多写少，分页/筛选优化 |
| AI 聚类 | FR18-FR21 | 强制异步，消息队列，聚类结果存储 |
| 通知与 Onboarding | FR22-FR24 | 邮件服务 + 浏览器推送双通道 |
| 订阅 + 运营 + 记忆推送 | FR25-FR31 | Stripe Webhooks，定时任务，埋点系统 |

**非功能需求（驱动架构决策）：**

| NFR | 具体要求 | 架构影响 |
|---|---|---|
| 性能 | 收藏 <1s，首屏 <2s | 插件写入异步化，CDN + 边缘缓存 |
| 安全 | AES-256，HTTPS/TLS 1.2+，bcrypt | 数据层加密，传输强制 TLS |
| 可扩展 | 5,000 用户无降级，P99 <200ms | 后端无状态，连接池，Redis 缓存 |
| 可靠 | 99.9% 可用，7 天离线缓存 | 自动备份，Service Worker 离线队列 |

### Scale & Complexity

- **复杂度级别**：`medium-high`
- **主要技术域**：Full-Stack SaaS + Browser Extension + AI Microservice
- **预估架构组件数**：8 个主要组件

### Technical Constraints & Dependencies

1. **Chrome Manifest V3**：Service Worker（无持久后台页），改变插件生命周期管理
2. **AI 聚类异步化**：FR21 强制消息队列架构，不可同步阻塞
3. **GDPR 原子删除**：账户删除时书签/注解/聚类结果必须一并清除（事务性操作）
4. **跨设备同步**：Last-Write-Wins 策略 + 离线缓存队列

### Cross-Cutting Concerns Identified

- **身份认证**：插件 + Web App 共享 JWT，影响所有 FR 域
- **数据加密**：AES-256 静态加密，影响所有数据访问路径
- **事件驱动**：AI 聚类触发（FR18/21）+ 通知（FR24）+ 记忆推送（FR31）共用消息队列
- **监控与埋点**：运营仪表盘（FR29）要求关键用户行为全链路埋点

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack SaaS（Next.js）+ Browser Extension（WXT）+ AI 异步微服务

### 组件一：浏览器插件

**Selected Starter: WXT Framework**

```bash
npx wxt@latest init thoughtmark-extension --template react-ts
```

- 支持 React + TypeScript；Manifest V3 原生支持
- 自动处理 Service Worker 生命周期（解决 Chrome MV3 约束）
- 跨浏览器构建：Chrome / Firefox / Edge

**启动器内置的架构决策**：TypeScript 严格模式、ESLint、Vite 构建、热重载开发

### 组件二：Web App + API

**Selected Starter: Next.js（REST API 模式，非 tRPC）**

```bash
npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app
```

- Next.js 14（App Router）+ TypeScript + Tailwind CSS
- API Routes 作为后端 REST 入口，插件调用更简单直接
- Prisma ORM + PostgreSQL 数据层
- NextAuth.js 处理 Google OAuth + Email 认证

**为什么不用 T3/tRPC**：浏览器插件调用 REST 更自然，tRPC 引入不必要的复杂性

**技术栈全貌**：
- 后端：Next.js API Routes + Prisma + PostgreSQL
- 缓存 + 队列：Redis + BullMQ（AI 聚类异步任务）
- 邮件：Resend / Sendgrid
- 支付：Stripe
- 部署：Vercel（前端）+ Railway（PostgreSQL + Redis）

**从 MVP 到 V3 的演进路径（不换技术栈）**：
- MVP：单体 Next.js；AI 聚类用 BullMQ 队列
- V2：拆出独立 AI 微服务 + WebSocket 实时更新
- V3：Docker + K8s 多租户部署 + 企业 SSO

## Core Architectural Decisions

### Data Architecture

| 决策 | 选择 | 理由 |
|---|---|---|
| 数据库 | PostgreSQL（via Prisma ORM）| 关系型最适合书签-注解-聚类关联数据 |
| 缓存层 | Redis（Upstash）| API 响应缓存 + BullMQ 队列双用途 |
| 迁移策略 | Prisma Migrate（版本控制 schema）| 与 Next.js 生态无缝集成 |
| 数据同步冲突 | Last-Write-Wins（时间戳判断）| MVP 足够，V2 可升级为 CRDT |

### Authentication & Security

| 决策 | 选择 |
|---|---|
| 认证方案 | NextAuth.js（Google OAuth + Email Magic Link）|
| 插件端 Token | 共享 NextAuth Session Cookie / LocalStorage JWT |
| 数据加密 | 应用层加密注解内容字段 + 数据库层 PostgreSQL 加密 |
| API 安全 | Rate Limiting（Upstash Redis）+ NextAuth CSRF 保护 |

### API & Communication Patterns

| 决策 | 选择 |
|---|---|
| API 风格 | REST（插件 → Next.js API Routes）|
| 异步任务 | BullMQ（Redis 队列）处理 AI 聚类、邮件、记忆推送 |
| 实时通知 | MVP 用邮件推送；V2 升级 WebSocket |
| 错误格式 | 统一 `{code, message, details}` 结构 |

### Frontend Architecture

| 决策 | 选择 |
|---|---|
| 状态管理 | Zustand（轻量，避免 Redux 过度工程）|
| 组件结构 | Feature-based 目录（`/features/timeline`, `/features/bookmark`）|
| 插件 UI | WXT Popup；复用 Web App 共享 UI 组件 |

### Infrastructure & Deployment

| 决策 | 选择 |
|---|---|
| 前端部署 | Vercel（Next.js 零配置）|
| 后端/DB | Railway（PostgreSQL + Redis 托管）|
| CI/CD | GitHub Actions → Vercel Preview + Production |
| 监控 | Sentry（错误追踪）+ Vercel Analytics |
| 埋点 | PostHog（开源，支持 Feature Flags + 用户漏斗）|

## Implementation Patterns & Consistency Rules

### Naming Patterns

**数据库命名（Prisma schema → PostgreSQL）：**
- 表名：`snake_case` 复数（`bookmarks`, `users`, `annotations`）
- 字段名：`snake_case`（`created_at`, `user_id`, `why_saved`）
- 外键：`{table}_id`（`user_id`, `bookmark_id`）

**API 命名：**
- 端点：`/api/{resource}`（复数）+ HTTP Method 区分操作
  - ✅ `GET /api/bookmarks` `POST /api/bookmarks` `DELETE /api/bookmarks/:id`
  - ❌ `GET /api/getBookmarks` `POST /api/createBookmark`
- Query Params：`camelCase`（`?userId=xxx&startDate=xxx`）

**代码命名：**
- 组件：`PascalCase`（`BookmarkCard.tsx`, `TimelineView.tsx`）
- 文件：组件用 PascalCase，工具函数用 `camelCase`（`formatDate.ts`）
- 变量/函数：`camelCase`（`userId`, `getBookmarks`）
- 常量：`UPPER_SNAKE_CASE`（`MAX_BOOKMARKS_FREE_TIER`）

### Structure Patterns

**Web App 目录结构：**
```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API Routes（后端入口）
│   └── (dashboard)/       # Route Groups
├── features/              # Feature-based 组织
│   ├── bookmark/
│   ├── timeline/
│   ├── ai-cluster/
│   └── auth/
├── components/            # 全局共享 UI 组件
├── lib/                   # 工具函数、第三方客户端初始化
└── types/                 # TypeScript 类型定义
```

**测试文件位置：** 与源文件同目录，命名 `*.test.ts`（Co-located，不用独立 `__tests__` 目录）

### Format Patterns

**API 响应格式（统一）：**
```typescript
// 成功
{ "data": { ... }, "meta": { "page": 1, "total": 100 } }

// 错误
{ "error": { "code": "BOOKMARK_NOT_FOUND", "message": "...", "details": {} } }
```

**日期格式：** ISO 8601 字符串（`"2026-03-20T00:00:00Z"`），前端显示时本地化

**JSON 字段命名：** API 响应用 `camelCase`（JavaScript 标准）

### Process Patterns

**错误处理：**
- API 层：`try/catch` + 统一 `ApiError` 类抛出
- 前端：React Error Boundary + Zustand error state
- 插件离线错误：写入本地队列，不向用户报错，静默重试

**加载状态：**
- 命名：`isLoading`, `isFetching`（非 `loading`）
- 粒度：每个 feature 独立 loading state，不共享全局 loading

**All AI Agents MUST：**
- 遵守 Prisma schema 中的表/字段命名（`snake_case`）
- API 响应统一用 `{ data, error, meta }` 结构
- 新增 feature 必须在 `/features/` 下建独立目录
- 错误码使用全大写 SCREAMING_SNAKE_CASE（`BOOKMARK_NOT_FOUND`）


## Project Structure & Boundaries

> **仓库策略：Monorepo**
> 
> `thoughtmark-web` 和 `thoughtmark-extension` 共存于同一 Git 仓库，共享 CI/CD 配置。
> MVP 阶段单人开发，Monorepo 简化版本管理和跨项目变更。

```
thoughtmark/                     # Git 仓库根目录
├── .github/workflows/ci.yml     # GitHub Actions CI（统一）
├── thoughtmark-web/             # Next.js Web App + API
├── thoughtmark-extension/       # WXT 浏览器插件
├── docs/                        # 开发文档 & 历史
├── _bmad/                       # BMAD 配置
├── _bmad-output/                # BMAD 产出
└── README.md
```

### thoughtmark-web（Next.js）

```
thoughtmark-web/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
├── .gitignore
├── .github/workflows/ci.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── timeline/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/          # FR1-FR2 NextAuth
│   │       ├── bookmarks/     # FR7-FR12
│   │       ├── clusters/      # FR18-FR21 AI 聚类
│   │       ├── subscriptions/ # FR25-FR28 Stripe
│   │       └── admin/         # FR29-FR30
│   ├── features/
│   │   ├── auth/
│   │   ├── bookmark/
│   │   ├── timeline/
│   │   ├── ai-cluster/
│   │   ├── onboarding/        # FR22
│   │   └── admin/
│   ├── components/ui/
│   ├── lib/
│   │   ├── db.ts              # Prisma 单例
│   │   ├── auth.ts            # NextAuth 配置
│   │   ├── redis.ts           # Upstash Redis
│   │   ├── queue.ts           # BullMQ（AI 聚类 + 邮件 + FR31）
│   │   ├── stripe.ts
│   │   └── posthog.ts
│   ├── types/index.ts
│   └── middleware.ts
└── public/assets/
```

### thoughtmark-extension（WXT + React）

```
thoughtmark-extension/
├── package.json
├── wxt.config.ts
├── tsconfig.json
├── .env
└── src/
    ├── entrypoints/
    │   ├── popup/             # FR7-FR10 收藏弹窗
    │   │   ├── App.tsx
    │   │   └── index.html
    │   ├── background.ts      # Service Worker + FR11 离线队列
    │   └── content.ts
    ├── components/
    │   ├── BookmarkForm/
    │   └── SyncStatus/
    └── lib/
        ├── api.ts             # 调用 thoughtmark-web REST API
        ├── storage.ts         # Chrome Storage 离线缓存
        └── sync.ts            # FR11 离线队列同步逻辑
```

### FR → 目录映射

| FR 范围 | 目录位置 |
|---|---|
| FR1-FR6（账户认证）| `src/app/api/auth/` + `src/features/auth/` |
| FR7-FR12（书签收藏）| Extension `popup/` + Web `api/bookmarks/` |
| FR13-FR17（时间轴）| `src/features/timeline/` + `api/bookmarks/` |
| FR18-FR21（AI 聚类）| `src/features/ai-cluster/` + `api/clusters/` + `lib/queue.ts` |
| FR22-FR24（通知/引导）| `src/features/onboarding/` + BullMQ 邮件队列 |
| FR25-FR28（订阅）| `src/app/api/subscriptions/` + `lib/stripe.ts` |
| FR29-FR31（运营/记忆推送）| `src/features/admin/` + `lib/posthog.ts` + BullMQ 定时任务 |

## Architecture Validation Results

### Coherence Validation ✅

- **决策兼容性**：WXT + React 与 Next.js React 生态共享组件，无技术冲突；BullMQ 依赖 Redis，与缓存层共用 Upstash，资源复用
- **模式一致性**：Feature-based 目录与 Zustand feature store 对齐；snake_case DB 字段与 Prisma 约定一致
- **结构对齐**：目录结构完整支持所有 5 个架构决策类别

### Requirements Coverage Validation ✅

- **FR 覆盖**：FR1-FR31 全部有对应架构路径（已建立明确映射表）
- **NFR 覆盖**：
  - 性能（<1s）→ BullMQ 异步化 + Redis 缓存
  - 安全（AES-256）→ 应用层加密 + NextAuth CSRF
  - 可扩展（5,000 用户）→ 后端无状态 + Redis 连接池
  - 可靠（99.9%）→ Railway 托管备份 + Service Worker 离线队列

### Gap Analysis Results

**无 Critical Gaps**

**潜在改进（Nice-to-Have）：**
- Prisma schema 草稿（建议在 Epic 拆解阶段完成）
- API 契约文档（建议用 Swagger/OpenAPI，在实现阶段添加）
- 插件 → Web App 认证流程细节（留给 Epic 阶段的 AC）

### Architecture Completeness Checklist

- [x] 项目上下文分析（Step 2）
- [x] 启动模板选型（Step 3）
- [x] 核心架构决策 5 类（Step 4）
- [x] 实现模式规范（Step 5）
- [x] 完整项目目录结构（Step 6）
- [x] 架构验证（Step 7）

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION ✅**

**Confidence Level: High**

**Key Strengths:**
- 技术栈选择自洽，从 MVP 到 V3 无需重构
- 双组件架构边界清晰（Web App vs Extension）
- AI 代理冲突点已通过命名规范和统一 API 格式解决
- FR1-FR31 全部有明确目录映射

**First Implementation Priority:**
```bash
# Step 1: 初始化 Web App
npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app

# Step 2: 初始化浏览器插件
npx wxt@latest init thoughtmark-extension --template react-ts
```

