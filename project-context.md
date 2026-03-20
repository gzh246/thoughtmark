# Thoughtmark — Project Context

> This file is the project's "constitution" — all BMAD agents MUST follow these conventions.

## Project Overview

**Thoughtmark** is an AI-driven bookmark knowledge management system with two components:
- **thoughtmark-web**: Next.js 16 web application (App Router)
- **thoughtmark-extension**: WXT browser extension (Manifest V3)

Core differentiator: `why_saved` field — turns bookmarks into cognitive traces.

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Web Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Auth | NextAuth (v4) | 4.24.x |
| Session | JWT strategy | - |
| Task Queue | BullMQ | 5.x |
| Cache/Queue Backend | Redis | 7 (Docker) |
| AI Embedding | 通义千问 text-embedding-v3 (via OpenAI SDK) | - |
| Email | Nodemailer (QQ SMTP) | - |
| Extension | WXT | 0.20.x |
| Extension UI | React | 19.x |

## Monorepo Structure

```
test_demo/
├── thoughtmark-web/          ← Next.js App
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── app/              ← App Router pages + API routes
│   │   │   ├── (auth)/       ← Login / Register
│   │   │   ├── (main)/       ← Timeline / Clusters / Settings
│   │   │   ├── (admin)/      ← Admin Dashboard
│   │   │   └── api/          ← REST API endpoints
│   │   ├── components/       ← Shared UI components
│   │   ├── features/         ← Feature-based modules
│   │   ├── lib/              ← Shared utilities (prisma, auth, queue, embedding, email)
│   │   └── types/
│   └── package.json
├── thoughtmark-extension/    ← WXT Extension
│   ├── entrypoints/          ← popup/, background.ts
│   ├── lib/                  ← api.ts, storage.ts, sync.ts
│   └── package.json
├── _bmad-output/             ← BMAD artifacts
└── docs/dev-history/         ← Development logs
```

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Database tables | snake_case plural | `bookmarks`, `users` |
| Database columns | snake_case | `why_saved`, `user_id`, `quick_tags` |
| Prisma fields | camelCase + `@map()` | `whySaved @map("why_saved")` |
| API endpoints | REST plural nouns | `POST /api/bookmarks` |
| TypeScript | camelCase | `whySaved`, `quickTags` |
| Components | PascalCase | `App.tsx` |
| CSS classes | kebab-case | `.tag-selected`, `.char-warning` |

## API Response Format

```typescript
// Success
{ data: { ... }, meta?: { page: number, total: number } }

// Error
{ error: { code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "INTERNAL_ERROR" | "PLAN_LIMIT" | "DUPLICATE", message: string } }
```

## API Endpoints

| Method | Path | Epic | Description |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | 2 | NextAuth handler |
| POST | `/api/bookmarks` | 3 | 创建书签（+500上限+聚类触发） |
| GET | `/api/bookmarks` | 4 | 列表（分页+时间筛选） |
| PUT/DELETE | `/api/bookmarks/[id]` | 4 | 编辑/删除书签 |
| GET | `/api/clusters` | 5 | 聚类列表 |
| PUT/DELETE | `/api/clusters/[id]` | 5 | 重命名/删除主题 |
| POST | `/api/clusters/merge` | 5 | 合并主题 |
| GET/PUT | `/api/notifications` | 5 | 通知管理 |
| POST | `/api/cron/daily` | 5 | 重激活+记忆推送 |
| GET/POST/DELETE | `/api/subscription` | 6 | 订阅管理（Mock） |
| GET | `/api/admin/stats` | 6 | 运营指标 |
| POST | `/api/admin/email` | 6 | 批量运营邮件 |
| GET/PUT | `/api/user/profile` | 2 | 用户信息 |
| PUT | `/api/user/password` | 2 | 密码修改 |
| GET | `/api/user/export` | 2 | 数据导出 |
| DELETE | `/api/user/delete` | 2 | 账户删除 |

## Authentication Pattern

- **Web App**: NextAuth v4, `CredentialsProvider` + `GoogleProvider`, JWT session strategy
- **Middleware**: `getToken()` from `next-auth/jwt` (NOT `auth()` — incompatible with Next.js 16)
- **API Auth**: `getToken({ req, secret })` → extract `token.id` as userId
- **Admin Auth**: `user.isAdmin === true` 字段检查
- **Extension**: Token paste from Web App → stored in `browser.storage.local` → `Authorization: Bearer <token>` header

## Key Design Decisions

1. **NextAuth v4** (not v5) — `create-next-app@latest` installs v4, v5 API incompatible
2. **JWT session** — enables stateless auth sharing between web and extension
3. **Token paste auth** for extension MVP — simpler than `chrome.identity` OAuth
4. **Feature-based directory** structure in `src/features/`
5. **Offline-first** extension: Chrome Storage queue (100 items, 7-day TTL)
6. **Field mapping**: `annotation → whySaved`, `tags → quickTags` in sync layer
7. **通义千问** (not OpenAI) — 国内可用 + 支付宝付款，API 通过 OpenAI SDK 兼容模式调用
8. **BullMQ + Docker Redis** — 开发用本地 Docker，生产用 Upstash
9. **Nodemailer + QQ SMTP** — 开发免费，生产可切 Resend
10. **Mock Stripe** — MVP 阶段管理员手动切换 Pro，预留 Stripe 接口

## Validation Rules

- `whySaved`: max 140 characters (backend + frontend)
- `quickTags`: whitelist `["学习资料", "工作参考", "灵感收藏"]` (PRD FR9)
- Password: min 8 characters, bcrypt hash cost factor 12
- Free tier: max 500 bookmarks (Story 6.1)
- AI clustering trigger: ≥20 annotated bookmarks (Story 5.1)

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL (Docker) |
| `NEXTAUTH_SECRET` | JWT signing |
| `NEXTAUTH_URL` | App base URL |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `REDIS_URL` | BullMQ queue backend |
| `DASHSCOPE_API_KEY` | 通义千问 Embedding |
| `SMTP_HOST/PORT/USER/PASS/FROM` | QQ 邮箱 SMTP |

## Git Conventions

- Branch: `master`
- Commit format: `feat(scope): Story X.Y - description`
- CI: GitHub Actions (2 parallel jobs: Web tsc+lint, Extension tsc)

