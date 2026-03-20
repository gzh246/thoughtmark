# Story 3.5: 新用户 Onboarding 引导（FR22）

Status: in-progress

## Story

As a 新用户,
I want 安装插件后看到简短的引导流程,
So that 我能快速了解 Thoughtmark 的核心使用方式。

## Acceptance Criteria

1. **Given** 用户首次安装并登录插件
   **When** 首次打开插件弹窗
   **Then** 展示 3 步引导：
   - 步骤 1：介绍一键收藏
   - 步骤 2：说明注解价值
   - 步骤 3：展示时间轴入口
   **And** 每步有"下一步"和"跳过引导"选项
   **And** 完成引导后标记为已完成，不再重复展示

## Tasks / Subtasks

- [ ] Task 1: Onboarding 组件
  - [ ] 新建 `Onboarding.tsx` 组件（3 步引导 UI）
  - [ ] 新建 `Onboarding.css` 样式
  - [ ] Chrome Storage 读写 `onboardingCompleted` 标记

- [ ] Task 2: 集成到 App.tsx
  - [ ] 登录后检查 onboarding 状态
  - [ ] 未完成则显示 Onboarding 替代主界面
  - [ ] 完成/跳过后切换到收藏表单

- [ ] Task 3: 验证
  - [ ] tsc --noEmit + lint
  - [ ] Git push + CI

## Dev Notes

### 实现方案
- 引导步骤数据用数组定义（icon + title + description），方便未来扩展
- Chrome Storage key: `onboardingCompleted`（boolean）
- 组件放在 `entrypoints/popup/Onboarding.tsx`（同级 App.tsx）

### References
- Epic: Story 3.5 AC [Source: epics.md#Story-3.5]
- PRD: FR22 新用户引导 [Source: prd.md]

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro (Antigravity)

### File List

### Change Log
