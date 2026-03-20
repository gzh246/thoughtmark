# BMAD 驱动开发流程规范

> 基于 Thoughtmark MVP 开发实战经验总结，适用于 AI 辅助开发场景。
> 配套工作流：`.agents/workflows/bmad-dev-flow.md`（输入 `/bmad-dev-flow` 触发）

## 核心理念

**BMAD = Build Measure Adjust Deliver**

- 所有开发活动以 **BMAD 产出物** 为中心管理
- 文档是**一等公民**，与代码同等重要
- **边做边记**，而非完成后补写
- **每次新会话，先恢复上下文**，再动手

---

## 目录结构约定

```
project/
├── _bmad/bmm/                    ← BMAD 框架核心（不可修改）
│   ├── agents/                   ← 角色定义
│   ├── workflows/                ← 内置工作流（SKILL.md + workflow.md）
│   └── config.yaml               ← 项目配置
├── _bmad-output/                 ← BMAD 产出物（本项目生成）
│   ├── planning-artifacts/       ← 规划阶段产出
│   │   ├── prd.md                ← 产品需求文档
│   │   ├── architecture.md       ← 系统架构
│   │   ├── epics.md              ← Epic 路线图 + 详细 Stories
│   │   └── ux-design-*.md/html   ← UX 设计文档
│   └── implementation-artifacts/ ← 实现阶段产出
│       ├── sprint-status.yaml    ← Sprint 状态追踪（唯一真相源）
│       └── {epic}-{story}-*.md   ← Story 实现详情
├── project-context.md            ← 项目宪法（技术栈/约定/API）
└── docs/dev-history/             ← 开发历史归档
    ├── 开发执行日志.md            ← 全景纪实入口
    ├── AI执行复盘与教训.md         ← 教训库
    └── MVP_Retrospective.md      ← 回顾文档
```

---

## 开发生命周期

### 全局流程（Epic 级 → Story 循环）

```mermaid
graph TD
    A[📋 Step 0: 上下文恢复] --> B[📋 Step 1: 开 Epic]
    B --> C[📝 Step 2: 创建 Story 文件]
    C --> D[🔨 Step 3: 实现代码]
    D --> E[✅ Step 4: 验证 TSC+LINT+Migrate]
    E --> F[📖 Step 5: 更新日志+宪法]
    F --> H[💾 Step 6: Git Commit]
    H -->|下一个 Story| C
    H -->|Epic 全部完成| G[🔁 Step 7: Retrospective]
    G -->|下一个 Epic| B
```

> **注意**：Step 2-6 是 **Story 循环**，每个 Story 都走一遍；Step 7 是 **Epic 级**，只在 Epic 全部完成后执行。

### Step 0: 上下文恢复（⚠️ 每次新会话强制）

**触发**: 每次开始新的 AI 会话 / 跨天继续开发
**强制动作**:
1. 阅读 `sprint-status.yaml` — 确认当前进度（哪些 done，哪些 in-progress）
2. 阅读 `project-context.md` — 恢复技术栈/命名约定/API 认知
3. 阅读 `docs/dev-history/开发执行日志.md` 最后一个章节 — 回忆上次停在哪里
4. 阅读 `docs/dev-history/AI执行复盘与教训.md`（如存在）— 避免重蹈覆辙

**反面教训**: 跨会话时 AI 上下文丢失是最大风险。不执行 Step 0 会导致命名风格不一致、重复引入已有功能、遗漏已知 Bug。

---

### Step 1: 开 Epic — 阅读 AC

**触发**: 开始新 Epic 时
**强制动作**:
1. 阅读 `_bmad-output/planning-artifacts/epics.md` 中对应 Epic 的所有 Story + Acceptance Criteria
2. 更新 `sprint-status.yaml`: `epic-X: in-progress`

### Step 2: 创建 Story 文件 ⚠️ 强制

**触发**: 每个 Story 开始前
**强制动作**:
1. 在 `_bmad-output/implementation-artifacts/` 下创建 `{epic}-{story}-*.md`
2. 同时更新 `sprint-status.yaml`: `X-Y-story-name: in-progress`

**Story 文件模板**:

```markdown
# Story X.Y: {Story 标题}

## 描述
{从 epics.md 复制的 Story 描述}

## Acceptance Criteria
- [ ] AC1: ...
- [ ] AC2: ...

## 技术方案
- **新/改文件**: {列出要创建或修改的文件}
- **Schema 变更**: {是否需要 Prisma migrate}
- **新依赖**: {需要安装的新包，或"无"}

## 完成记录
- 完成日期: {完成后填写}
- 验证: TSC ✅ LINT ✅
```

**sprint-status 更新规则**: 状态变更时**立即更新**，不得批量刷

```yaml
# 正确 ✅ —— 实时更新
3-1-plugin-popup-bookmark: in-progress  # 开始开发时标记

# 错误 ❌ —— 批量刷
3-1: done  # 5 个 Story 同时标完
3-2: done
3-3: done
```

**反面教训**: Thoughtmark MVP 中 Epic 2 和 Epic 5 跳过了此步骤，导致后期无法追溯设计决策。

### Step 3: 实现代码

**规则**:
1. 遵循 `project-context.md` 中的命名约定和 API 格式
2. **引入新依赖前必须暂停**，向用户说明 Why & What
3. 代码注释覆盖率 ≥ 关键函数的 JSDoc + 文件头注释
4. **延期工作必须留 TODO 标记**（见下文）

**TODO 标记规则**: 当一项工作被有意推迟时，**必须同时在 3 个位置留痕**：

```typescript
// 1. 代码注释
// TODO(V3-Agentic): 实现充分性检查 Prompt — 原因: A3 只需相关性打分

// 2. Story 文件中注明
// 3. 开发执行日志中注明延期决策
```

格式: `TODO({目标阶段}-{模块名}): {内容} — 原因: {原因}`

### Step 4: 验证 — TSC + LINT + Migrate ⚠️ 强制

**触发**: 每次 Story 代码完成后
**强制动作**:
```bash
npx tsc --noEmit         # TypeScript 类型检查
npm run lint             # ESLint 规范检查
npx prisma migrate dev   # 数据库迁移（如有 schema 变更）
```
**规则**: 3 项全过才能 `git commit`，0 容忍编译错误进 Git。

### Step 5: 更新日志 + 宪法 ⚠️ 强制

**触发**: 每个 Story 完成后立即执行

| 更新什么 | 何时更新 |
|---|---|
| `开发执行日志.md` | **每个 Story 完成后**追加产出表+验证结果+踩坑 |
| `project-context.md` | **引入新技术栈/API/环境变量时**同步更新 |
| `sprint-status.yaml` | 标记 `X-Y: done` |

**反面教训**: Thoughtmark MVP 中 Epic 2/5/6 在全部完成后才补写日志，丢失了过程细节。

### Step 6: Git Commit

```bash
git add -A
git commit -m "{type}({scope}): Story X.Y - {description}"
git push origin master
```

**Commit Message 规范**:

| type | 含义 | 示例 |
|---|---|---|
| `feat` | 新功能 | `feat(web): Story 3.1 - 插件弹窗一键收藏` |
| `fix` | Bug 修复 | `fix(api): Embedding batch size 25→10` |
| `docs` | 文档变更 | `docs: 更新 project-context 技术栈` |
| `refactor` | 重构 | `refactor(auth): 合并登录逻辑` |

**scope 取值**: `web` / `api` / `ext` / `db` / `ci`——对应子系统。

### Step 7: Epic Retrospective ⚠️ 强制

**触发**: Epic **全部 Stories 完成后**（不是每个 Story 后）
**强制动作**:
1. 在 `docs/dev-history/` 中追加 Retro 章节
2. 必须包含 **3 条**：
   - 💚 做好了什么
   - 🔴 踩坑了什么
   - 🔵 下次改进什么
3. 更新 `sprint-status.yaml`: `epic-X-retrospective: done`（不能留 `optional`）

---

## implementation_plan 归档规则

> 来自全局规则 R6：**Archive-Before-Overwrite**

每次覆写 `implementation_plan.md` 前，**必须**：

1. 将当前版本复制到 `docs/dev-history/v{N}_xxx_子计划/A{M}_xxx.md`
2. 覆写为新计划
3. 同步一份到 `docs/dev-history/` 对应位置

**严禁**: 直接覆写而不归档 = **销毁原始证据**。

---

## 快速参考卡

| 阶段 | 强制产物 | 位置 |
|---|---|---|
| 新会话 | Step 0 上下文恢复 | sprint-status + context + 日志 |
| Epic 开始 | sprint-status 标 in-progress | `sprint-status.yaml` |
| Story 开始 | Story 文件 + sprint-status | `implementation-artifacts/` |
| 代码完成 | TSC ✅ LINT ✅ Migrate ✅ | 终端 |
| Story 完成 | 日志追加 + sprint-status 标 done | `开发执行日志.md` |
| 新技术栈 | project-context 同步更新 | `project-context.md` |
| 新依赖 | 暂停审批 | 向用户确认 |
| 延期工作 | TODO 标记（代码+文档+日志） | 三处同时 |
| Epic 完成 | Retrospective + status 标 done | `docs/dev-history/` |
| 覆写计划 | 归档到 dev-history | `docs/dev-history/v{N}/` |

---

## 违规等级

| 等级 | 场景 | 后果 |
|---|---|---|
| 🔴 P0 | TSC/LINT 未通过就 commit | 必须 amend 或 revert |
| 🔴 P0 | 覆写 implementation_plan 不归档 | 立即补归档 |
| 🟡 P1 | 跳过 Story 文件创建 | 必须补创建后才能继续 |
| 🟡 P1 | project-context 未同步更新 | 当前 Story 完成前补更新 |
| 🟡 P1 | retrospective 标 optional 未改 done | 当即修改 |
| 🟢 P2 | 日志延迟追加 | 当前 Epic 结束前补写 |
| 🟢 P2 | TODO 标记不全 | 发现时补齐 |
