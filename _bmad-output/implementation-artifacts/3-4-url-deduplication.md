# Story 3.4: URL 去重

Status: done

## Story

As a 用户,
I want 系统自动阻止我在 24 小时内重复收藏同一 URL,
So that 我的书签库不会产生冗余数据。

## Acceptance Criteria

1. **Given** 用户尝试收藏一个 24 小时内已收藏的 URL
   **When** 提交收藏表单
   **Then** 弹窗提示"你在 [X 小时] 前已收藏过这个页面"
   **And** 提供"查看原书签"和"覆盖更新"两个选项

## Tasks / Subtasks

- [x] Task 1: 后端 24h URL 去重检测
  - [x] 在 `POST /api/bookmarks` 创建前查询同 userId + url + 24h 内的记录
  - [x] 如果存在，返回 `409 DUPLICATE` + 已有书签的 id 和 createdAt
  - [x] 新增 `PUT /api/bookmarks/[id]` 覆盖更新 endpoint

- [x] Task 2: 前端冲突 UI
  - [x] 收到 409 后显示冲突提示（几小时前已收藏）
  - [x] "覆盖更新"按钮调用 PUT 端点
  - [x] "取消"按钮关闭弹窗
  - [x] 添加 `.conflict-message` CSS 样式

- [x] Task 3: 验证
  - [x] Web `tsc --noEmit` + `npm run lint`
  - [x] Extension `tsc --noEmit`
  - [x] Git push + CI 绿色

## Dev Notes

### 架构约束
- API 错误格式：`{ error: { code: "DUPLICATE", message: "..." }, data: { existingBookmark } }`
- PUT 端点路径：`/api/bookmarks/[id]/route.ts`（Next.js 动态路由）
- 24h = `new Date(Date.now() - 24*60*60*1000)`

### 现有代码分析
- `POST /api/bookmarks`：L59-68 创建逻辑，在此之前插入去重查询
- `App.tsx`：`handleSave` L63-85，在 `res.ok` 和 `catch` 分支之间添加 409 处理
- Prisma schema 中 `Bookmark` 有 `url`、`userId`、`createdAt` 字段

### References
- Epic: Story 3.4 AC [Source: epics.md#Story-3.4]
- PRD: FR10 URL 去重 [Source: prd.md#Bookmark-Capture]

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro (Antigravity)

### File List

| 文件 | 操作 | 说明 |
|---|---|---|
| `thoughtmark-web/src/app/api/bookmarks/route.ts` | 修改 | 添加 24h URL 去重检测（409 DUPLICATE） |
| `thoughtmark-web/src/app/api/bookmarks/[id]/route.ts` | 新建 | PUT 覆盖更新端点 |
| `thoughtmark-extension/lib/api.ts` | 修改 | 添加 `apiPut` 快捷方法 |
| `thoughtmark-extension/entrypoints/popup/App.tsx` | 修改 | 409 处理 + 冲突选择 UI + 覆盖更新 handler |
| `thoughtmark-extension/entrypoints/popup/App.css` | 修改 | `.conflict-message` 样式 |

### Change Log

- 2026-03-20: Story 3.4 完成实现（commit c635683）
