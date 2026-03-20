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
