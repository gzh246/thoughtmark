---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['brainstorming-session-2026-03-19.md']
workflowType: 'prd'
brainstormingCount: 1
briefCount: 0
researchCount: 0
projectDocsCount: 0
classification:
  projectType: 'SaaS Web App + Browser Extension'
  domain: 'Knowledge Management / Personal Productivity'
  complexity: 'medium'
  projectContext: 'greenfield'
---

# Product Requirements Document - Thoughtmark

**Author:** A-pc
**Date:** 2026-03-19

## Executive Summary

Thoughtmark 是一款为知识工作者和科研人员设计的思维轨迹记录系统，由浏览器插件（捕捉端）和 Web App（回顾端）组成。它解决的核心问题是：现有书签工具只记录"你存了什么"，而不记录"你因此想到了什么"——导致用户无法通过自己的收藏痕迹还原曾经的认知状态和知识成长过程。

Thoughtmark 的使用循环是：在浏览网页时，用户通过插件一键收藏并附上一句"这让我想到……"的注解；AI 将积累的收藏和注解按语义聚类、时间维度整理；用户定期在 Web App 中回顾自己的知识演化轨迹，发现认知盲区或成长节点。

**目标用户（MVP）**：个人知识工作者、研究人员、学生群体（18-35岁，有系统化学习需求，使用过 Notion/Readwise 但感到不够深）。

### What Makes This Special

现有知识管理工具的核心缺陷：
- **Pocket/Instapaper**：记录链接，不记录动机
- **Readwise**：记录划线，不记录想法
- **Notion**：高度灵活，但需要大量手动组织

Thoughtmark 的差异化在于**一个字段**：`why_saved`（为什么收藏这个）。这个字段让书签从"信息存档"升级为"思维指纹"。6个月的积累后，AI 可以用这些数据为用户绘制出独一无二的"认知演化图谱"——这是任何现有工具都无法提供的。

**核心未验证假设**（风险提示）：用户是否会持续填写注解字段。产品 MVP 的首要目标是验证这一行为假设。

## Project Classification

- **项目类型**：SaaS Web App（回顾端）+ 浏览器扩展（捕捉端）
- **领域**：知识管理 / 个人生产力
- **复杂度**：中等（涉及 AI 语义聚类、跨设备同步、浏览器扩展权限）
- **项目阶段**：绿地项目（Greenfield）
- **商业模式**：个人订阅制（免费基础版 + Pro 订阅）

## Success Criteria

### User Success

**核心行为假设验证**：MVP 阶段的首要目标是验证用户愿意持续填写注解字段。

| 指标 | 目标值 | 说明 |
|---|---|---|
| 注解填写率（前 2 周）| ≥ 40% | 每两次收藏至少一次带有注解 |
| Week 4 留存率 | ≥ 30% | 安装 4 周后仍在使用的用户比例 |
| 用户"啊哈时刻" | 首次看到 AI 聚类结果后的留存提升 | 作为产品关键节点监控 |

**用户成功的定性标志**：用户存了 20+ 个带注解的书签后，首次打开 AI 聚类时间轴视图，并能识别出"这就是某段时间我在关心的问题"——这是产品的核心价值交付时刻。

### Business Success

**3 个月目标**：

| 指标 | 目标值 |
|---|---|
| 周活跃用户 (WAU) | ≥ 500 人 |
| 人均书签数 | ≥ 20 个 |
| NPS（净推荐值）| ≥ 40 |

注：用户数不是首要指标——**留存率和使用深度**是 MVP 阶段最重要的北极星指标。

### Technical Success

- 插件安装到首次收藏 < 60 秒
- AI 聚类响应时间 < 3 秒
- 跨设备同步延迟 < 5 秒
- 数据不丢失（99.9% 可靠性）

## Product Scope

### MVP — 必须有

- 浏览器插件（Chrome 优先）：一键收藏 + 注解弹窗
- 用户账户 + 跨设备数据同步
- 书签时间轴视图（Web App）
- 基础 AI 聚类（按关键词/主题分组，展示在时间轴上）

### Growth Features（V2）

- 高级语义聚类 + 认知演化图谱可视化
- 带注解的书签分享给好友
- 按时间/主题的知识回顾报告

## User Journeys

### 🧑‍💻 Journey 1：Alex · 个人知识工作者（核心用户 · 成功路径）

**开场**：Alex 是 28 岁产品经理，浏览器书签 800+ 条，"技术"文件夹塞了 300 个链接，他根本不记得为什么存了其中大多数。某天他在找 3 个月前的一篇文章，翻了 40 分钟没找到。

**发现**：同事分享了一个带注解的链接——"看第三段，和我们上次讨论的分发策略有关"。Alex 第一次感受到"带着别人视角读文章"。他安装了插件。

**关键时刻**：第三周，AI 把他的书签聚成两个主题群：「AI 产品分发策略」和「用户留存模型」。他愣了一秒——他没有主动分类，但这正是他最近脑子里转的两件事。**这是他的啊哈时刻。**

**结局**：收藏时写注解已成为自然习惯。三个月后，他用 Thoughtmark 的时间轴做了一次季度复盘，第一次清晰看到自己的认知成长轨迹。

> *揭示需求*：插件 + 注解弹窗、时间轴、AI 聚类、好友注解分享

---

### 🔬 Journey 2：Dr. Chen · 科研工作者（高价值用户 · 进阶路径）

**开场**：Dr. Chen 博士在读，研究认知神经科学。她用 Zotero 管理 2000+ 篇文献，但找不到"这篇论文影响了我哪个假设"的线索。

**使用过程**：用 Thoughtmark 替代 Zotero 管理网页论文链接，每次收藏时填写"支持/挑战XX假设"。6 个月后形成清晰的假设演化地图。

**结局**：直接用这张图写出了论文 Related Work 章节的脉络，导师称是她写得最清晰的一次。

> *揭示需求*：URL 类型标注、导出功能、高级过滤器

---

### ⚙️ Journey 3：运营管理员（系统运营视角）

**职责**：监控注解填写率（核心 MVP 指标）、用户活跃度、AI 聚类准确性反馈。当某批用户注解填写率低于 20% 时，触发 onboarding 提醒流程。

> *揭示需求*：后台数据仪表盘、用户行为漏斗、邮件/推送提醒系统

---

### Journey Requirements Summary

| 揭示的能力 | 对应旅程 |
|---|---|
| 浏览器插件 + 注解弹窗 | Journey 1、2 |
| 书签时间轴 + AI 聚类 | Journey 1、2 |
| 好友注解分享 | Journey 1 |
| 论文类型标注 + 导出 | Journey 2 |
| 后台运营仪表盘 | Journey 3 |

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR 合规（必须）**：用户书签和注解属于个人数据。产品必须支持：数据导出（Takeout）、账户删除（Right to Erasure）、用户同意声明（Cookie/数据处理同意）
- **隐私政策**：Chrome Web Store 要求插件有可访问的隐私政策页面，说明数据收集范围

### Technical Constraints

- **浏览器权限最小化**：插件仅申请 `tabs` 和 `storage`，不申请 `history` 或 `browsingData`
- **数据存储**：书签和注解需加密传输（HTTPS）和静态加密

## Innovation & Novel Patterns

### Detected Innovation Areas

**核心创新：思维指纹字段（why_saved）**

在书签工具这个已有 30 年历史的品类中，Thoughtmark 增加了"**为什么收藏**"的字段——把书签从"信息存档"升级为"思维轨迹记录"，这是该品类从未被系统性解决过的维度。

**创新组合**：书签行为 × 注解习惯 × AI 语义聚类 × 时间轴视图 = 全新的"认知成长记录器"品类。

### Market Context & Competitive Landscape

| 竞品 | 解决了什么 | 缺失什么 |
|---|---|---|
| Readwise | 记录划线 | 不记录想法 |
| Mem.ai | 自动组织笔记 | 不聚焦书签场景 |
| Pocket | 纯存档 | 无注解、无 AI |
| Notion | 高度灵活 | 需大量手动维护 |

**市场窗口**：AI 语义聚类成本在 2024-2025 年断崖式下降，使"个人知识图谱"首次在 B2C 价格点上可行。

### Validation Approach

1. **MVP 假设验证**（Week 1-4）：注解填写率是否 ≥ 40%？
2. **啊哈时刻验证**（Week 4-8）：首次看到 AI 聚类后次周留存率是否显著提升？
3. **差异化验证**：用户访谈——"和其他书签工具最大的不同？"

### Risk Mitigation

| 风险 | 缓解策略 |
|---|---|
| 用户不填注解 | 注解弹窗提供 3 个一键快选按钮，降低填写摩擦 |
| AI 聚类不准确 | MVP 允许用户手动调整聚类标签，AI 结果作为建议 |

## SaaS Web App + Browser Extension Specific Requirements

### Project-Type Overview

Thoughtmark 由两个技术组件组成：**浏览器插件**（数据捕捉端）和 **SaaS Web App**（数据回顾端）。两者通过云端 API 打通，用户账户共享同步。B2C 优先，未来可扩展至 B2B。

### Technical Architecture Considerations

**① 用户认证体系**：插件和 Web App 共用 JWT Token（SSO）；登录方式：Email + Google OAuth；插件内嵌 Token 刷新逻辑

**② 数据同步架构**：插件即时上传 + 本地缓存队列（离线时暂存，上线后自动同步）；URL + 时间窗口判断去重

**③ AI 聚类服务**：异步处理（收藏后立即返回，AI 后台执行）；MVP 用 TF-IDF 聚类 → V2 升级为语义向量聚类（OpenAI Embeddings）

**④ 订阅层级**：Free（500 条书签，无 AI 聚类）/ Pro（$8/月，无限书签 + AI 聚类 + 导出）/ Stripe 计费

**⑤ 浏览器扩展约束**：Chrome Manifest V3 + 权限最小化（仅 `tabs` + `storage`）

### Implementation Considerations

| 层次 | 技术选型 |
|---|---|
| 前端 | React（Web App + 插件 Popup）|
| 后端 | Node.js / Python FastAPI + PostgreSQL + Redis |
| 部署 | Vercel（前端）+ Railway / Render（后端）|
| CDN | Cloudflare |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

- **MVP 类型**：问题验证型（验证"用户愿意写注解"这一核心行为假设）
- **最小团队**：1 名全栈工程师 + 1 名产品/设计

### MVP Feature Set（Phase 1）

| 功能 | 状态 | 说明 |
|---|---|---|
| 浏览器插件（Chrome）| ✅ MVP | 一键收藏 + 注解弹窗（含 3 个快选按钮）|
| 用户账户 + 登录 | ✅ MVP | Email + Google OAuth |
| 书签时间轴视图 | ✅ MVP | 按时间顺序展示所有收藏 |
| 基础 AI 聚类（TF-IDF）| ✅ MVP | 按关键词主题自动分组 |
| 跨设备数据同步 | ✅ MVP | 云端存储，多设备可访问 |
| 数据导出（GDPR）| ✅ MVP | JSON / CSV 格式导出 |

### Post-MVP Features

**Phase 2（Growth）**：高级语义聚类、认知图谱可视化、书签好友分享、月度回顾报告、Firefox/Edge 支持

**Phase 3（Expansion）**：团队共享知识库、企业采购 API、科研文献管理模块

### Risk Mitigation Strategy

| 风险类型 | 具体风险 | 缓解策略 |
|---|---|---|
| 技术风险 | AI 聚类 MVP 不够精准 | 允许用户手动调整，AI 作为建议 |
| 市场风险 | 用户不养成注解习惯 | 快选按钮 + Onboarding 引导 |
| 资源风险 | 团队规模不足 | MVP 仅做 Chrome 插件 |

## Functional Requirements

### User Account & Auth

- FR1: 访客可以通过 Email + 密码注册账户
- FR2: 访客可以通过 Google OAuth 注册/登录账户
- FR3: 已登录用户可以查看和修改账户基本信息
- FR4: 已登录用户可以修改密码或断开 OAuth 关联
- FR5: 用户可以删除账户及其所有数据（GDPR）
- FR6: 用户可以导出所有书签和注解数据（JSON/CSV）

### Bookmark Capture

- FR7: 已登录用户可以通过浏览器插件一键收藏当前页面
- FR8: 用户收藏时可以填写一句话注解
- FR9: 用户收藏时可以从预设快选标签中选择（学习资料/工作参考/灵感收藏）
- FR10: 用户可以跳过注解直接完成收藏
- FR11: 插件可以在离线状态下暂存书签，网络恢复后自动同步
- FR12: 系统自动去除 24 小时内重复收藏的同一 URL

### Timeline & Browse

- FR13: 用户可以在 Web App 中以时间轴形式查看所有收藏
- FR14: 用户可以按时间范围筛选时间轴（今天/本周/本月/自定义）
- FR15: 用户可以点击书签查看完整的 URL、标题、注解和收藏时间
- FR16: 用户可以编辑或删除已收藏的书签
- FR17: 用户可以手动给书签添加或修改主题标签

### AI Clustering

- FR18: 系统可以自动将用户的书签按主题进行聚类分组
- FR19: 用户可以查看 AI 生成的主题分组结果
- FR20: 用户可以手动调整 AI 聚类结果（合并、拆分、重命名）
- FR21: 系统在用户首次达到 20 条带注解书签时，自动触发 AI 聚类并通知

### Notifications & Onboarding

- FR22: 新用户安装插件后，系统展示 3 步引导流程
- FR23: 系统在用户连续 7 天未使用插件时，发送重激活提醒邮件
- FR24: 系统在 AI 聚类完成后通知用户

### Subscription & Billing

- FR25: 未订阅用户受功能限制（书签上限 500 条，无 AI 聚类）
- FR26: 用户可以订阅 Pro 计划（解锁所有功能）
- FR27: 用户可以查看当前订阅状态和下次付款日期
- FR28: 用户可以随时取消订阅

### Admin & Operations

- FR29: 运营管理员可以查看核心指标仪表盘（注解填写率、WAU、留存率）
- FR30: 运营管理员可以向指定用户群体发送邮件通知

## Non-Functional Requirements

### Performance

- 书签收藏操作响应 < 1 秒（插件端）
- AI 聚类后台计算完成通知延迟 < 3 秒
- Web App 首屏加载 < 2 秒（P95）
- 跨设备数据同步延迟 < 5 秒

### Security

- 所有传输使用 HTTPS/TLS 1.2+
- 数据库静态加密（AES-256）
- 密码使用 bcrypt（cost factor >= 12）存储
- 插件仅申请最小权限（tabs + storage）
- GDPR 合规：数据导出 72 小时内完成，账户删除立即执行

### Scalability

- MVP 阶段支持 5,000 注册用户、500 WAU，无性能降级
- 后端无状态化，支持水平扩展
- 单用户 10,000 条书签查询 P99 < 200ms

### Reliability

- 核心数据 99.9% 可用性（每月不超过 43 分钟停机）
- 插件离线缓存最多保留 7 天未同步数据
- 每日自动备份，保留 30 天历史

### Proactive Memory（V2，由 Brainstorming 补充）

- **FR31**: 系统在用户超过 14 天未回顾某个主题聚类时，主动推送"你上次在研究 X，想继续吗？"提醒（默认开启，用户可关闭）

---

*PRD Status: **Complete** ✅*
*Last Updated: 2026-03-20*
*Version: 1.0 — Thoughtmark MVP*
*Author: A-pc | Facilitated by: John (BMAD PM Agent)*

