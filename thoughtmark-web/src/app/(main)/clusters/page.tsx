"use client";

/**
 * AI 主题聚类页面（Story 5.2 + 5.3）
 *
 * 功能：
 * - 主题卡片列表（名称、书签数量、最近更新时间）
 * - 点击展开查看书签
 * - Story 5.3: 主题重命名 / 删除 / 合并
 */
import { useState, useEffect } from "react";

interface ClusterBookmark {
  id: string;
  title: string;
  url: string;
  whySaved: string | null;
  createdAt: string;
}

interface Cluster {
  id: string;
  name: string;
  bookmarkCount: number;
  updatedAt: string;
  bookmarks: ClusterBookmark[];
}

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    checkSubscription();
    fetchClusters();
  }, []);

  // Story 6.1: 检查订阅状态
  const checkSubscription = async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const json = await res.json();
        setPlan(json.data.plan);
      }
    } catch {
      // 默认 free
    }
  };

  const fetchClusters = async () => {
    try {
      const res = await fetch("/api/clusters");
      if (res.ok) {
        const json = await res.json();
        setClusters(json.data);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // Story 5.3: 重命名
  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/clusters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      setClusters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editName } : c))
      );
      setEditing(null);
    }
  };

  // Story 5.3: 删除
  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此主题？书签不会被删除。")) return;
    const res = await fetch(`/api/clusters/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClusters((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // Story 5.3: 合并
  const handleMerge = async (sourceId: string) => {
    const targetName = prompt("输入要合并到的目标主题名称:");
    if (!targetName) return;
    const target = clusters.find((c) => c.name === targetName && c.id !== sourceId);
    if (!target) {
      alert("目标主题不存在");
      return;
    }
    const res = await fetch("/api/clusters/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId: target.id }),
    });
    if (res.ok) {
      fetchClusters(); // 重新加载
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            🧠 AI 主题整理
          </h1>
          <a href="/timeline" className="text-xs text-indigo-500 hover:text-indigo-600">
            ← 返回时间轴
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {/* Story 6.1: 免费用户 Pro 引导 */}
        {plan !== "pro" && clusters.length > 0 ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-8 text-center dark:border-indigo-800 dark:bg-indigo-950/50">
            <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              🔒 AI 主题整理是 Pro 专属功能
            </h2>
            <p className="mt-2 text-sm text-indigo-600/70 dark:text-indigo-400/70">
              升级 Pro 计划，解锁 AI 智能聚类、无限书签收藏等高级功能
            </p>
            <a
              href="/settings"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              了解 Pro →
            </a>
          </div>
        ) : clusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-400">
              还没有聚类结果。收藏 20 条以上带注解的书签后，AI 会自动为你整理主题。
            </p>
          </div>
        ) : (
          clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* 卡片头部 */}
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => toggleExpand(cluster.id)}
              >
                <div className="flex-1">
                  {editing === cluster.id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(cluster.id)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(cluster.id)}
                        className="text-xs text-indigo-500"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-xs text-zinc-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {cluster.name}
                    </h3>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {cluster.bookmarkCount} 条书签 · 更新于{" "}
                    {new Date(cluster.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>

                {/* Story 5.3: 操作按钮 */}
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditing(cluster.id);
                      setEditName(cluster.name);
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleMerge(cluster.id)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                    title="合并"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => handleDelete(cluster.id)}
                    className="text-xs text-zinc-400 hover:text-red-500"
                    title="删除"
                  >
                    🗑️
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-600">
                    {expanded.has(cluster.id) ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* 展开的书签列表 */}
              {expanded.has(cluster.id) && (
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  {cluster.bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="border-b border-zinc-50 px-4 py-2.5 last:border-b-0 dark:border-zinc-800/50"
                    >
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {b.title}
                      </a>
                      {b.whySaved && (
                        <p className="mt-0.5 text-xs text-zinc-400 italic">
                          &ldquo;{b.whySaved}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
