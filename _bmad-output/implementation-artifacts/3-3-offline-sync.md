# Story 3.3: 离线暂存与自动同步

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 用户,
I want 在没有网络时也能继续收藏书签,
So that 网络问题不会打断我的收藏习惯。

## Acceptance Criteria

1. **Given** 用户在无网络环境下点击收藏
   **When** 提交书签表单
   **Then** 书签数据写入 Chrome Storage 离线队列（最多存 7 天 / 100 条）
   **And** 弹窗显示"已暂存，待网络恢复后同步"的提示

2. **Given** 网络恢复
   **When** Service Worker 检测到网络重连
   **Then** 自动将离线队列中的所有书签上传至服务器
   **And** 同步成功后清空本地队列

## Tasks / Subtasks

- [ ] Task 1: 实现 `lib/storage.ts`（Chrome Storage 离线队列）
  - [ ] `addToOfflineQueue(bookmark)` — 写入离线队列，带时间戳
  - [ ] `getOfflineQueue()` — 获取队列中所有书签
  - [ ] `clearOfflineQueue()` — 清空队列
  - [ ] `removeExpiredItems()` — 清除超过 7 天的项
  - [ ] 队列上限 100 条，超出时丢弃最旧的

- [ ] Task 2: 实现 `lib/sync.ts`（同步逻辑）
  - [ ] `syncOfflineQueue()` — 批量上传队列书签到 API
  - [ ] 对每条书签调用 `apiPost('/bookmarks', ...)`，成功则移除
  - [ ] 全部成功后清空队列

- [ ] Task 3: 实现 `entrypoints/background.ts`（Service Worker）
  - [ ] 导入 `startSyncListener()` 并在启动时调用
  - [ ] 监听 `navigator.onLine` 状态变化
  - [ ] 网络恢复时自动触发 `syncOfflineQueue()`

- [ ] Task 4: 改造 `entrypoints/popup/App.tsx`（离线保存支持）
  - [ ] 网络请求失败时自动走离线保存路径
  - [ ] 离线保存成功后显示"已暂存，待网络恢复后同步"提示
  - [ ] 添加 `.offline-message` CSS 样式

- [ ] Task 5: 验证
  - [ ] Extension `tsc --noEmit` 0 错误
  - [ ] Web `tsc --noEmit` 0 错误
  - [ ] Git push

## Dev Notes

### 架构硬性约束

1. Chrome Manifest V3 Service Worker 无持久后台页 — `background.ts` 用 WXT 的 `defineBackground()`
2. 权限 `storage` 已在 `wxt.config.ts` 配置
3. WXT 提供跨浏览器 `browser.storage.local` API

### 现有骨架分析

**`lib/storage.ts`**（47行）：
- `OfflineBookmark` 接口已定义（url, title, annotation?, tags?, savedAt）
- `OFFLINE_QUEUE_KEY` 常量已定义
- 3 个函数全是 TODO 空壳

**`lib/sync.ts`**（28行）：
- `startSyncListener()` 和 `syncOfflineQueue()` 都是 TODO 空壳

**`entrypoints/background.ts`**（4行）：
- 只有一个 console.log

**`entrypoints/popup/App.tsx`**（208行）：
- `handleSave` 中网络错误直接显示错误消息（L80-82）
- 需要改为：网络错误 → 调用 `addToOfflineQueue()` → 显示暂存成功提示

### 字段映射注意

`OfflineBookmark` 接口用 `annotation` 和 `tags`，但 API 字段是 `whySaved` 和 `quickTags`。
需要在 sync 上传时做字段映射。

### Previous Story Intelligence

- `lib/api.ts` 的 `apiPost` 已封装好
- App.tsx 的 `handleSave` 已有完整的 try/catch + loading 状态管理
- Chrome Storage API 通过 WXT 的 `browser.storage.local` 访问

### Git Intelligence

```
b12c110 feat(bookmark): Story 3.2 - 注解 140 字校验 + 快选标签白名单 + UI 增强
c6d946c feat(bookmark): Story 3.1 - 书签数据模型 + CRUD API + 插件弹窗
```

### References

- PRD: FR11 离线暂存 [Source: prd.md#Bookmark-Capture]
- Architecture: Service Worker 离线队列 [Source: architecture.md#Technical-Constraints]
- Architecture: NFR14 离线缓存最多 7 天 [Source: prd.md#Reliability]
- Epic: Story 3.3 AC [Source: epics.md#Story-3.3]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

### Completion Notes List

### File List

### Change Log
