/**
 * 时间轴页面（Story 4.1 + 4.2）
 *
 * Web App 的核心页面 — 用户登录后的默认视图
 * Server Component 壳，内嵌 TimelineContent Client Component
 *
 * 🅲 UI 统一：tm-* CSS 变量色系
 */
import TimelineContent from "@/components/timeline/TimelineContent";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Thoughtmark — 知识时间轴",
  description: "回顾你的知识收藏历程",
};

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-tm">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-tm bg-tm2-80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-tm">
            🔖 Thoughtmark
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-tm-muted">知识时间轴</span>
            <NotificationBell />
            <a href="/search" className="text-sm text-tm-muted hover:text-tm2" title="语义搜索">
              🔍
            </a>
            <a href="/graph" className="text-sm text-tm-muted hover:text-tm2" title="知识图谱">
              🕸️
            </a>
            <a href="/clusters" className="text-sm text-tm-muted hover:text-tm2">
              🧠
            </a>
            <a href="/settings" className="text-sm text-tm-muted hover:text-tm2">
              ⚙️
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <TimelineContent />
      </main>
    </div>
  );
}
