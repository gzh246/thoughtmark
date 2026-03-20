# Story 4.2: 时间范围筛选

Status: in-progress

## Story

As a 已登录用户,
I want 按时间范围筛选我的书签收藏,
So that 我能快速定位特定时期的收藏记录。

## Acceptance Criteria

1. **Given** 用户在时间轴页面
   **When** 选择"今天"/"本周"/"本月"或输入自定义日期范围
   **Then** 时间轴立即筛选显示该时间范围内的书签（无需刷新页面）
   **And** 显示当前筛选条件和结果数量
   **And** 清空筛选恢复全量视图

## Tasks

- [ ] Task 1: TimelineFilter 筛选栏组件
- [ ] Task 2: 集成到 Timeline page，传 from/to 给 TimelineList
- [ ] Task 3: 验证 + commit

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### File List
### Change Log
