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
import ThemeToggle from "@/components/ThemeToggle";

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
  const [, setPlan] = useState<string>("free");

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
      <div className="flex min-h-screen items-center justify-center bg-tm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-tm-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tm">
      <header className="sticky top-0 z-10 border-b border-tm bg-tm2-80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-tm">
            🧠 AI 主题整理
          </h1>
          <div className="flex items-center gap-3">
            <a href="/timeline" className="text-xs text-tm-accent hover:text-tm-accent-h">
              ← 返回时间轴
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {/* Story 6.1: 免费用户 Pro 引导 */}
        {clusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-tm p-8 text-center">
            <p className="text-sm text-tm-muted">
              还没有聚类结果。收藏 20 条以上带注解的书签后，AI 会自动为你整理主题。
            </p>
          </div>
        ) : (
          clusters.map((cluster, i) => (
            <div
              key={cluster.id}
              className="overflow-hidden rounded-xl border border-tm bg-tm2 card-shadow transition-all duration-200 hover:border-tm-h hover:card-shadow-hover animate-fadeInUp"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* 卡片头部 */}
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => toggleExpand(cluster.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`cluster-dot cluster-dot-${(i % 3) + 1}`} />
                  {editing === cluster.id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(cluster.id)}
                        className="rounded-md border border-tm bg-tm-card px-2 py-1 text-sm text-tm outline-none focus:border-tm-accent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(cluster.id)}
                        className="text-xs text-tm-accent"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-xs text-tm-muted"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-[15px] font-semibold text-tm">
                      {cluster.name}
                    </h3>
                  )}
                  <p className="mt-0.5 text-xs text-tm-muted">
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
                    className="text-xs text-tm-muted hover:text-tm2"
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleMerge(cluster.id)}
                    className="text-xs text-tm-muted hover:text-tm2"
                    title="合并"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => handleDelete(cluster.id)}
                    className="text-xs text-tm-muted hover:text-tm-error"
                    title="删除"
                  >
                    🗑️
                  </button>
                  <span className="text-tm-muted">
                    {expanded.has(cluster.id) ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* 展开的书签列表 */}
              {expanded.has(cluster.id) && (
                <div className="border-t border-tm">
                  {cluster.bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="border-b border-tm-50 px-4 py-3 last:border-b-0 transition-colors duration-150 hover:bg-tm-hover"
                    >
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-tm-accent hover:underline"
                      >
                        {b.title}
                      </a>
                      {b.whySaved && (
                        <p className="mt-0.5 text-xs text-tm-muted italic">
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
