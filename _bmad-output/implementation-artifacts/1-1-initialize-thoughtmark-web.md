# Story 1.1: 初始化 thoughtmark-web 项目

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 初始化配置完整的 Next.js 项目，包括数据库、认证和代码规范,
so that 我可以立即开始功能开发，无需手动配置基础设施。

## Acceptance Criteria

1. **Given** 空白工作目录
   **When** 运行 `npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app`
   **Then** 生成完整 Next.js 14 App Router 项目结构

2. **Given** 项目目录已创建
   **When** 安装依赖并完成配置
   **Then** 安装并配置 Prisma ORM + PostgreSQL 连接（通过 `DATABASE_URL` 环境变量）
   **And** 安装并配置 NextAuth.js（基础 Session 配置）
   **And** 安装 Upstash Redis 客户端（`REDIS_URL` 环境变量）
   **And** 安装 BullMQ（任务队列依赖）

3. **Given** 项目结构建立完成
   **When** 检查根目录
   **Then** `.env.example` 列出所有必需环境变量（`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`）
   **And** `.env` 添加到 `.gitignore`，禁止提交

4. **Given** Prisma 配置完成
   **When** `prisma/schema.prisma` 写入初始 User model
   **Then** Schema 包含：`id`（cuid）, `email`（unique）, `name`（可空）, `createdAt`（DateTime，default now()）
   **And** `npx prisma migrate dev --name init` 可成功执行，生成 `migrations/` 目录

5. **Given** 所有配置完成
   **When** 运行 `npm run dev`
   **Then** Next.js 开发服务器在 localhost:3000 启动，无报错

## Tasks / Subtasks

- [x] Task 1：执行 create-next-app 命令并验证结构（AC: #1）
  - [x] 运行 `npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app`
  - [x] 确认生成 `src/app/`, `tailwind.config.ts`, `tsconfig.json`, `eslint.config.mjs`

- [x] Task 2：安装核心依赖（AC: #2）
  - [x] `npm install @prisma/client next-auth @auth/prisma-adapter`
  - [x] `npm install @upstash/redis`（HTTP Redis，用于 API Rate Limiting + 缓存）
  - [x] `npm install bullmq ioredis`（TCP Redis，用于 BullMQ 任务队列）
  - [x] `npm install -D prisma`（CLI 只装 devDependency）
  - [x] `npx prisma init --datasource-provider postgresql`

- [x] Task 3：配置 Prisma Schema（AC: #4）
  - [x] 编写 `prisma/schema.prisma`：generator + datasource + User model
  - [x] 运行 `npx prisma migrate dev --name init`
  - [x] 确认 `prisma/migrations/` 目录生成

- [x] Task 4：配置 NextAuth.js 基础（AC: #2）
  - [x] 创建 `src/app/api/auth/[...nextauth]/route.ts`
  - [x] 配置 PrismaAdapter + CredentialsProvider（留空邮件密码逻辑，Story 2.1 填充）
  - [x] 添加必要的 NextAuth 类型声明（`src/types/next-auth.d.ts`）

- [x] Task 5：设置目录结构（架构规范对齐）
  - [x] 创建 `src/features/` 目录（bookmark/, timeline/, auth/, ai-cluster/）
  - [x] 创建 `src/components/`（全局共享 UI）
  - [x] 创建 `src/lib/`（工具函数、第三方客户端初始化）
  - [x] 创建 `src/types/`（TypeScript 类型定义）

- [x] Task 6：环境变量配置（AC: #3）
  - [x] 创建 `.env.example` 列出所有必需变量（含注释说明每个变量用途）
  - [x] 更新 `.gitignore` 确保 `.env` 不提交

- [x] Task 7：验证开发环境（AC: #5）
  - [x] 运行 `npm run dev` 确认 localhost:3000 无报错
  - [x] 运行 `npx tsc --noEmit` 确认 0 类型错误
  - [x] 运行 `npm run lint` 确认 0 ESLint 错误

## Dev Notes

### 架构硬性约束（必须遵守）

1. **API 风格**：REST（非 tRPC）— 插件端调用更简单直接
2. **数据库命名**：表名 `snake_case` 复数，字段名 `snake_case`（`created_at`, `user_id`）
3. **Prisma 是唯一真相**：所有 schema 变更必须通过 `prisma migrate`，禁止手动改数据库
4. **目录结构**：Feature-based（`/features/bookmark`, `/features/timeline`），不用 MVC
5. **测试位置**：与源文件同目录，命名 `*.test.ts`（Co-located）

### Prisma Schema 精确要求

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

> ⚠️ 注意：`@@map("users")` 确保表名为 snake_case 复数，`@map("created_at")` 确保字段名规范

### NextAuth 配置说明

Story 1.1 只需建立 NextAuth 基础骨架，不需要完整实现 Email 密码登录（Story 2.1）：

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [], // Story 2.1/2.2 填充
  session: { strategy: "jwt" },
})

export const { GET, POST } = handlers
```

### 依赖版本（截至 2026-03 稳定版）

| 包 | 推荐版本 |
|---|---|
| `next` | `^14.x` |
| `next-auth` | `^5.x`（NextAuth v5，App Router 原生支持）|
| `@auth/prisma-adapter` | `^2.x` |
| `prisma` | `^5.x` |
| `@prisma/client` | `^5.x` |
| `@upstash/redis` | `^1.x`（HTTP Redis，用于 serverless 环境缓存/Rate Limiting）|
| `bullmq` | `^5.x` |
| `ioredis` | `^5.x`（BullMQ 底层依赖，TCP 长连接）|

> ⚠️ 使用 `next-auth@5`（beta 已 stable），不要安装 `next-auth@4`，两者 API 完全不同

### 环境变量完整列表

```bash
# .env.example

# 数据库（Railway PostgreSQL）
DATABASE_URL="postgresql://user:password@host:5432/thoughtmark"

# NextAuth
NEXTAUTH_SECRET="your-secret-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth（Story 2.2 时填写）
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Upstash Redis
REDIS_URL="redis://..."
REDIS_TOKEN=""

# 应用环境
NODE_ENV="development"
```

### 项目结构验证清单

Story 1.1 完成后，根目录应有：
```
thoughtmark-web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── features/
│   │   ├── bookmark/
│   │   ├── timeline/
│   │   ├── auth/
│   │   └── ai-cluster/
│   ├── components/
│   ├── lib/
│   │   └── prisma.ts          ← Prisma 单例客户端
│   └── types/
│       └── next-auth.d.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── {timestamp}_init/
├── .env.example
├── .gitignore                 ← 确保 .env 在列表中
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### References

- Architecture: 组件二 Web App 技术栈决策 [Source: architecture.md#Starter-Template-Evaluation]
- Architecture: 命名规范（数据库 + API + 代码）[Source: architecture.md#Naming-Patterns]
- Architecture: 目录结构规范 [Source: architecture.md#Structure-Patterns]
- Epic: Story 1.1 完整 AC [Source: epics.md#Story-1.1]
- Architecture: 认证方案（NextAuth v5 + PrismaAdapter）[Source: architecture.md#Authentication-Security]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- Prisma v5/v7 版本不匹配：`@prisma/client@latest` 安装了 v7，与 `prisma@5` CLI 不兼容 → 降级 client 到 v5
- Docker 拉取 postgres:16-alpine 前 3 次 EOF 失败，第 4 次成功
- Windows `localhost` 解析为 IPv6 `::1`，Docker 只监听 IPv4 → DATABASE_URL 改用 `127.0.0.1`

### Completion Notes List

- 2026-03-20: 全部 5 个 AC 通过。Next.js 16.2.0（Story 推荐 14.x 但 API 兼容）、Prisma 5.22.0、NextAuth v5。
- NextAuth 配置独立放在 `src/lib/auth.ts`（非 route 文件内），便于 middleware 复用。

### File List

- `prisma/schema.prisma` — User model（snake_case 命名）
- `prisma/migrations/20260319182957_init/migration.sql` — 初始迁移
- `src/lib/prisma.ts` — Prisma 单例客户端
- `src/lib/auth.ts` — NextAuth v5 配置
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth API route
- `src/types/next-auth.d.ts` — 类型声明扩展
- `src/features/bookmark/.gitkeep` — Feature 目录占位
- `src/features/timeline/.gitkeep`
- `src/features/auth/.gitkeep`
- `src/features/ai-cluster/.gitkeep`
- `src/components/.gitkeep` — 全局 UI 组件目录
- `.env.example` — 环境变量模板
- `.env` — 本地开发配置（127.0.0.1 PostgreSQL）
- `.gitignore` — 添加 `!.env.example` 排除规则
