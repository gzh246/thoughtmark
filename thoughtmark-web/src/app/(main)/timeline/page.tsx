/**
 * 时间轴页面（Story 4.1 + 4.2）
 *
 * Web App 的核心页面 — 用户登录后的默认视图
 * Server Component 壳，内嵌 TimelineContent Client Component
 */
import TimelineContent from "@/components/timeline/TimelineContent";

export const metadata = {
  title: "Thoughtmark — 知识时间轴",
  description: "回顾你的知识收藏历程",
};

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            🔖 Thoughtmark
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">知识时间轴</span>
            <a href="/clusters" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              🧠
            </a>
            <a href="/settings" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              ⚙️
            </a>
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

