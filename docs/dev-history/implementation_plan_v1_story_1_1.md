# Story 1.1: 初始化 thoughtmark-web 项目

初始化一个完整配置的 Next.js 14 App Router 项目，包括数据库 ORM（Prisma + PostgreSQL）、认证骨架（NextAuth v5）、缓存/队列依赖（Upstash Redis + BullMQ）和代码规范，使后续功能开发可以立即启动。

## User Review Required

> [!IMPORTANT]
> **数据库连接**：Story 1.1 的 AC#4 要求 `npx prisma migrate dev --name init` 可成功执行。这需要一个可连接的 PostgreSQL 数据库实例（如 Railway、本地 Docker、或 Supabase）。
> 
> 请确认：
> 1. 你是否已有 PostgreSQL 实例？如有，请提供 `DATABASE_URL`
> 2. 如果没有，是否需要我跳过数据库迁移步骤（只生成 schema 文件，不执行 migrate）？

> [!WARNING]
> Story 文件指定 `next-auth@5`（已 stable），API 与 v4 完全不同。实施将严格按照 NextAuth v5 的 App Router 模式编写。

## Proposed Changes

### Next.js 项目初始化

#### [NEW] thoughtmark-web/ 项目根目录

在 `c:\Users\a-pc\Desktop\test_demo\` 下执行：

```bash
npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app --src-dir --use-npm
```

生成标准项目结构：`src/app/`, `tailwind.config.ts`, `tsconfig.json`, `eslint.config.mjs`

---

### 依赖安装

在 `thoughtmark-web/` 下执行：

```bash
# 运行时依赖
npm install @prisma/client next-auth @auth/prisma-adapter @upstash/redis bullmq ioredis

# 开发依赖
npm install -D prisma
```

然后初始化 Prisma：

```bash
npx prisma init --datasource-provider postgresql
```

---

### Prisma Schema 配置

#### [MODIFY] prisma/schema.prisma

按 Dev Notes 精确要求写入 User model，包含 `@@map("users")` 和 `@map("created_at")` 确保 snake_case 命名规范：

```prisma
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

---

### NextAuth.js 基础骨架

#### [NEW] src/app/api/auth/[...nextauth]/route.ts

NextAuth v5 App Router 配置，providers 留空（Story 2.1/2.2 填充）：

```typescript
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [],
  session: { strategy: "jwt" },
})

export const { GET, POST } = handlers
```

#### [NEW] src/types/next-auth.d.ts

NextAuth 类型声明扩展文件。

---

### Prisma 单例客户端

#### [NEW] src/lib/prisma.ts

标准 Prisma 单例模式（防止 Next.js 热重载下创建多个连接）：

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

### Feature 目录结构

#### [NEW] 以下目录（含 .gitkeep 占位文件）

- `src/features/bookmark/`
- `src/features/timeline/`
- `src/features/auth/`
- `src/features/ai-cluster/`
- `src/components/`
- `src/lib/`
- `src/types/`

---

### 环境变量配置

#### [NEW] .env.example

按 Story Dev Notes 精确列出所有必需变量（含中文注释）：

```bash
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

#### [MODIFY] .gitignore

确认 `.env` 和 `.env.local` 在列表中。

---

## Verification Plan

### 自动化验证

以下命令在 `thoughtmark-web/` 目录下执行：

```bash
# 1. TypeScript 类型检查（应输出 0 错误）
npx tsc --noEmit

# 2. ESLint 检查（应输出 0 错误）
npm run lint

# 3. 开发服务器启动（应在 localhost:3000 响应，无运行时错误）
npm run dev
# 然后在浏览器访问 http://localhost:3000 确认页面正常渲染
```

### 结构验证

用 `list_dir` / `find_by_name` 验证以下文件/目录存在：

| 路径 | 类型 |
|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | 文件 |
| `src/app/layout.tsx` | 文件 |
| `src/app/page.tsx` | 文件 |
| `src/features/bookmark/` | 目录 |
| `src/features/timeline/` | 目录 |
| `src/features/auth/` | 目录 |
| `src/features/ai-cluster/` | 目录 |
| `src/components/` | 目录 |
| `src/lib/prisma.ts` | 文件 |
| `src/types/next-auth.d.ts` | 文件 |
| `prisma/schema.prisma` | 文件 |
| `.env.example` | 文件 |

### 手动验证（由用户确认）

> [!NOTE]
> 如果提供了 `DATABASE_URL`，还需验证：
> - `npx prisma migrate dev --name init` 成功执行
> - `prisma/migrations/` 目录下生成迁移文件
