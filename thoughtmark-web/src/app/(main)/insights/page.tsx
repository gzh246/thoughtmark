"use client";

/**
 * 深度洞察页面（Story 11.1-11.5）
 *
 * 统一洞察入口：
 * - 11.1 跨文章观点对比
 * - 11.2 知识盲区检测
 * - 11.3 主题深度摘要
 * - 11.4 月度知识回顾
 * - 11.5 写作素材提取
 */
import { useState, useEffect, useCallback } from "react";
import InterestEvolutionChart from "@/components/insights/InterestEvolutionChart";

interface Cluster {
  id: string;
  name: string;
  bookmarkCount: number;
}

type InsightType = "comparison" | "gaps" | "summary" | "material" | "monthly" | "intent" | "evolution" | "learning" | "interest";

export default function InsightsPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [insightType, setInsightType] = useState<InsightType>("comparison");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 加载聚类列表
  useEffect(() => {
    fetch("/api/clusters")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setClusters(json.data);
      })
      .catch(() => {});
  }, []);

  // 请求洞察
  const fetchInsight = useCallback(async () => {
    // C1-C4: 认知分析 API
    if (insightType === "intent") {
      setLoading(true); setResult("");
      try {
        const res = await fetch("/api/insights/intent-patterns", { method: "POST" });
        const json = await res.json();
        setResult(json.data?.content || json.error?.message || "分析失败");
      } catch { setResult("请求失败"); } finally { setLoading(false); }
      return;
    }
    if (insightType === "evolution") {
      if (!selectedCluster) return;
      setLoading(true); setResult("");
      try {
        const res = await fetch("/api/insights/cognitive-evolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clusterId: selectedCluster }) });
        const json = await res.json();
        setResult(json.data?.content || json.error?.message || "分析失败");
      } catch { setResult("请求失败"); } finally { setLoading(false); }
      return;
    }
    if (insightType === "learning") {
      setLoading(true); setResult("");
      try {
        const res = await fetch("/api/insights/learning-path", { method: "POST" });
        const json = await res.json();
        setResult(json.data?.content || json.error?.message || "建议生成失败");
      } catch { setResult("请求失败"); } finally { setLoading(false); }
      return;
    }
    if (insightType === "interest") {
      // Q1: 兴趣演化用 Canvas 图表组件渲染，不走 result 文本流
      return;
    }

    if (insightType === "monthly") {
      setLoading(true);
      setResult("");
      try {
        const res = await fetch("/api/insights/monthly");
        const json = await res.json();
        setResult(json.data?.report || "暂无数据");
      } catch {
        setResult("请求失败");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (insightType === "gaps") {
      setLoading(true);
      setResult("");
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "gaps" }),
        });
        const json = await res.json();
        setResult(JSON.stringify(json.data, null, 2));
      } catch {
        setResult("请求失败");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedCluster) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: insightType, clusterId: selectedCluster }),
      });
      const json = await res.json();
      setResult(json.data?.content || json.data?.result || JSON.stringify(json.data, null, 2));
    } catch {
      setResult("请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [insightType, selectedCluster]);

  const TABS: { key: InsightType; label: string; icon: string }[] = [
    { key: "comparison", label: "跨文章对比", icon: "⚖️" },
    { key: "gaps", label: "盲区检测", icon: "🔍" },
    { key: "summary", label: "主题摘要", icon: "📝" },
    { key: "material", label: "素材提取", icon: "✂️" },
    { key: "monthly", label: "月度报告", icon: "📊" },
    { key: "intent", label: "意图分析", icon: "🧠" },
    { key: "evolution", label: "认知演化", icon: "📈" },
    { key: "learning", label: "学习路径", icon: "🚩" },
    { key: "interest", label: "兴趣演化", icon: "🌟" },
  ];

  const needsCluster = ["comparison", "summary", "material", "evolution"].includes(insightType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tm">深度洞察</h1>
        <p className="mt-1 text-sm text-tm-muted">AI 帮你从收藏中提炼洞察</p>
      </div>

      {/* 功能 Tab */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setInsightType(tab.key); setResult(""); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              insightType === tab.key
                ? "bg-tm-accent text-white"
                : "bg-tm2 text-tm-muted hover:text-tm2"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 聚类选择（对比/摘要/素材需要） */}
      {needsCluster && (
        <div>
          <label className="mb-2 block text-xs font-medium text-tm-muted">
            选择聚类主题
          </label>
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="w-full rounded-xl border border-tm bg-tm2 px-3 py-2 text-sm text-tm outline-none focus:border-tm-accent"
          >
            <option value="">请选择...</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{c.bookmarkCount} 篇）
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 执行按钮 */}
      <button
        onClick={fetchInsight}
        disabled={loading || (needsCluster && !selectedCluster)}
        className="rounded-xl bg-tm-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {loading ? "AI 分析中..." : "🤖 生成洞察"}
      </button>

      {/* 结果展示 */}
      {result && (
        <div className="rounded-xl border border-tm bg-tm2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-tm-accent">
              🤖 AI 洞察结果
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="rounded-lg bg-tm-accent-sub px-2.5 py-1 text-xs text-tm-accent hover:opacity-80 transition-opacity"
            >
              📋 复制
            </button>
            {/* B8: 导出为 .md 文件 */}
            <button
              onClick={() => {
                const blob = new Blob([result], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `thoughtmark-insight-${insightType}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg bg-tm-accent-sub px-2.5 py-1 text-xs text-tm-accent hover:opacity-80 transition-opacity"
            >
              ⬇️ 下载 .md
            </button>
          </div>
          <div className="whitespace-pre-wrap text-sm text-tm leading-relaxed">
            {result}
          </div>
        </div>
      )}

      {/* Q1: 兴趣演化 Canvas 图表（直接渲染，不走 result 文本流） */}
      {insightType === "interest" && (
        <div className="rounded-xl border border-tm bg-tm2 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-tm-accent">
              🌟 兴趣演化时间线
            </span>
            <span className="text-[10px] text-tm-muted">
              各主题月度收藏密度变化趋势
            </span>
          </div>
          <InterestEvolutionChart />
        </div>
      )}
    </div>
  );
}
