# Thoughtmark MVP Retrospective

**日期**：2026-03-20
**范围**：Epic 1-6（全部）

## 做得好的

1. **一天内完成全部 6 个 Epics（28 Stories）** — 从项目初始化到完整商业化功能
2. **严格的命名一致性** — 数据库 snake_case、前端 camelCase、Prisma @map() 映射全程无违规
3. **每次代码提交前 TSC + LINT 双重验证**，0 次编译错误进 Git
4. **架构文档驱动**——技术选型（BullMQ/Redis）以 architecture.md 为准，不随意更改
5. **依赖引入审批**——每个新 npm 包都暂停向用户说明用途、获批后才安装

## 做得不够的

1. **BMAD Story 文件缺失** — 只给 1.1-4.4 和 6.1 创建了 `_bmad-output/implementation-artifacts/` 下的 Story 文件，Epic 2 和 Epic 5 的 Story 文件未创建
2. **开发执行日志延迟** — Epic 2/5/6 在完成后才补写日志，而非边做边记录
3. **project-context.md 未及时更新** — 新增了 BullMQ/Redis/Nodemailer 等技术栈，但直到最后才更新项目宪法
4. **Retrospective 未逐 Epic 执行** — sprint-status.yaml 中标记了 `epic-X-retrospective: optional` 但从未填写

## 改进建议（开发 BMAD 使用规范时参考）

| 环节 | 当前状态 | 建议改为 |
|---|---|---|
| **Story 文件创建** | 可选 | 每个 Story 开始时**强制创建** `_bmad-output/implementation-artifacts/X-Y-*.md` |
| **开发执行日志** | 完成后补写 | 每个 Story **完成后立即**追加到日志，不得累积 |
| **project-context.md** | 偶尔更新 | 每引入新技术栈/环境变量/API 端点时**强制同步更新** |
| **Retrospective** | optional | 每个 Epic 完成后**必须**写 3 条：做好了什么 / 踩坑了什么 / 下次改进什么 |
| **sprint-status.yaml** | 手动维护 | 每个 Story 状态变更时**立即更新**，不得批量刷 |

## 技术债务清单

| 优先级 | 项目 | 说明 |
|---|---|---|
| P1 | Stripe 真实集成 | 当前 Mock 模式，需要注册 Stripe 账户 |
| P1 | 记忆推送完整实现 | Feature Flag 默认关闭，需要产品验证后开启 |
| P2 | PostHog 埋点 | 运营仪表盘当前用 DB 直查，需要真正的埋点系统 |
| P2 | AI 聚类主题命名优化 | 当前用高频 tag，需要 LLM 生成更智能的主题名 |
| P3 | WebSocket 实时通知 | 当前只有轮询通知，V2 需要 WebSocket |
