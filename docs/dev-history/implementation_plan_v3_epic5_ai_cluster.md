# Epic 5 实施计划：AI 聚类与智能知识整理

## 背景与策略

Epic 5 是 Thoughtmark 的**核心差异化**功能（PRD §"What Makes This Special"）。架构文档已明确技术选型：**BullMQ + Redis（Upstash）+ 邮件（Resend）**。

本次按 BMAD 流程分 5 个 Story 实施，Story 5.1 → 5.4 依序开发（5.5 Feature Flag 默认关闭）。

## User Review Required

> [!IMPORTANT]
> **新依赖引入（需你明确批准）：**
>
> | 包 | 用途 | 版本 |
> |---|---|---|
> | `bullmq` | 异步任务队列 | ^5.x |
> | `ioredis` | Redis 客户端（BullMQ 依赖）| ^5.x |
> | `openai` | AI Embedding + 聚类 | ^4.x |
> | `resend` | 发送重激活/记忆推送邮件 | ^4.x |
>
> **共 4 个新包**。我在拿到你批准前不会 `npm install`。

> [!WARNING]
> **需要你配置的环境变量（.env）：**
> ```
> REDIS_URL=redis://...          # Upstash Redis URL
> REDIS_TOKEN=xxx                # Upstash REST Token（ioredis 不需要，BullMQ 直接用 URL）
> OPENAI_API_KEY=sk-xxx          # OpenAI API Key
> RESEND_API_KEY=re_xxx          # Resend 邮件 API Key
> ```

## AI 模型选型决策

### 方案对比

| 方案 | 优点 | 缺点 |
|---|---|---|
| **OpenAI text-embedding-3-small** ✅ | 质量高、API 简单、按量计费 | 需要 OpenAI Key，有费用 |
| 本地 Hugging Face 模型 | 免费 | 需要额外服务器，本地开发复杂 |
| Google Gemini Embedding | 也可以 | 需要另一套凭据 |

**推荐 OpenAI `text-embedding-3-small`** + **KMeans 聚类（纯 JS 实现，无需 Python）**：
- Embedding：将每条书签的 `title + whySaved` 转为向量
- 聚类：在 BullMQ Worker 中用简单 KMeans 算法对向量分组
- 命名：用每组中出现最多的 tag 或 embedding 质心最近的词命名主题

## Prisma Schema 变更

需要新增 3 个 model：

```prisma
// Cluster：AI 生成的主题分组
model Cluster {
  id          String     @id @default(cuid())
  userId      String     @map("user_id")
  name        String
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks   BookmarkCluster[]

  @@index([userId, updatedAt(sort: Desc)])
  @@map("clusters")
}

// BookmarkCluster：书签与主题的多对多（一本书签可属于多个主题）
model BookmarkCluster {
  bookmarkId  String   @map("bookmark_id")
  clusterId   String   @map("cluster_id")
  addedAt     DateTime @default(now()) @map("added_at")

  bookmark    Bookmark @relation(...)
  cluster     Cluster  @relation(...)

  @@id([bookmarkId, clusterId])
  @@map("bookmark_clusters")
}

// Notification：应用内通知
model Notification {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  type      String   // "CLUSTER_READY" | "REACTIVATION" | "MEMORY_PUSH"
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(...)
  @@map("notifications")
}
```

## Proposed Changes（5 Stories）

---

### Story 5.1: 首次 AI 聚类触发与通知

**核心逻辑**：保存第 20 条带注解书签时，自动入队 BullMQ 任务。

#### [NEW] `src/lib/queue.ts`
- 初始化 BullMQ Queue（`ai-cluster` 队列）+ Redis 连接

#### [NEW] `src/lib/worker.ts`（Next.js API Route 外独立运行）
- Worker 消费 `ai-cluster` 队列：Embedding → KMeans → 写入 DB → 创建 Notification

#### [MODIFY] `src/app/api/bookmarks/route.ts`（POST handler）
- 保存书签后，检查该用户带注解书签数量是否达到 20
- 达到则 `queue.add("cluster", { userId })`

#### [NEW] `src/app/api/notifications/route.ts`
- GET: 获取当前用户未读通知列表

#### [NEW] `src/features/ai-cluster/`
- 创建 feature 目录（遵守 architecture.md Feature-based 结构）

---

### Story 5.2: 聚类结果展示

#### [NEW] `src/app/(main)/clusters/page.tsx`
- Server Component 壳 + 主题卡片列表（名称、书签数、更新时间）

#### [NEW] `src/components/cluster/ClusterCard.tsx`
- 主题卡片：可展开显示书签列表

#### [NEW] `src/app/api/clusters/route.ts`
- GET: 获取当前用户所有 Cluster + 书签数量

#### [MODIFY] Timeline header
- 添加 "主题" 导航入口

---

### Story 5.3: 手动调整聚类结果

#### [NEW] `src/app/api/clusters/[id]/route.ts`
- PUT: 重命名主题
- DELETE: 删除主题（书签不删除，只解除关联）

#### [NEW] `src/app/api/clusters/merge/route.ts`
- POST: 合并两个主题

#### [MODIFY] `src/components/cluster/ClusterCard.tsx`
- 添加重命名功能（inline 编辑）
- 添加移动书签功能（拖拽 or 下拉选择）

---

### Story 5.4: 重激活提醒

#### [NEW] `src/lib/scheduledJobs.ts`
- BullMQ Scheduler（每日 UTC 00:00 运行）
- 查询近 7 天无新书签用户 → Resend 发送邮件

#### [NEW] `src/app/api/cron/reactivation/route.ts`
- POST handler（Vercel Cron Job 触发）

---

### Story 5.5: 记忆推送（Feature Flag 默认关闭）

#### [MODIFY] `src/lib/scheduledJobs.ts`
- 添加 14 天未看主题推送逻辑
- `if (process.env.MEMORY_PUSH_ENABLED !== "true") return`

---

## 开发顺序

```
A1: 基础设施（schema + queue + 环境变量）
A2: Story 5.1（触发 + Worker）
A3: Story 5.2（结果展示）
A4: Story 5.3（手动调整）
A5: Story 5.4 + 5.5（邮件 + 记忆推送 Feature Flag）
```

## 验证计划

### 每个 Story
- `npx tsc --noEmit` + `npm run lint`
- BullMQ Worker 手动触发测试（Mock 用户数据）

### 集成测试
- 模拟 20 条书签 → 验证队列入队 → Worker 执行 → 聚类结果落库
