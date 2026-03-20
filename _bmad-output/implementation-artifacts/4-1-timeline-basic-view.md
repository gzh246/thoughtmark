# Story 4.1: 时间轴基础视图

Status: in-progress

## Story

As a 已登录用户,
I want 在 Web App 中看到我的所有书签按时间倒序排列,
So that 我能直观回顾自己的知识收藏历程。

## Acceptance Criteria

1. **Given** 已登录用户访问 Web App
   **When** 页面加载完成
   **Then** 显示时间轴视图，书签按收藏时间倒序排列
   **And** 每个书签展示：标题、URL 域名、收藏时间（相对表示，如"3 天前"）、注解摘要（最多 2 行）
   **And** 支持无限滚动分页（每页 20 条），首屏 < 2 秒加载

## Tasks / Subtasks

- [ ] Task 1: 后端 — GET /api/bookmarks 扩展 from/to 筛选参数
- [ ] Task 2: 前端 — Timeline 页面
  - [ ] `src/app/(main)/timeline/page.tsx`（Server Component 壳）
  - [ ] `src/components/timeline/TimelineList.tsx`（Client: 无限滚动 + fetch）
  - [ ] `src/components/timeline/BookmarkCard.tsx`（卡片 UI）
  - [ ] `src/lib/utils.ts`（相对时间 `timeAgo` 工具函数）
- [ ] Task 3: 首页跳转
  - [ ] `src/app/page.tsx` 替换默认模板，redirect 到 /timeline
- [ ] Task 4: 验证
  - [ ] Web tsc + lint
  - [ ] Git push + CI

## Dev Notes

- 项目使用 Tailwind CSS，非 Vanilla CSS
- Next.js App Router + `(main)` 路由组（区分 auth 和主应用）
- Prisma Bookmark: id, url, title, whySaved, quickTags, userId, createdAt

### References
- Epic: Story 4.1 AC [Source: epics.md#Story-4.1]
- PRD: FR11/FR13 时间轴视图 [Source: prd.md]

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro (Antigravity)

### File List

### Change Log
