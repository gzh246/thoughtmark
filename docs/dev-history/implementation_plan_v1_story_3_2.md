# Story 3.2: 注解填写与快选标签 — 实施计划

Story 3.2 对现有 Story 3.1 的书签收藏功能进行增强：添加后端校验保护和前端视觉反馈优化。

改动量：**小**（3 个文件，共约 35 行代码变更）

## Proposed Changes

### 后端校验（Web App）

#### [MODIFY] [route.ts](file:///c:/Users/a-pc/Desktop/test_demo/thoughtmark-web/src/app/api/bookmarks/route.ts)

在 `POST /api/bookmarks` handler 的参数校验区块（L30-35 后）添加：

1. `whySaved` 长度校验：`whySaved?.length > 140` → 400 `VALIDATION_ERROR`
2. `quickTags` 白名单校验：只允许 `["学习资料", "工作参考", "灵感收藏"]` 中的值

---

### 前端增强（Extension）

#### [MODIFY] [App.tsx](file:///c:/Users/a-pc/Desktop/test_demo/thoughtmark-extension/entrypoints/popup/App.tsx)

1. 字数计数器颜色分级：
   - 0-119 字：默认色
   - 120-139 字：警告色（橙色）
   - 140 字：红色
2. 快选标签选中时显示 ✓ 前缀

#### [MODIFY] [App.css](file:///c:/Users/a-pc/Desktop/test_demo/thoughtmark-extension/entrypoints/popup/App.css)

1. 新增 `.char-warning`（橙色）和 `.char-limit`（红色）样式
2. 增强 `.tag-selected` 动画过渡（`transition: all 0.2s ease`）

---

## Verification Plan

### Automated Tests

```bash
# 1. Web App 类型检查
cd thoughtmark-web && npx tsc --noEmit

# 2. Web App 代码规范
cd thoughtmark-web && npm run lint

# 3. Extension 类型检查
cd thoughtmark-extension && npx tsc --noEmit
```

### Manual Verification

由用户手动验证：
1. 启动 `npm run dev`（Web + Extension），打开插件弹窗
2. 在注解框输入超过 120 字 → 确认字数颜色变橙
3. 输入满 140 字 → 确认变红且无法继续输入
4. 点击快选标签 → 确认出现 ✓ 图标 + 过渡动画
5. 多选/取消 → 确认状态切换正确
