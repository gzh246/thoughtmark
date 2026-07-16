/**
 * 语义搜索页面（Story 9.1）
 *
 * V2 杀手功能 — 用自然语言搜索书签
 * Server Component 壳，内嵌 SearchContent Client Component
 *
 * 🅲 UI 统一：tm-* CSS 变量色系
 */
import SearchContent from "@/components/search/SearchContent";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Thoughtmark — 语义搜索",
  description: "用自然语言搜索你的知识收藏",
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-tm">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-tm bg-tm2-80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-tm">
            🔖 Thoughtmark
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-tm-muted">语义搜索</span>
            <NotificationBell />
            <a href="/timeline" className="text-sm text-tm-muted hover:text-tm2">
              📋
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
        <SearchContent />
      </main>
    </div>
  );
}
