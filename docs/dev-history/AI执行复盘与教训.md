# AI 执行复盘与教训

> **目的**：记录 AI 辅助开发中的失误和教训，避免重蹈覆辙。
> **规则**：每次开始 implementation_plan 前**必读**此文件。

---

## 教训 1: Prisma 版本不匹配（2026-03-20）

**场景**: Story 1.1 初始化项目
**失误**: `@prisma/client@latest`(v7) 与 `prisma@5` 版本不兼容，`prisma generate` 报错。
**教训**: 安装 Prisma 时**始终锁定同一大版本号**，不用 `@latest`。

---

## 教训 2: 通义千问 Embedding Batch Size 超限（2026-03-20）

**场景**: AI 聚类测试
**失误**: 代码中 `batchSize = 25`，但通义千问 text-embedding-v3 API 实际限制为 10。
**教训**: 调用第三方 API 时，**不要假设批量限制**，先查官方文档或用小批量测试。

---

## 教训 3: Story 拆分粒度不够——通知铃铛 UI 遗漏（2026-03-20）

**场景**: Sprint Status 标记 `5-4-reactivation-reminder: done`

**失误详情**:
- 后端 `/api/notifications`（GET 未读 / PUT 标已读）✅ 已实现
- 前端 Header 中没有任何通知 UI ❌ 完全遗漏
- epics.md 和 PRD 中搜索"通知"/"notification" → **0 条结果**

**根因**: Story 只写了"实现提醒机制"，没有拆分为：
- 5-4a: 后端通知 API（创建/查询/标已读）
- 5-4b: **前端通知 UI（铃铛图标/红色 badge/下拉面板）**

**教训**:
1. 一个 Story 如果涉及**前后端两端**，AC 中必须**分别列出前端和后端的验收条件**
2. 前端 AC 要具体到 UI 元素："Header 中显示 🔔 图标，未读数红色 badge"
3. 不能只写"实现通知功能"这种模糊描述

---

## 教训 4: 测试脚本导致 CI/CD 失败（2026-03-20）

**场景**: E2E 测试脚本 `scripts/test-*.ts` 使用了 Prisma 类型中不存在的字段（`isAdmin`、`plan`、`notification`）

**失误**: 测试脚本通过 `tsx` 直接运行可以工作（Prisma 在运行时不做字段验证），但 `npx tsc --noEmit` 会检查这些类型错误，导致 CI 失败。

**根因**: `tsconfig.json` 的 `include: ["**/*.ts"]` 包含了 `scripts/` 目录。

**修复**: 在 `tsconfig.json` 的 `exclude` 中加入 `"scripts"`。

**教训**:
1. 测试脚本不应影响主源码的 TSC 编译
2. 每次添加新目录时，检查 tsconfig 的 include/exclude 范围
3. **CI 是最终验证关卡**——不要只在本地跑 lint，也要确保 CI 通过

---

## 教训 5: API 中间件拦截 Extension 跨域请求（2026-03-21）

**场景**: Chrome Extension 通过 `Authorization: Bearer` 调用 Web API

**失误**: Extension 的 `fetch()` 全部进入 catch → 离线队列。看起来像网络错误，但实际是**两个问题叠加**：
1. **无 CORS headers** — Extension 从 `chrome-extension://` 域发请求，被浏览器 Same-Origin Policy 拦截
2. **Middleware 误拦截** — `middleware.ts` 对所有路由（含 `/api/*`）检查 cookie，Extension 没有 cookie 被 redirect 到 `/login`

**修复**: middleware 对 `/api/*` 路由跳过 redirect，让各 API route 自行验证 JWT；对 OPTIONS 预检返回 204 + CORS headers。

**教训**:
1. Extension 与 Web API 通信时，**CORS 是必须考虑的第一要素**
2. 中间件不应对 API 路由做 redirect，应返回 401 让客户端处理
3. Extension 的离线队列行为会**掩盖真正的认证错误**——需从 Network / Console 定位

---

## 教训 6: WXT 框架默认样式导致 Popup UI 溢出（2026-03-21）

**场景**: Extension Popup 内容在左侧被裁剪——标题、URL、标签都从左边"消失"了一块

**失误**: 只查 `App.css` 没有检查 WXT 自动生成的 `style.css`。

**根因**: `entrypoints/popup/style.css`（WXT 模板默认样式）包含：
```css
body { display: flex; place-items: center; min-height: 100vh; }
```
当 popup 内容宽度超过窗口时，`place-items: center` 让内容**左右对称溢出**。

**教训**:
1. 使用脚手架/框架时，**必须审查自动生成的样式文件**，不能只看自己写的
2. UI 布局问题要从 `html → body → container` **逐层排查**，不能只盯一个 CSS 文件
3. `display: flex + place-items: center` 在窄容器中是**溢出高风险组合**

---

## 教训 7: CI 验证范围不完整——只跑 TSC 不跑 ESLint（2026-03-21）

**场景**: CI 反复失败，每次修完一个又冒出新的

**失误**: 本地只跑 `npx tsc --noEmit`（通过），但 CI 还要跑 `npm run lint`（ESLint），而 ESLint 有额外的规则（`no-unused-expressions`、`react-hooks/exhaustive-deps`）。导致推了 3 次才全部修完。

**教训**:
1. **本地验证必须与 CI 完全一致** — 跑 `tsc --noEmit` + `npm run lint` 两个命令
2. 推送前的检查清单：TSC ✅ + ESLint ✅，缺一不可
3. 可以写一个 `npm run ci:check` 脚本把两个命令串起来，避免遗忘

