# Story 3.1: 插件弹窗 UI 与一键收藏基础

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 已登录用户,
I want 点击插件图标后弹出收藏表单，一键保存当前页面,
So that 我可以在不离开当前页的情况下完成收藏。

## Acceptance Criteria

1. **Given** 已安装并登录 Thoughtmark 插件的用户在任意网页
   **When** 点击浏览器工具栏中的 Thoughtmark 图标
   **Then** 弹窗打开，2 个字段预填充：网页标题 + URL（来自当前 Tab）
   **And** 弹窗包含注解文本框、快选标签按钮、"保存"和"跳过"按钮
   **And** 点击"保存"后 API 调用成功，弹窗关闭，操作 < 1 秒完成

2. **Given** 用户点击"跳过"
   **When** 跳过注解直接保存（FR10）
   **Then** 书签以空注解保存，弹窗关闭

## Tasks / Subtasks

- [ ] Task 1：创建 Bookmark Prisma Model（数据模型）
  - [ ] 在 `schema.prisma` 添加 `Bookmark` model（id, url, title, whySaved, quickTags, userId, createdAt）
  - [ ] 添加 User → Bookmark 一对多关系
  - [ ] 运行 `npx prisma migrate dev --name add-bookmark`
  - [ ] 确认迁移成功

- [ ] Task 2：创建书签 CRUD API（Web App 端）
  - [ ] `POST /api/bookmarks` 创建书签（接收 url, title, whySaved?, quickTags?）
  - [ ] `GET /api/bookmarks` 获取当前用户书签列表（分页）
  - [ ] 所有 API 需要认证（getToken 验证）
  - [ ] API 响应格式统一 `{ data, error, meta }`

- [ ] Task 3：插件端认证集成
  - [ ] 从 Web App 获取 JWT token 并存入 Chrome Storage
  - [ ] `lib/api.ts` 附加 Authorization header
  - [ ] 实现简单的登录状态检查

- [ ] Task 4：插件弹窗 UI（Popup）
  - [ ] 重写 `entrypoints/popup/App.tsx` 为收藏表单
  - [ ] 自动填充当前 Tab 的 URL + 标题
  - [ ] 注解文本框（可选，140 字限制）
  - [ ] 快选标签按钮（学习资料/工作参考/灵感收藏，可多选）
  - [ ] "保存" 和 "跳过" 按钮
  - [ ] 保存成功后弹窗关闭

- [ ] Task 5：验证
  - [ ] `npx tsc --noEmit` + `npm run lint` (Web)
  - [ ] `npx tsc --noEmit` (Extension)
  - [ ] 浏览器测试：安装插件 → 收藏页面 → 检查数据库

## Dev Notes

### 架构硬性约束

1. **数据库命名**：表名 `bookmarks`（snake_case 复数），字段名 `snake_case`（`why_saved`, `user_id`, `quick_tags`）
2. **API 端点**：`POST /api/bookmarks`、`GET /api/bookmarks`（REST 复数名词 + HTTP Method）
3. **API 响应格式**：`{ "data": { ... }, "meta": { "page": 1, "total": 100 } }` 或 `{ "error": { "code": "...", "message": "..." } }`
4. **认证**：API 层用 `getToken({ req })` 获取 JWT 验证身份

### Bookmark Prisma Model

```prisma
model Bookmark {
  id        String   @id @default(cuid())
  url       String
  title     String
  whySaved  String?  @map("why_saved")       // 核心字段：为什么收藏
  quickTags String[] @map("quick_tags")       // 快选标签（学习资料/工作参考/灵感收藏）
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])    // 时间轴查询优化
  @@map("bookmarks")
}
```

需要同步更新 User model 添加 `bookmarks Bookmark[]` 关系字段。

### 创建书签 API

```typescript
// POST /api/bookmarks
// Headers: Authorization: Bearer <jwt>
// Body: { url: string, title: string, whySaved?: string, quickTags?: string[] }
// Response: { data: { id, url, title, whySaved, quickTags, createdAt } }
```

认证：使用 `getToken({ req, secret })` 从 JWT 中提取 `token.id` 作为 userId。

### 插件端认证方案（MVP 简化版）

MVP 阶段使用**Web App 登录 → 手动复制 Token → 插件存储**的方式（最简单，Story 2.2 时升级为 OAuth 自动流程）：

1. 用户在 Web App 登录后，设置页面提供"复制 API Token"按钮
2. 用户在插件 Popup 中粘贴 Token
3. Token 存入 `chrome.storage.local`
4. `lib/api.ts` 每次请求附加 `Authorization: Bearer <token>`

> **简化理由**：插件端 OAuth 流程涉及 `chrome.identity` API + 回调 URL 注册，复杂度较高。MVP 先用 Token 方式验证核心收藏功能。

### 弹窗获取当前 Tab 信息

```typescript
// WXT 的 browser API（跨浏览器兼容）
const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
const url = tab.url
const title = tab.title
```

需要 `tabs` 权限（已在 Story 1.2 配置）。

### Previous Story Intelligence

- **NextAuth v4**（非 v5）：API 端认证用 `getToken()` 从请求中提取 JWT
- **Prisma 单例** `src/lib/prisma.ts` 已建立，直接 import
- **Extension `lib/api.ts`** 已有 `apiFetch`/`apiGet`/`apiPost` 骨架
- **VITE_API_BASE_URL** 环境变量已在 Extension `.env` 配置

### References

- PRD: FR7-FR10 书签收藏功能 [Source: prd.md#Bookmark-Capture]
- Architecture: 命名规范（bookmarks 表, snake_case）[Source: architecture.md#Naming-Patterns]
- Architecture: API 响应格式 { data, error, meta } [Source: architecture.md#Format-Patterns]
- Architecture: FR7-12 目录映射 [Source: architecture.md#FR-Mapping]
- Epic: Story 3.1 AC [Source: epics.md#Story-3.1]
- Story 2.1: NextAuth v4 认证 [Source: 2-1-email-registration-login.md]
- Story 1.2: Extension lib/api.ts [Source: 1-2-initialize-thoughtmark-extension.md]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

### Completion Notes List

### File List
