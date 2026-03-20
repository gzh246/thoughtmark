---
description: BMAD 驱动开发流程——从 Epic 开始到 Retrospective 的 7 步强制检查点
---

# BMAD Dev Flow

每个 Story 的开发流程必须遵循以下 7 步：

// turbo-all

## 1. 开 Epic — 阅读 AC

当开始新 Epic 时：

```bash
# 阅读 Epic AC
cat _bmad-output/planning-artifacts/epics.md
# 阅读历史教训
cat docs/dev-history/AI执行复盘与教训.md
```

- 更新 `sprint-status.yaml`: `epic-X: in-progress`

## 2. 创建 Story 文件（⚠️ 强制）

在 `_bmad-output/implementation-artifacts/` 下创建 Story 文件：

命名格式: `{epic}-{story}-{短横线描述}.md`
示例: `5-1-first-ai-clustering-trigger.md`

内容至少包含：
- Story 标题 + 描述
- Acceptance Criteria（从 epics.md 复制）
- 技术方案要点

然后更新 `sprint-status.yaml`: `X-Y-story-name: in-progress`

## 3. 实现代码

- 遵循 `project-context.md` 命名约定
- 引入新依赖前**暂停审批**
- 代码注释覆盖关键函数

## 4. 验证（⚠️ 强制 — 3 项全过才能 commit）

```bash
npx tsc --noEmit
npm run lint
npx prisma migrate dev  # 如有 schema 变更
```

## 5. 更新日志 + 宪法（⚠️ Story 完成后立即执行）

1. 追加 `docs/dev-history/开发执行日志.md`：产出文件表 + 验证结果 + 踩坑
2. 如有新技术栈/API/环境变量 → 更新 `project-context.md`
3. 更新 `sprint-status.yaml`: `X-Y: done`

## 6. Git Commit

```bash
git add -A
git commit -m "feat(scope): Story X.Y - description"
git push origin master
```

## 7. Epic Retrospective（⚠️ Epic 全部 Stories 完成后）

在 `docs/dev-history/` 中追加：
- 💚 做好了什么
- 🔴 踩坑了什么  
- 🔵 下次改进什么

更新 `sprint-status.yaml`: `epic-X-retrospective: done`
