# Story 1.2: 初始化 thoughtmark-extension 项目

Status: done

## Story

As a 开发者,
I want 初始化配置完整的 WXT 浏览器插件项目，包括 React 支持和基础 HTTP 客户端,
So that 我可以立即开始插件功能开发，并与 thoughtmark-web API 联调。

## Acceptance Criteria

1. **Given** 空白工作目录
   **When** 使用 WXT CLI 初始化项目（React + TypeScript 模板）
   **Then** 生成完整 WXT 项目结构，包含 `entrypoints/popup/`、`entrypoints/background.ts`、`entrypoints/content.ts`

2. **Given** 项目已创建
   **When** 配置 `wxt.config.ts`
   **Then** Manifest V3 最小权限：`tabs`（读取 URL）+ `storage`（离线缓存）
   **And** 插件名称设为 "Thoughtmark"

3. **Given** 项目结构已建立
   **When** 创建基础 HTTP 客户端
   **Then** `lib/api.ts` 提供 `apiFetch`/`apiGet`/`apiPost` 方法
   **And** 通过 `VITE_API_BASE_URL` 环境变量配置 API 地址

4. **Given** 所有配置完成
   **When** 运行 `npm run dev`
   **Then** WXT 开发服务器启动，Chrome 可加载插件

## Tasks / Subtasks

- [x] Task 1：初始化 WXT 项目（AC: #1）
  - [x] 升级 Node.js 到 22.20.0（WXT 0.20+ 需要原生 WebSocket 支持）
  - [x] 运行 `npx wxt@0.19 init thoughtmark-extension --template react --pm npm`
  - [x] `npm install` 安装依赖

- [x] Task 2：配置 Manifest 权限（AC: #2）
  - [x] 修改 `wxt.config.ts` 添加 `manifest.permissions: ["tabs", "storage"]`
  - [x] 更新 `package.json` 名称和描述

- [x] Task 3：创建基础 HTTP 客户端（AC: #3）
  - [x] 创建 `lib/api.ts`（apiFetch/apiGet/apiPost）
  - [x] 创建 `.env`（VITE_API_BASE_URL）
  - [x] 创建 `lib/storage.ts` 骨架（Chrome Storage 离线缓存）
  - [x] 创建 `lib/sync.ts` 骨架（离线队列同步）

- [x] Task 4：验证开发环境（AC: #4）
  - [x] `npx tsc --noEmit` 确认 0 类型错误
  - [x] `npm run dev` 确认 WXT dev server 启动成功

## Dev Notes

### 架构硬性约束

1. **WXT 目录结构**：使用 WXT 标准的 `entrypoints/` 目录（非 `src/entrypoints/`），与 architecture.md 一致
2. **API 客户端**：所有插件端请求走 `lib/api.ts` 统一入口
3. **环境变量**：Vite 要求用 `VITE_` 前缀暴露给客户端

### WXT 版本说明

- 初始化使用 `wxt@0.19`（避开 `npx wxt@latest` 的 rolldown 原生绑定问题）
- 实际安装版本为 WXT `0.20.20`（package.json 中 `"wxt": "^0.20.20"`）
- `wxt prepare`（postinstall）在 Node 22 上正常运行

### 目录结构验证清单

```
thoughtmark-extension/
├── entrypoints/
│   ├── popup/          # 收藏弹窗 UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── background.ts   # Service Worker
│   └── content.ts      # Content Script
├── lib/
│   ├── api.ts           # HTTP 客户端
│   ├── storage.ts       # Chrome Storage 骨架
│   └── sync.ts          # 离线同步骨架
├── components/
├── assets/
├── public/
├── wxt.config.ts
├── tsconfig.json
├── package.json
└── .env
```

### References

- Architecture: 组件一 WXT Framework 技术栈决策 [Source: architecture.md#Starter-Template-Evaluation]
- Architecture: thoughtmark-extension 目录结构 [Source: architecture.md#Project-Structure]
- Epic: Story 1.2 AC [Source: epics.md#Story-1.2]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- `npx wxt@latest init` 报 `rolldown MODULE_NOT_FOUND`（原生绑定 Windows 不可用），即使 Node 22 也失败 → 改用 `npx wxt@0.19 init --template react --pm npm` 绕过
- nvm-windows 默认尝试安装 arm64 版 Node → `nvm install 22.20.0 64` 显式指定 64-bit
- `nvm use 22.20.0` 需要管理员权限（修改系统 symlink），在 IDE 终端挂起 → 在 Administrator 终端执行

### Completion Notes List

- 2026-03-20: 全部 4 个 AC 通过。WXT 0.20.20 + React 19.2.4。
- `lib/api.ts` 提供 `apiFetch`/`apiGet`/`apiPost` 三层封装，后续 Story 直接 import 使用。
- `lib/storage.ts` 和 `lib/sync.ts` 为骨架占位，TODO 标记指向 Story 3.3。

### File List

- `wxt.config.ts` — Manifest V3 配置（tabs + storage 权限）
- `package.json` — 更新 name/description
- `lib/api.ts` — 基础 HTTP 客户端
- `lib/storage.ts` — Chrome Storage 离线缓存骨架
- `lib/sync.ts` — 离线队列同步骨架
- `components/.gitkeep` — 共享 UI 组件目录占位
- `.env` — VITE_API_BASE_URL 环境变量
- `entrypoints/popup/` — WXT 模板生成（App.tsx, main.tsx, index.html）
- `entrypoints/background.ts` — WXT 模板生成
- `entrypoints/content.ts` — WXT 模板生成
