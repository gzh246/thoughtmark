# Story 2.1: Email 注册与登录

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 访客用户,
I want 通过 Email 和密码注册并登录 Thoughtmark,
So that 我可以安全地访问我的个人书签库。

## Acceptance Criteria

1. **Given** 用户访问注册页面
   **When** 输入有效 Email + 密码（最少 8 位）并提交
   **Then** 系统创建账户（密码 bcrypt hash，cost factor 12）
   **And** 自动登录并跳转到时间轴页面
   **And** 若 Email 已注册，显示 "该邮箱已被使用" 提示

2. **Given** 已注册用户访问登录页
   **When** 输入正确的 Email + 密码
   **Then** 登录成功，创建 NextAuth session
   **And** 错误密码时显示 "邮箱或密码错误"（不透露具体哪个错误）

## Tasks / Subtasks

- [x] Task 1：安装密码加密依赖（AC: #1）
  - [x] `npm install bcryptjs`（纯 JS 实现，Windows 兼容好）
  - [x] `npm install -D @types/bcryptjs`

- [x] Task 2：扩展 Prisma Schema（AC: #1）
  - [x] User model 添加 `passwordHash String? @map("password_hash")`（nullable: OAuth 用户无密码）
  - [x] 运行 `npx prisma migrate dev --name add-password-hash`
  - [x] 确认迁移成功

- [x] Task 3：实现注册 API（AC: #1）
  - [x] 创建 `src/app/api/auth/register/route.ts`
  - [x] `POST /api/auth/register` 接收 `{ email, password, name? }`
  - [x] 校验：email 格式正则、password.length >= 8
  - [x] 查重：Email 已注册 → 返回 409 + "该邮箱已被使用"
  - [x] 创建：`bcrypt.hash(password, 12)` → `prisma.user.create()`
  - [x] 返回 201 + `{ id, email }`

- [x] Task 4：填充 CredentialsProvider（AC: #2）
  - [x] 修改 `src/lib/auth.ts`：重写为 NextAuth v4 authOptions
  - [x] `authorize` 函数：查询用户 → `bcrypt.compare()` → 返回 user 或 null
  - [x] 配置 `pages: { signIn: "/login" }` 自定义路由
  - [x] 配置 JWT `callbacks.jwt` 和 `callbacks.session` 携带 user.id

- [x] Task 5：创建登录 UI 页面（AC: #2）
  - [x] 创建 `src/app/(auth)/layout.tsx`：认证页面居中布局
  - [x] 创建 `src/app/(auth)/login/page.tsx`：Email + 密码表单
  - [x] 调用 `signIn("credentials", { email, password })` 完成登录
  - [x] 错误处理：显示 "邮箱或密码错误"
  - [x] 成功后重定向到 `/`

- [x] Task 6：创建注册 UI 页面（AC: #1）
  - [x] 创建 `src/app/(auth)/register/page.tsx`：Email + 密码 + 确认密码表单
  - [x] 前端校验：密码长度 ≥ 8、两次密码一致
  - [x] 调用 `POST /api/auth/register` → 成功后自动 `signIn`
  - [x] 错误处理：显示 "该邮箱已被使用"

- [x] Task 7：路由保护中间件
  - [x] 创建 `src/middleware.ts`：使用 getToken() 兼容 Next.js 16
  - [x] 保护路径：`/`（时间轴），排除：`/login`、`/register`、`/api/auth`

- [x] Task 8：验证（AC: #1, #2）
  - [x] `npx tsc --noEmit` 确认 0 错误
  - [x] `npm run lint` 确认 0 错误
  - [x] 浏览器测试：注册 → 自动登录 → 跳转首页
  - [x] 中间件测试：已登录访问 /login → 重定向回 /

## Dev Notes

### 架构硬性约束（继承自 Story 1.1）

1. **API 风格**：REST（非 tRPC）— 插件端调用更简单直接
2. **数据库命名**：表名 `snake_case` 复数，字段名 `snake_case`（`password_hash`）
3. **Prisma 是唯一真相**：所有 schema 变更必须通过 `prisma migrate`，禁止手动改数据库
4. **测试位置**：与源文件同目录，命名 `*.test.ts`（Co-located）

### 密码安全要求（来自 PRD NFR）

- **bcrypt cost factor ≥ 12**（PRD 明确要求）[Source: prd.md#Security]
- 密码最少 8 位（AC 明确要求）
- 登录失败时不透露具体是邮箱还是密码错误
- `passwordHash` 设为 nullable：未来 Story 2.2 Google OAuth 用户没有密码

### 为什么选 bcryptjs 而非 bcrypt？

| 方案 | 优点 | 缺点 |
|---|---|---|
| `bcrypt`（原生 C++ binding）| 性能稍好 | Windows 编译依赖 node-gyp，易出错 |
| `bcryptjs`（纯 JS）| **零原生依赖**，跨平台无编译 | 性能略低（但对认证场景完全够用）|

**决定**：使用 `bcryptjs`。MVP 阶段用户量 < 5000，纯 JS 性能完全够用。

### NextAuth CredentialsProvider 精确实现

```typescript
// src/lib/auth.ts — 增量修改
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

providers: [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      })

      if (!user || !user.passwordHash) return null

      const isValid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      )

      if (!isValid) return null

      return { id: user.id, email: user.email, name: user.name }
    },
  }),
],
pages: {
  signIn: "/login",
},
callbacks: {
  async jwt({ token, user }) {
    if (user) token.id = user.id
    return token
  },
  async session({ session, token }) {
    if (session.user) session.user.id = token.id as string
    return session
  },
},
```

### 注册 API 精确实现

```typescript
// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  // 校验
  if (!email || !password) {
    return NextResponse.json({ message: "邮箱和密码不能为空" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "密码至少 8 位" }, { status: 400 })
  }

  // 查重
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ message: "该邮箱已被使用" }, { status: 409 })
  }

  // 创建
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
```

### UI 页面路由结构

```
src/app/
├── (auth)/                    ← Route Group（不影响 URL）
│   ├── layout.tsx             ← 居中卡片布局
│   ├── login/page.tsx         ← /login
│   └── register/page.tsx      ← /register
├── layout.tsx                 ← 根 layout
└── page.tsx                   ← / （时间轴首页，需登录）
```

- `(auth)` Route Group 共享居中居中卡片布局，不影响 URL 路径
- `/login` 和 `/register` 页面不需要认证即可访问

### 中间件保护逻辑

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/register")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuth) return  // NextAuth API 不拦截
  if (isAuthPage) {
    if (isLoggedIn) return Response.redirect(new URL("/", req.nextUrl))
    return  // 未登录可访问登录/注册页
  }
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

### Previous Story Intelligence（来自 Story 1.1）

- **Prisma 单例**已在 `src/lib/prisma.ts` 建立，Story 2.1 直接 import 使用
- **NextAuth 配置**独立放在 `src/lib/auth.ts`（非 route 文件内），middleware 可直接 import
- **类型声明** `src/types/next-auth.d.ts` 已扩展 `session.user.id`
- **Windows 环境注意**：`DATABASE_URL` 使用 `127.0.0.1`（非 `localhost`），避免 IPv6 问题
- **Docker PostgreSQL** 需要运行中：`docker start thoughtmark-postgres`

### References

- PRD: FR1 Email 注册、安全 NFR bcrypt cost ≥ 12 [Source: prd.md#Functional-Requirements, prd.md#Security]
- Architecture: 认证方案 NextAuth.js + PrismaAdapter + JWT [Source: architecture.md#Authentication-Security]
- Architecture: 目录结构 Feature-based [Source: architecture.md#Project-Structure]
- Epic: Story 2.1 完整 AC [Source: epics.md#Story-2.1]
- Story 1.1: NextAuth 基础骨架 [Source: 1-1-initialize-thoughtmark-web.md]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- NextAuth v4 vs v5 API 不匹配：`next-auth@4.24.13` 安装的是 v4，但代码写的是 v5 API（`handlers` 导出）→ 重写为 v4 authOptions 风格
- `[...nextauth]/route.ts` 导出方式错误：`handlers as GET` 应为 `const { GET, POST } = handlers`（v5），最终改为 `handler as GET`（v4）
- Next.js 16 deprecated `middleware` file convention，`auth()` wrapper 导致 `Cannot read properties of undefined (reading 'custom')` → 改用 `getToken()` + 标准 middleware 导出

### Completion Notes List

- 2026-03-20: 全部 2 个 AC 通过。NextAuth v4.24.13 + bcryptjs。
- 注册成功自动登录 → 跳转首页 ✅
- 已登录访问 /login → 中间件重定向回 / ✅
- 注册 API 返回 201 Created ✅
- UI：深色主题，渐变紫色按钮

### File List

- `prisma/schema.prisma` — User model 新增 passwordHash
- `prisma/migrations/xxx_add_password_hash/` — 数据库迁移
- `src/lib/auth.ts` — NextAuth v4 authOptions（CredentialsProvider + JWT callbacks）
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth v4 route handler
- `src/app/api/auth/register/route.ts` — 注册 API
- `src/app/(auth)/layout.tsx` — 认证页面布局
- `src/app/(auth)/login/page.tsx` — 登录页面
- `src/app/(auth)/register/page.tsx` — 注册页面
- `src/middleware.ts` — 路由保护中间件
