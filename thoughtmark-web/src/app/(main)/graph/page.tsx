/**
 * 知识图谱页面（Story 10.2）
 *
 * D3.js 力导向图展示知识结构
 * Server Component 壳，内嵌 KnowledgeGraph Client Component
 *
 * 🅲 UI 统一：tm-* CSS 变量色系
 */
import KnowledgeGraph from "@/components/graph/KnowledgeGraph";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import InterestEvolutionChart from "@/components/insights/InterestEvolutionChart";

export const metadata = {
  title: "Thoughtmark — 知识图谱",
  description: "可视化你的知识结构",
};

export default function GraphPage() {
  return (
    <div className="min-h-screen bg-tm">
      <header className="sticky top-0 z-10 border-b border-tm bg-tm2-80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-tm">
            🔖 Thoughtmark
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-tm-muted">知识图谱</span>
            <NotificationBell />
            <a href="/timeline" className="text-sm text-tm-muted hover:text-tm2">📋</a>
            <a href="/search" className="text-sm text-tm-muted hover:text-tm2">🔍</a>
            <a href="/clusters" className="text-sm text-tm-muted hover:text-tm2">🧠</a>
            <a href="/settings" className="text-sm text-tm-muted hover:text-tm2">⚙️</a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <KnowledgeGraph />

        {/* Q2: 兴趣演化时间线（与图谱联动） */}
        <div className="mt-6 rounded-xl border border-tm bg-tm2 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-tm-accent">
              📈 兴趣演化
            </span>
            <span className="text-[10px] text-tm-muted">
              各主题月度收藏趋势 — 与上方图谱时间滑块联动
            </span>
          </div>
          <InterestEvolutionChart />
        </div>
      </main>
    </div>
  );
}
