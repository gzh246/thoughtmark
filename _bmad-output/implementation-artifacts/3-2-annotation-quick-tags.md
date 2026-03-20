# Story 3.2: 注解填写与快选标签

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 已登录用户,
I want 在收藏时添加注解说明和分类标签,
So that 未来能快速回忆"为什么收藏这个页面"。

## Acceptance Criteria

1. **Given** 插件弹窗已打开
   **When** 用户在注解框中输入文字
   **Then** 注解限制 140 字，超出时提示并阻止提交

2. **Given** 插件弹窗已打开
   **When** 用户点击"学习资料"/"工作参考"/"灵感收藏"快选标签中的一个
   **Then** 标签高亮选中（可多选），提交时随书签一起保存

## Tasks / Subtasks

- [x] Task 1: 后端注解长度校验（AC: #1）
  - [x] 在 `POST /api/bookmarks` 添加 `whySaved` 字段长度校验（max 140 字符）
  - [x] 超出 140 字符时返回 `{ error: { code: "VALIDATION_ERROR", message: "注解不能超过 140 字" } }` (400)
  - [x] 添加 `quickTags` 数组校验：只允许 `["学习资料", "工作参考", "灵感收藏"]` 中的值
  - [x] 不合法的 tag 值返回 `{ error: { code: "VALIDATION_ERROR", message: "无效的标签" } }` (400)

- [x] Task 2: 前端注解限制增强（AC: #1）
  - [x] 已有 140 字前端限制（App.tsx L158），需增加视觉反馈：接近上限（120+ 字）时字数颜色变为警告色
  - [x] 达到 140 字时字数颜色变红 + 禁止继续输入

- [x] Task 3: 快选标签 UI 增强（AC: #2）
  - [x] 已有基础多选逻辑（App.tsx L49-55），需增强视觉反馈：
  - [x] 选中状态增加动画过渡（CSS transition）
  - [x] 选中时标签带 ✓ 图标前缀
  - [x] 确保 App.css 中 `.tag-selected` 样式清晰区分已选/未选

- [x] Task 4: 端到端验证（AC: #1, #2）
  - [x] Web `tsc --noEmit` 0 错误
  - [x] Web `npm run lint` 0 错误
  - [x] Extension `tsc --noEmit` 0 错误
  - [x] Git push

## Dev Notes

### 架构硬性约束

1. **API 响应格式**：`{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` — 沿用 architecture.md 统一格式
2. **快选标签白名单**：`["学习资料", "工作参考", "灵感收藏"]` — 来自 PRD FR9
3. **注解字段名**：`whySaved`（代码端 camelCase）→ `why_saved`（数据库 snake_case），Prisma `@map` 已处理

### 现有代码分析

**后端**（`thoughtmark-web/src/app/api/bookmarks/route.ts`）：
- 当前 POST 端只校验了 `url` 和 `title` 非空（L30-35）
- `whySaved` 和 `quickTags` 直接写入数据库，无长度/白名单校验
- ⚠️ **安全隐患**：恶意用户可提交超长注解或非法标签

**前端**（`thoughtmark-extension/entrypoints/popup/App.tsx`）：
- L158: `e.target.value.length <= MAX_WHY_SAVED_LENGTH` — 已有前端字符限制
- L151-153: 字数计数器已显示 `{whySaved.length}/140`
- L49-55: `toggleTag` 多选逻辑已实现
- L172-178: 快选标签按钮渲染已实现，`.tag-selected` 类名切换正常

**样式**（`thoughtmark-extension/entrypoints/popup/App.css`）：
- 需检查 `.tag-selected` 样式是否足够清晰
- 需增加 `.char-warning` 和 `.char-limit` 警告色

### 改动范围评估

**改动量：小**。主要是校验逻辑 + CSS 增强，不涉及新模型或新文件。

| 文件 | 改动类型 | 预估行数 |
|---|---|---|
| `bookmarks/route.ts` | MODIFY | +15（校验逻辑） |
| `popup/App.tsx` | MODIFY | +10（字数颜色逻辑） |
| `popup/App.css` | MODIFY | +10（标签动画 + 警告色） |

### Previous Story Intelligence

- Story 3.1 中 `POST /api/bookmarks` 已建立，认证用 `getToken()` — 不需要改动认证逻辑
- Extension `lib/api.ts` 的 `apiPost` 已封装好 — 不需要改动网络层
- App.tsx 的 Component 结构稳定 — 只需在现有组件内增强

### Git Intelligence

```
c6d946c feat(bookmark): Story 3.1 - 书签数据模型 + CRUD API + 插件弹窗
d7ae3dd feat(auth): Story 2.1 - Email 注册与登录
df43e70 ci: 添加 GitHub Actions CI (tsc + lint)
b5b5f6f feat: 初始化 Thoughtmark Monorepo (Story 1.1 + 1.2)
```

### References

- PRD: FR8 注解填写 [Source: prd.md#Bookmark-Capture]
- PRD: FR9 快选标签 [Source: prd.md#Bookmark-Capture]
- Architecture: API 错误格式 `{ error: { code, message } }` [Source: architecture.md#Format-Patterns]
- Epic: Story 3.2 AC [Source: epics.md#Story-3.2]
- Story 3.1: 现有代码基础 [Source: 3-1-plugin-popup-bookmark.md]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

### Completion Notes List

### File List

### Change Log
