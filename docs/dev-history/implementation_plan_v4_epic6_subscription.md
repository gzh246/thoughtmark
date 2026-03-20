# Epic 6 实施计划：订阅、计费与运营后台

## 背景

Epic 6 是产品的**商业化层**——免费层限制、Pro 订阅、运营仪表盘、批量邮件。这是 Thoughtmark 6 个 Epic 中的最后一个。

## User Review Required

> [!IMPORTANT]
> **Stripe 集成策略决策**
>
> Stripe 支付需要注册 Stripe 账号 + 获取 API Key。国内用户注册 Stripe 有门槛（需要境外收款账户）。
>
> **MVP 方案**：先用 Mock 订阅模式（管理员手动切换用户 Pro 状态），代码架构预留 Stripe 接口，后续真实接入。
>
> 这样你不需要现在注册 Stripe，但代码层面功能完整——免费层限制、Pro 权益检查、订阅管理 UI 全部可用。

> [!WARNING]
> **新依赖**：`stripe`（npm SDK） — MVP 阶段只安装不实际调用，预留接口。
> **Prisma Schema**：User model 添加 `plan` 字段（`"free"` | `"pro"`）

## Proposed Changes

### Prisma Schema（前置）

#### [MODIFY] schema.prisma
- User 添加 `plan` 字段（默认 `"free"`）
- User 添加 `planExpiresAt` 字段（Pro 到期时间）

---

### Story 6.1: 免费层功能限制

#### [MODIFY] `api/bookmarks/route.ts` POST handler
- 保存前检查：免费用户书签数 ≥ 500 → 返回 `PLAN_LIMIT` 错误

#### [MODIFY] `clusters/page.tsx`
- 免费用户访问时显示 Pro 升级引导页，不显示聚类内容

---

### Story 6.2 + 6.3: 订阅管理

#### [NEW] `api/subscription/route.ts`
- GET: 获取订阅状态（plan + 到期时间）
- POST: **MVP Mock** — 管理员切换用户 Pro（预留 Stripe Checkout 接口）

#### [MODIFY] `settings/page.tsx`
- 新增「订阅管理」区域（当前计划 + 升级/取消按钮）

---

### Story 6.4: 运营仪表盘

#### [NEW] `app/(admin)/admin/page.tsx`
- 管理员仪表盘：WAU、注解填写率、新用户注册数、Pro 订阅数
- 数据源：Prisma 数据库查询（MVP 不接 PostHog）

#### [NEW] `api/admin/stats/route.ts`
- GET: 聚合查询运营指标（需验证管理员身份）

---

### Story 6.5: 运营邮件

#### [NEW] `api/admin/email/route.ts`
- POST: 选目标群体 + 主题 + 正文 → BullMQ 批量发送

#### [MODIFY] `app/(admin)/admin/page.tsx`
- 添加「发送运营邮件」表单区域

---

## 开发顺序

```
A1: Schema 变更（plan 字段）+ Prisma migrate
A2: Story 6.1（免费层限制）
A3: Story 6.2 + 6.3（订阅管理 Mock）
A4: Story 6.4（运营仪表盘）
A5: Story 6.5（运营邮件）
```

## BMAD Story 文件

为每个 Story 创建 BMAD Story 文件到 `_bmad-output/implementation-artifacts/`。

## 验证计划

- `npx tsc --noEmit` + `npm run lint`
- Git push → CI
