# Thoughtmark

AI 驱动的书签知识管理工具 — 记录你为什么收藏。

## 项目结构

```
thoughtmark/
├── thoughtmark-web/          # Next.js Web App + API
├── thoughtmark-extension/    # WXT 浏览器插件（Chrome/Firefox/Edge）
├── docs/                     # 开发文档
└── _bmad-output/             # BMAD 规划产出
```

## 快速开始

### Web App

```bash
cd thoughtmark-web
npm install
npm run dev          # http://localhost:3000
```

### 浏览器插件

```bash
cd thoughtmark-extension
npm install
npm run dev          # 自动加载到 Chrome
```

## 技术栈

- **Web**: Next.js 16 + React 19 + Tailwind CSS + Prisma + NextAuth.js
- **插件**: WXT 0.20 + React 19 + TypeScript + Manifest V3
- **数据库**: PostgreSQL（Prisma ORM）
- **缓存/队列**: Redis + BullMQ
