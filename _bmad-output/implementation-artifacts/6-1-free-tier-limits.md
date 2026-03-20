# Story 6.1: 免费层功能限制

## Story

As a 系统,
I want 对未订阅用户执行书签数量上限（500 条）和功能限制（无 AI 聚类）,
So that 为 Pro 计划提供升级动力。

## Status: in-progress

## Acceptance Criteria

**Given** 未订阅用户已有 500 条书签
**When** 尝试保存第 501 条书签
**Then** API 返回错误，插件弹窗提示"已达免费额度上限，升级 Pro 解锁无限书签"
**And** 提示包含"了解 Pro" CTA 按钮

**Given** 未订阅用户
**When** 尝试访问 AI 聚类功能
**Then** 页面显示 Pro 功能介绍和升级引导，不显示聚类内容

## Implementation Notes

- User model 添加 `plan` 字段（"free" | "pro"）
- POST /api/bookmarks 添加书签上限检查
- clusters/page.tsx 添加免费用户引导页

## Dev Tasks

- [x] Schema: User 添加 plan + planExpiresAt
- [x] API: POST bookmarks 添加 500 上限
- [x] UI: clusters 页面免费层引导
