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
| Extension | WXT | 0.20.x |
| Extension UI | React | 19.x |

## Monorepo Structure

```
test_demo/
├── thoughtmark-web/          ← Next.js App
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── app/              ← App Router pages + API routes
│   │   ├── features/         ← Feature-based modules
│   │   ├── lib/              ← Shared utilities (prisma.ts, auth.ts)
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
{ error: { code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "INTERNAL_ERROR", message: string } }
```

## Authentication Pattern

- **Web App**: NextAuth v4, `CredentialsProvider`, JWT session strategy
- **Middleware**: `getToken()` from `next-auth/jwt` (NOT `auth()` — incompatible with Next.js 16)
- **API Auth**: `getToken({ req, secret })` → extract `token.id` as userId
- **Extension**: Token paste from Web App → stored in `browser.storage.local` → `Authorization: Bearer <token>` header

## Key Design Decisions

1. **NextAuth v4** (not v5) — `create-next-app@latest` installs v4, v5 API incompatible
2. **JWT session** — enables stateless auth sharing between web and extension
3. **Token paste auth** for extension MVP — simpler than `chrome.identity` OAuth
4. **Feature-based directory** structure in `src/features/`
5. **Offline-first** extension: Chrome Storage queue (100 items, 7-day TTL)
6. **Field mapping**: `annotation → whySaved`, `tags → quickTags` in sync layer

## Validation Rules

- `whySaved`: max 140 characters (backend + frontend)
- `quickTags`: whitelist `["学习资料", "工作参考", "灵感收藏"]` (PRD FR9)
- Password: min 8 characters, bcrypt hash cost factor 12

## Git Conventions

- Branch: `master`
- Commit format: `feat(scope): Story X.Y - description`
- CI: GitHub Actions (2 parallel jobs: Web tsc+lint, Extension tsc)
