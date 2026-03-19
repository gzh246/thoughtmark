---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['prd.md', 'architecture.md']
---

# Thoughtmark - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Thoughtmark, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 访客可以通过 Email + 密码注册账户
FR2: 访客可以通过 Google OAuth 注册/登录账户
FR3: 已登录用户可以查看和修改账户基本信息
FR4: 已登录用户可以修改密码或断开 OAuth 关联
FR5: 用户可以删除账户及其所有数据（GDPR）
FR6: 用户可以导出所有书签和注解数据（JSON/CSV）
FR7: 已登录用户可以通过浏览器插件一键收藏当前页面
FR8: 用户收藏时可以填写一句话注解
FR9: 用户收藏时可以从预设快选标签中选择（学习资料/工作参考/灵感收藏）
FR10: 用户可以跳过注解直接完成收藏
FR11: 插件可以在离线状态下暂存书签，网络恢复后自动同步
FR12: 系统自动去除 24 小时内重复收藏的同一 URL
FR13: 用户可以在 Web App 中以时间轴形式查看所有收藏
FR14: 用户可以按时间范围筛选时间轴（今天/本周/本月/自定义）
FR15: 用户可以点击书签查看完整的 URL、标题、注解和收藏时间
FR16: 用户可以编辑或删除已收藏的书签
FR17: 用户可以手动给书签添加或修改主题标签
FR18: 系统可以自动将用户的书签按主题进行聚类分组
FR19: 用户可以查看 AI 生成的主题分组结果
FR20: 用户可以手动调整 AI 聚类结果（合并、拆分、重命名）
FR21: 系统在用户首次达到 20 条带注解书签时，自动触发 AI 聚类并通知
FR22: 新用户安装插件后，系统展示 3 步引导流程
FR23: 系统在用户连续 7 天未使用插件时，发送重激活提醒邮件
FR24: 系统在 AI 聚类完成后通知用户
FR25: 未订阅用户受功能限制（书签上限 500 条，无 AI 聚类）
FR26: 用户可以订阅 Pro 计划（解锁所有功能）
FR27: 用户可以查看当前订阅状态和下次付款日期
FR28: 用户可以随时取消订阅
FR29: 运营管理员可以查看核心指标仪表盘（注解填写率、WAU、留存率）
FR30: 运营管理员可以向指定用户群体发送邮件通知
FR31: 系统在用户超过 14 天未回顾某个主题聚类时，主动推送提醒（V2，可关闭）

### NonFunctional Requirements

NFR1: 书签收藏操作响应 < 1 秒（插件端）
NFR2: AI 聚类后台计算完成通知延迟 < 3 秒
NFR3: Web App 首屏加载 < 2 秒（P95）
NFR4: 跨设备数据同步延迟 < 5 秒
NFR5: 所有传输使用 HTTPS/TLS 1.2+
NFR6: 数据库静态加密（AES-256）
NFR7: 密码使用 bcrypt（cost factor >= 12）存储
NFR8: 插件仅申请最小权限（tabs + storage）
NFR9: GDPR 合规：数据导出 72 小时内完成，账户删除立即执行
NFR10: MVP 阶段支持 5,000 注册用户、500 WAU，无性能降级
NFR11: 后端无状态化，支持水平扩展
NFR12: 单用户 10,000 条书签查询 P99 < 200ms
NFR13: 核心数据 99.9% 可用性（每月不超过 43 分钟停机）
NFR14: 插件离线缓存最多保留 7 天未同步数据
NFR15: 每日自动备份，保留 30 天历史

### Additional Requirements

- 架构要求：初始化两个独立项目（thoughtmark-web + thoughtmark-extension）
- 架构要求：Prisma schema.prisma 是数据库单一真相来源，所有 model 变更通过 Prisma Migrate
- 架构要求：BullMQ 队列处理 AI 聚类、邮件发送、记忆推送异步任务
- 架构要求：NextAuth.js 处理认证，插件端通过共享 Cookie/JWT 实现 SSO
- 架构要求：PostHog 埋点覆盖所有关键用户行为（FR29 运营仪表盘数据来源）
- 架构要求：Stripe Webhook 处理订阅状态变更事件

### UX Design Requirements

N/A（本项目暂无 UX 设计文档，UI/UX 将在开发阶段按 PRD 用户旅程自行实现）

### FR Coverage Map

FR1: Epic 2 - Email 注册
FR2: Epic 2 - Google OAuth 登录
FR3: Epic 2 - 账户信息管理
FR4: Epic 2 - 密码/OAuth 管理
FR5: Epic 2 - 账户删除（GDPR）
FR6: Epic 2 - 数据导出
FR7: Epic 3 - 插件一键收藏
FR8: Epic 3 - 注解填写
FR9: Epic 3 - 快选标签
FR10: Epic 3 - 跳过注解
FR11: Epic 3 - 离线暂存 + 自动同步
FR12: Epic 3 - URL 去重
FR13: Epic 4 - 时间轴视图
FR14: Epic 4 - 时间范围筛选
FR15: Epic 4 - 书签详情查看
FR16: Epic 4 - 编辑/删除书签
FR17: Epic 4 - 手动标签
FR18: Epic 5 - AI 自动聚类
FR19: Epic 5 - 聚类展示
FR20: Epic 5 - 手动调整聚类
FR21: Epic 5 - 首次聚类自动触发
FR22: Epic 3 - 插件 Onboarding 引导
FR23: Epic 5 - 重激活提醒邮件
FR24: Epic 5 - AI 聚类完成通知
FR25: Epic 6 - 免费层功能限制
FR26: Epic 6 - Pro 订阅购买
FR27: Epic 6 - 订阅状态查看
FR28: Epic 6 - 取消订阅
FR29: Epic 6 - 运营仪表盘
FR30: Epic 6 - 运营邮件
FR31: Epic 5 - 记忆推送（V2）

## Epic List

### Epic 1: 项目基础与开发环境
初始化 thoughtmark-web（Next.js）和 thoughtmark-extension（WXT）双代码仓，配置数据库、认证、队列等基础设施，使开发团队可以在统一规范下启动功能开发。
**FRs covered:** 架构额外需求（初始化、Prisma、BullMQ、NextAuth、PostHog、Stripe）

### Epic 2: 用户账户与认证系统
用户可以注册、登录、管理账户，并在浏览器插件和 Web App 之间无缝切换身份，同时满足 GDPR 合规要求。
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 3: 书签收藏（插件核心功能）
用户可以通过浏览器插件一键收藏网页并填写"为什么收藏"注解，即使网络断开也能继续收藏，新用户可以通过引导流程快速上手。
**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR22

### Epic 4: 时间轴与知识库浏览
用户可以在 Web App 中以时间轴形式浏览自己的收藏历史，按时间范围筛选，并对书签进行编辑管理，感受"思维轨迹"带来的价值。
**FRs covered:** FR13, FR14, FR15, FR16, FR17

### Epic 5: AI 聚类与智能知识整理
用户可以看到 AI 自动归纳的主题分组，手动调整结果，并通过通知系统了解 AI 处理进度，体验"第二大脑"的核心差异化价值。
**FRs covered:** FR18, FR19, FR20, FR21, FR23, FR24, FR31

### Epic 6: 订阅、计费与运营后台
产品具备完整商业化能力，用户可以订阅/管理 Pro 计划，运营管理员可以监控核心指标并进行用户触达。
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30

## Epic 1: 项目基础与开发环境

初始化 thoughtmark-web（Next.js）和 thoughtmark-extension（WXT）双代码仓，配置数据库、认证、队列等基础设施，使开发团队可以在统一规范下启动功能开发。

### Story 1.1: 初始化 thoughtmark-web 项目

As a 开发者,
I want 初始化配置完整的 Next.js 项目，包括数据库、认证和代码规范,
So that 我可以立即开始功能开发，无需手动配置基础设施。

**Acceptance Criteria:**

**Given** 空白工作目录
**When** 运行 `npx create-next-app@latest thoughtmark-web --typescript --tailwind --eslint --app`
**Then** 生成完整 Next.js 14 App Router 项目结构
**And** 安装并配置 Prisma ORM + PostgreSQL 连接（通过 DATABASE_URL 环境变量）
**And** 安装并配置 NextAuth.js（基础会话配置）
**And** 安装 Upstash Redis 客户端（REDIS_URL 环境变量）
**And** 安装 BullMQ（任务队列依赖）
**And** `.env.example` 列出所有必需的环境变量
**And** `prisma/schema.prisma` 包含初始 User model（id, email, createdAt）
**And** `npx prisma migrate dev` 可成功执行首次迁移

### Story 1.2: 初始化 thoughtmark-extension 项目

As a 开发者,
I want 初始化配置完整的 WXT 浏览器插件项目,
So that 我可以开始实现 Chrome 插件功能，无需处理 Manifest V3 配置细节。

**Acceptance Criteria:**

**Given** 空白工作目录
**When** 运行 `npx wxt@latest init thoughtmark-extension --template react-ts`
**Then** 生成包含 React + TypeScript + Vite 的 WXT 项目结构
**And** `wxt.config.ts` 配置 Manifest V3、最小权限（tabs + storage）、插件名称为 "Thoughtmark"
**And** `.env` 包含 `VITE_API_BASE_URL` 环境变量（指向 thoughtmark-web API）
**And** `src/lib/api.ts` 包含基础 HTTP 客户端（携带认证 Header）
**And** `npm run dev` 可启动开发模式，在 Chrome 中加载插件无报错

### Story 1.3: 配置 CI/CD 与代码规范

As a 开发者,
I want 自动化的代码质量检查和持续集成流程,
So that 所有代码提交都经过一致性验证，避免手动遗漏。

**Acceptance Criteria:**

**Given** GitHub 仓库已创建
**When** 推送代码到任意分支
**Then** GitHub Actions workflow 自动运行 `eslint` + `tsc --noEmit`
**And** workflow 运行 `prisma validate` 验证 schema 正确性
**And** main 分支推送触发 Vercel 自动部署
**And** PR 创建触发 Vercel Preview 部署并在 PR 中附上预览链接

## Epic 2: 用户账户与认证系统

用户可以注册、登录、管理账户，并在浏览器插件和 Web App 之间无缝切换身份，同时满足 GDPR 合规要求。

### Story 2.1: Email 注册与登录

As a 访客用户,
I want 通过 Email 和密码注册并登录 Thoughtmark,
So that 我可以安全地访问我的个人书签库。

**Acceptance Criteria:**

**Given** 用户访问注册页面
**When** 输入有效 Email + 密码（最少 8 位）并提交
**Then** 系统创建账户（密码 bcrypt hash，cost factor 12）
**And** 自动登录并跳转到时间轴页面
**And** 若 Email 已注册，显示 "该邮箱已被使用" 提示

**Given** 已注册用户访问登录页
**When** 输入正确的 Email + 密码
**Then** 登录成功，创建 NextAuth session
**And** 错误密码时显示 "邮箱或密码错误"（不透露具体哪个错误）

### Story 2.2: Google OAuth 登录

As a 访客用户,
I want 通过 Google 账户一键注册/登录,
So that 我无需记住密码，降低使用门槛。

**Acceptance Criteria:**

**Given** 用户点击 "Continue with Google"
**When** 完成 Google OAuth 授权流程
**Then** 系统创建或关联账户（同 Email 时自动合并）
**And** 登录成功，跳转到时间轴页面

**Given** 已通过 Google 登录的用户
**When** 重复点击 "Continue with Google"
**Then** 直接登录，不重复创建账户

### Story 2.3: 账户信息管理

As a 已登录用户,
I want 查看和修改我的账户基本信息,
So that 我可以保持账户信息的准确性。

**Acceptance Criteria:**

**Given** 用户在设置页面
**When** 修改显示名称并保存
**Then** 名称更新成功，页面显示成功提示
**And** 名称不能为空，否则显示验证错误

**Given** 用户在账户设置页
**When** 查看账户信息
**Then** 显示注册邮箱、注册时间、当前订阅状态

### Story 2.4: 密码修改与 OAuth 管理

As a 已登录用户,
I want 修改密码或管理 OAuth 连接,
So that 我可以控制账户的安全访问方式。

**Acceptance Criteria:**

**Given** 用户提交密码修改表单
**When** 输入正确的当前密码和新密码（最少 8 位）
**Then** 密码更新成功，所有其他设备的 session 失效

**Given** 用户已连接 Google OAuth
**When** 点击断开 Google 连接
**Then** 成功断开连接（前提：账户已有 Email 密码，否则显示错误）

### Story 2.5: 数据导出（GDPR FR6）

As a 已登录用户,
I want 导出我所有的书签和注解数据,
So that 我对自己的数据拥有完整控制权。

**Acceptance Criteria:**

**Given** 用户点击 "导出数据"
**When** 系统处理导出请求
**Then** 在 72 小时内提供可下载的 JSON 文件
**And** 文件包含所有书签（URL、标题、注解、标签、收藏时间）
**And** 页面显示导出进行中状态

### Story 2.6: 账户删除（GDPR FR5）

As a 已登录用户,
I want 永久删除我的账户和所有数据,
So that 我可以行使 GDPR 被遗忘权。

**Acceptance Criteria:**

**Given** 用户在危险操作区域点击 "删除账户"
**When** 在确认对话框输入 "DELETE" 文本并确认
**Then** 立即删除用户的所有数据（书签、注解、聚类结果、session）
**And** 立即退出登录，跳转到首页
**And** 删除操作不可逆，无法恢复

## Epic 3: 书签收藏（插件核心功能）

用户可以通过浏览器插件一键收藏网页并填写注解，即使网络断开也能继续收藏，新用户通过引导流程快速上手。

### Story 3.1: 插件弹窗 UI 与一键收藏基础

As a 已登录用户,
I want 点击插件图标后弹出收藏表单，一键保存当前页面,
So that 我可以在不离开当前页的情况下完成收藏。

**Acceptance Criteria:**

**Given** 已安装并登录 Thoughtmark 插件的用户在任意网页
**When** 点击浏览器工具栏中的 Thoughtmark 图标
**Then** 弹窗打开，2 个字段预填充：网页标题 + URL（来自当前 Tab）
**And** 弹窗包含注解文本框、快选标签按钮、"保存"和"跳过"按钮
**And** 点击"保存"后 API 调用成功，弹窗关闭，操作 < 1 秒完成

**Given** 用户点击"跳过"
**When** 跳过注解直接保存（FR10）
**Then** 书签以空注解保存，弹窗关闭

### Story 3.2: 注解填写与快选标签

As a 已登录用户,
I want 在收藏时添加注解说明和分类标签,
So that 未来能快速回忆"为什么收藏这个页面"。

**Acceptance Criteria:**

**Given** 插件弹窗已打开
**When** 用户在注解框中输入文字
**Then** 注解限制 140 字，超出时提示并阻止提交

**Given** 插件弹窗已打开
**When** 用户点击"学习资料"/ "工作参考"/ "灵感收藏" 快选标签中的一个
**Then** 标签高亮选中（可多选），提交时随书签一起保存

### Story 3.3: 离线暂存与自动同步

As a 用户,
I want 在没有网络时也能继续收藏书签,
So that 网络问题不会打断我的收藏习惯。

**Acceptance Criteria:**

**Given** 用户在无网络环境下点击收藏
**When** 提交书签表单
**Then** 书签数据写入 Chrome Storage 离线队列（最多存 7 天 / 100 条）
**And** 弹窗显示"已暂存，待网络恢复后同步"的提示

**Given** 网络恢复
**When** Service Worker 检测到网络重连
**Then** 自动将离线队列中的所有书签上传至服务器
**And** 同步成功后清空本地队列

### Story 3.4: URL 去重

As a 用户,
I want 系统自动阻止我在 24 小时内重复收藏同一 URL,
So that 我的书签库不会产生冗余数据。

**Acceptance Criteria:**

**Given** 用户尝试收藏一个 24 小时内已收藏的 URL
**When** 提交收藏表单
**Then** 弹窗提示"你在 [X 小时] 前已收藏过这个页面"
**And** 提供"查看原书签"和"覆盖更新"两个选项

### Story 3.5: 新用户 Onboarding 引导（FR22）

As a 新用户,
I want 安装插件后看到简短的引导流程,
So that 我能快速了解 Thoughtmark 的核心使用方式。

**Acceptance Criteria:**

**Given** 用户首次安装并登录插件
**When** 首次打开插件弹窗
**Then** 展示 3 步引导：步骤 1（介绍一键收藏）→ 步骤 2（说明注解价值）→ 步骤 3（展示时间轴入口）
**And** 每步有"下一步"和"跳过引导"选项
**And** 完成引导后标记为已完成，不再重复展示

## Epic 4: 时间轴与知识库浏览

用户可以在 Web App 中以时间轴形式浏览收藏历史，感受"思维轨迹"的价值。

### Story 4.1: 时间轴基础视图

As a 已登录用户,
I want 在 Web App 中看到我的所有书签按时间倒序排列,
So that 我能直观回顾自己的知识收藏历程。

**Acceptance Criteria:**

**Given** 已登录用户访问 Web App
**When** 页面加载完成
**Then** 显示时间轴视图，书签按收藏时间倒序排列
**And** 每个书签展示：标题、URL 域名、收藏时间（相对表示，如"3 天前"）、注解摘要（最多 2 行）
**And** 支持无限滚动分页（每页 20 条），首屏 < 2 秒加载

### Story 4.2: 时间范围筛选

As a 已登录用户,
I want 按时间范围筛选我的书签收藏,
So that 我能快速定位特定时期的收藏记录。

**Acceptance Criteria:**

**Given** 用户在时间轴页面
**When** 选择"今天"/"本周"/"本月"或输入自定义日期范围
**Then** 时间轴立即筛选显示该时间范围内的书签（无需刷新页面）
**And** 显示当前筛选条件和结果数量
**And** 清空筛选恢复全量视图

### Story 4.3: 书签详情查看与编辑

As a 已登录用户,
I want 点击书签查看完整详情，并能编辑和删除,
So that 我能管理和完善我的知识库。

**Acceptance Criteria:**

**Given** 用户点击时间轴中的书签卡片
**When** 书签详情面板展开（侧边栏或弹窗）
**Then** 显示完整信息：URL（可点击打开）、标题、完整注解、标签、收藏时间

**Given** 用户在书签详情中修改注解或标签
**When** 点击保存
**Then** 更新成功并同步到时间轴视图

**Given** 用户点击删除书签
**When** 确认删除对话框
**Then** 书签从时间轴中消失，数据库记录删除

### Story 4.4: 手动主题标签管理

As a 已登录用户,
I want 手动给书签添加或修改主题标签,
So that 我可以自己组织知识分类，不完全依赖 AI。

**Acceptance Criteria:**

**Given** 用户在书签详情页
**When** 点击标签输入框并输入标签名（回车确认）
**Then** 新标签添加到该书签，标签在时间轴视图中可见

**Given** 用户想删除已有标签
**When** 点击标签旁的 "×" 删除按钮
**Then** 标签从书签移除

## Epic 5: AI 聚类与智能知识整理

用户可以看到 AI 自动归纳的主题分组，手动调整结果，体验"第二大脑"的核心差异化价值。

### Story 5.1: 首次 AI 聚类触发与通知

As a 已登录用户,
I want 在积累足够书签后，系统自动触发 AI 聚类并通知我,
So that 我不需要手动发起，体验无缝的智能整理。

**Acceptance Criteria:**

**Given** 用户已收藏 20 条或以上带注解的书签
**When** 第 20 条带注解书签保存成功
**Then** 后端自动向 BullMQ 队列提交 AI 聚类任务
**And** 用户收到应用内通知："AI 正在帮你整理主题，稍后查看结果"
**And** 聚类任务在后台异步执行，不阻塞用户操作

**Given** AI 聚类任务完成
**When** 结果写入数据库
**Then** 用户收到通知："你的书签已按主题整理好了，点击查看"（FR24）

### Story 5.2: 聚类结果展示

As a 已登录用户,
I want 查看 AI 生成的书签主题分组,
So that 我能一目了然看到我的知识结构。

**Acceptance Criteria:**

**Given** AI 聚类已完成、用户打开聚类视图
**When** 页面加载
**Then** 以卡片形式展示每个主题分组：主题名称、书签数量、最近更新时间
**And** 点击主题卡片展开，查看该组内所有书签
**And** 每个书签显示标题 + 注解摘要

### Story 5.3: 手动调整聚类结果

As a 已登录用户,
I want 合并、拆分或重命名 AI 生成的主题分组,
So that AI 结果与我自己的认知框架对齐。

**Acceptance Criteria:**

**Given** 用户在聚类视图
**When** 拖拽一个书签到另一个主题分组
**Then** 书签移入目标分组，原分组书签数减一

**Given** 用户点击某个主题的"重命名"
**When** 输入新名称并确认
**Then** 主题名称更新，页面即时刷新

**Given** 用户点击"合并主题"并选择两个主题
**When** 确认合并
**Then** 两个主题的书签合并到一个新主题

### Story 5.4: 重激活提醒（FR23）

As a 系统,
I want 在用户连续 7 天未使用插件时，自动发送重激活邮件,
So that 提高用户留存率。

**Acceptance Criteria:**

**Given** 用户连续 7 天未有任何书签收藏记录
**When** 每日定时 BullMQ 任务运行
**Then** 向该用户发送重激活提醒邮件（邮件主题：你的 XX 条书签在等你回来）
**And** 同一用户 7 天内不重复发送
**And** 用户重新收藏后重置计时器

### Story 5.5: 记忆推送（FR31 - V2）

As a 系统,
I want 在用户超过 14 天未查看某主题聚类时，发送提醒,
So that 帮助用户定期回顾，实现知识内化。

**Acceptance Criteria:**

**Given** 用户某主题聚类超过 14 天未被访问
**When** 每日定时任务检查
**Then** 向用户发送推送提醒（含主题名称和书签数量）
**And** 用户可在设置中关闭此功能
**And** 此功能标记为 V2，MVP 阶段代码实现但 Feature Flag 默认关闭

## Epic 6: 订阅、计费与运营后台

产品具备完整商业化能力，运营管理员可以监控核心指标。

### Story 6.1: 免费层功能限制

As a 系统,
I want 对未订阅用户执行书签数量上限（500 条）和功能限制（无 AI 聚类）,
So that 为 Pro 计划提供升级动力。

**Acceptance Criteria:**

**Given** 未订阅用户已有 500 条书签
**When** 尝试保存第 501 条书签
**Then** API 返回错误，插件弹窗提示"已达免费额度上限，升级 Pro 解锁无限书签"
**And** 提示包含"了解 Pro" CTA 按钮

**Given** 未订阅用户
**When** 尝试访问 AI 聚类功能
**Then** 页面显示 Pro 功能介绍和升级引导，不显示聚类内容

### Story 6.2: Pro 订阅购买

As a 用户,
I want 订阅 Pro 计划以解锁所有高级功能,
So that 我可以无限收藏并享受 AI 智能整理。

**Acceptance Criteria:**

**Given** 用户点击"升级 Pro"
**When** 进入 Stripe Checkout 流程并完成支付
**Then** Stripe Webhook 触发，用户订阅状态更新为 Pro
**And** 用户立即解锁：无限书签 + AI 聚类功能
**And** 订阅页面显示"已成功订阅 Pro 计划"

### Story 6.3: 订阅状态管理

As a 已订阅用户,
I want 查看订阅状态并能随时取消,
So that 我对账单有完整控制权。

**Acceptance Criteria:**

**Given** Pro 用户访问账户设置
**When** 查看订阅信息
**Then** 显示：当前计划（Pro）、下次计费日期、月费金额

**Given** 用户点击"取消订阅"
**When** 确认取消
**Then** 计划设置为"订阅期结束时取消"，期间仍享有 Pro 权益
**And** 到期后账户降级为免费层

### Story 6.4: 运营仪表盘

As a 运营管理员,
I want 查看产品核心指标仪表盘,
So that 我能基于数据做产品决策。

**Acceptance Criteria:**

**Given** 管理员访问 `/admin` 路由（需验证管理员权限）
**When** 仪表盘加载
**Then** 显示以下指标（过去 30 天）：
- WAU（周活用户数）
- 注解填写率（有注解书签 / 总书签）
- 新用户注册数
- Pro 订阅数 / 转化率

**And** 数据来源 PostHog 埋点 + 数据库查询
**And** 页面每小时自动刷新数据

### Story 6.5: 运营邮件（FR30）

As a 运营管理员,
I want 向指定用户群体发送邮件通知,
So that 我能进行产品公告、功能推广等运营活动。

**Acceptance Criteria:**

**Given** 管理员在运营后台
**When** 选择目标用户群（全部用户 / 免费用户 / Pro 用户）、填写邮件主题和正文并发送
**Then** 邮件通过 BullMQ 队列批量发送，避免并发超限
**And** 仪表盘显示发送进度（已发送 N / 总计 N）
**And** 每次发送记录日志（时间、目标人群、发件人）

