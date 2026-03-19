# Story 1.3: 配置 GitHub 仓库与 CI/CD

Status: done

## Story

As a 开发者,
I want 自动化的代码质量检查和持续集成流程,
So that 所有代码提交都经过一致性验证，避免手动遗漏。

## Acceptance Criteria

1. **Given** 项目代码已就绪
   **When** 创建 GitHub 仓库
   **Then** Monorepo 仓库 `thoughtmark` 包含 `thoughtmark-web/` 和 `thoughtmark-extension/` 两个子项目
   **And** `architecture.md` 更新为 Monorepo 策略

2. **Given** GitHub 仓库已创建
   **When** 推送代码到 `master` 分支
   **Then** GitHub Actions workflow 自动运行
   **And** Web Job: `prisma generate` + `tsc --noEmit` + `npm run lint`
   **And** Extension Job: `tsc --noEmit`

3. **Given** CI 配置完成
   **When** 首次推送触发 CI
   **Then** 两个 Job 均通过（绿色 ✅）

## Tasks / Subtasks

- [x] Task 1：更新架构文档（AC: #1）
  - [x] 修改 `architecture.md`："双代码仓" → Monorepo
  - [x] 添加 Monorepo 顶层目录结构说明

- [x] Task 2：创建 GitHub 仓库（AC: #1）
  - [x] 安装 `gh` CLI（`winget install GitHub.cli`）
  - [x] `gh auth login`（用户登录）
  - [x] 初始化 Git 仓库（`git init`）
  - [x] 创建根目录 `README.md` 和 `.gitignore`
  - [x] 修复 `thoughtmark-web/.git` submodule 问题（删除子目录 `.git`）
  - [x] `gh repo create thoughtmark --public --source . --push`

- [x] Task 3：配置 GitHub Actions CI（AC: #2, #3）
  - [x] 创建 `.github/workflows/ci.yml`
  - [x] 配置 Web Job: Node 22 + npm ci + prisma generate + tsc + lint
  - [x] 配置 Extension Job: Node 22 + npm ci + tsc
  - [x] 修正分支名 `main` → `master`（匹配实际默认分支）
  - [x] 推送并验证 CI 通过

## Dev Notes

### 架构决策：Monorepo

原 architecture.md 设计为"双代码仓"，但 MVP 阶段单人开发改为 Monorepo：
- 一次 PR 可同时修改 web 和 extension
- 一套 CI/CD 配置
- 简化版本管理

### CI Pipeline 设计

```yaml
jobs:
  web:        # prisma generate → tsc → lint
  extension:  # tsc
```

两个 Job 并行运行，互不依赖。Node 22 + npm cache。

### References

- Architecture: Monorepo 策略 [Source: architecture.md#Project-Structure]
- Epic: Story 1.3 AC [Source: epics.md#Story-1.3]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- `thoughtmark-web/` 被 Git 识别为 submodule（mode 160000），因为内含 `create-next-app` 生成的 `.git/` 目录 → 删除后重新 add
- `git push origin main` 失败：默认分支为 `master` 非 `main` → CI yml 分支名修正
- `gh` CLI 安装后 IDE 终端找不到命令 → 刷新 PATH: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + ...`
- `gh repo create --push` 失败：无 commits → 先 commit 再 create

### Completion Notes List

- 2026-03-20: 全部 3 个 AC 通过。仓库 `gzh246/thoughtmark`（Public）。
- CI 首次运行结果：Web 25s + Extension 19s = 总 30s，全部通过 ✅。

### File List

- `.github/workflows/ci.yml` — GitHub Actions CI 配置
- `.gitignore` — Monorepo 根目录忽略规则
- `README.md` — Monorepo 根目录 README
- `_bmad-output/planning-artifacts/architecture.md` — 更新 Monorepo 策略
