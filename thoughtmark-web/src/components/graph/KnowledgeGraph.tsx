"use client";

/**
 * D3.js 知识图谱组件（Story 10.2 + 10.3）
 *
 * 力导向图：
 * - 主题（cluster）为大节点
 * - 书签为小节点
 * - 支持拖拽、缩放、点击查看
 * - 时间滑块过滤（Story 10.3）
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface GraphNode {
  id: string;
  type: "cluster" | "bookmark";
  label: string;
  url?: string;
  createdAt?: string;
  size: number;
  // D3 注入的运行时属性
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ clusterCount: 0, bookmarkCount: 0 });
  // Story 10.3: 时间范围
  const [timeRange, setTimeRange] = useState(30); // 默认 30 天
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  // B11: 缩放状态
  const zoomRef = useRef(1);
  // B10: 动画过渡 ref
  const prevNodesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // B6: 知识盲区提示
  const [gaps, setGaps] = useState<{ clusterName: string; suggestion: string }[]>([]);

  // ── 获取图谱数据 ──────────────────────────
  const fetchGraph = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const from = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString();
      const res = await fetch(`/api/graph?from=${from}`);
      if (res.ok) {
        const json = await res.json();
        setGraphData(json.data);
        setMeta(json.meta);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph(timeRange);
  }, [timeRange, fetchGraph]);

  // B6: 加载知识盲区
  useEffect(() => {
    fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "gaps" }) })
      .then(r => r.json())
      .then(json => { if (json.data?.gaps) setGaps(json.data.gaps); })
      .catch(() => {});
  }, []);

  // ── Canvas 力导向图渲染 ────────────────────
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // 简单力导向布局（无需 D3 依赖）
    const nodes = graphData.nodes.map((n) => {
      // B10: 从上一次布局位置开始动画过渡
      const prev = prevNodesRef.current.get(n.id);
      return {
        ...n,
        x: prev?.x ?? Math.random() * width,
        y: prev?.y ?? Math.random() * height,
        vx: 0,
        vy: 0,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links = graphData.links
      .map((l) => ({
        source: nodeMap.get(typeof l.source === "string" ? l.source : l.source.id),
        target: nodeMap.get(typeof l.target === "string" ? l.target : l.target.id),
      }))
      .filter((l) => l.source && l.target) as {
      source: (typeof nodes)[0];
      target: (typeof nodes)[0];
    }[];

    // 模拟力导向
    let animId: number;
    const simulate = () => {
      // 斥力（节点间）
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 300 / (dist * dist);
          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // 引力（连线）
      for (const link of links) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.01;
        link.source.vx += (dx / dist) * force;
        link.source.vy += (dy / dist) * force;
        link.target.vx -= (dx / dist) * force;
        link.target.vy -= (dy / dist) * force;
      }

      // 向心力
      for (const node of nodes) {
        node.vx += (width / 2 - node.x) * 0.001;
        node.vy += (height / 2 - node.y) * 0.001;
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(height - 20, node.y));
      }

      // 绘制（B11: 应用 zoom 缩放）
      const z = zoomRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(z, z);
      ctx.translate(-width / 2, -height / 2);

      // 连线
      ctx.strokeStyle = "rgba(120, 120, 180, 0.2)";
      ctx.lineWidth = 0.5;
      for (const link of links) {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      }

      // 节点
      for (const node of nodes) {
        ctx.beginPath();
        const radius = node.type === "cluster" ? node.size / 2 : 3;
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        if (node.type === "cluster") {
          ctx.fillStyle = "rgba(99, 102, 241, 0.8)";
        } else {
          ctx.fillStyle = "rgba(168, 180, 220, 0.6)";
        }
        ctx.fill();

        // 聚类节点标签
        if (node.type === "cluster") {
          ctx.fillStyle = "rgba(200, 210, 240, 0.9)";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y - radius - 4);
        }
      }

      ctx.restore(); // B11: 恢复 zoom 变换

      // B10: 保存当前节点位置用于下次过渡
      const posMap = new Map<string, { x: number; y: number }>();
      for (const n of nodes) posMap.set(n.id, { x: n.x, y: n.y });
      prevNodesRef.current = posMap;

      animId = requestAnimationFrame(simulate);
    };

    simulate();

    // 鼠标事件：hover 检测
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found: GraphNode | null = null;
      for (const node of nodes) {
        const r = node.type === "cluster" ? node.size / 2 : 3;
        if (Math.hypot(node.x - mx, node.y - my) < r + 3) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    // 点击：打开书签链接
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (const node of nodes) {
        const r = node.type === "cluster" ? node.size / 2 : 3;
        if (Math.hypot(node.x - mx, node.y - my) < r + 3 && node.url) {
          window.open(node.url, "_blank");
          break;
        }
      }
    };

    // B11: 滚轮缩放
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(5, zoomRef.current * factor));
      zoomRef.current = newZoom;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [graphData]);

  return (
    <div>
      {/* Story 10.3: 时间滑块 */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-xs text-tm-muted">时间范围</label>
        <input
          type="range"
          min={7}
          max={365}
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="text-xs text-tm-muted w-16 text-right">
          {timeRange} 天
        </span>
      </div>

      {/* 统计 */}
      <div className="mb-3 flex gap-4 text-xs text-tm-muted">
        <span>📊 {meta.clusterCount} 个主题</span>
        <span>🔖 {meta.bookmarkCount} 条书签</span>
      </div>

      {/* 图谱画布 */}
      <div className="relative rounded-xl border border-tm bg-tm2 overflow-hidden" style={{ height: 500 }}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-tm-muted animate-pulse">加载图谱中...</span>
          </div>
        ) : graphData && graphData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center flex-col gap-2">
            <span className="text-3xl">🕸️</span>
            <span className="text-sm text-tm-muted">暂无图谱数据</span>
            <span className="text-xs text-tm-muted">收藏更多书签后会自动生成知识图谱</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        )}

        {/* Hover 提示 */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 rounded-lg bg-tm-card border border-tm px-3 py-2 text-xs text-tm shadow-lg max-w-xs">
            <p className="font-medium">{hoveredNode.label}</p>
            {hoveredNode.type === "bookmark" && hoveredNode.url && (
              <p className="mt-1 text-tm-muted truncate">{hoveredNode.url}</p>
            )}
          </div>
        )}
      </div>

      {/* B6: 知识盲区提示 */}
      {gaps.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-amber-400 mb-2">⚠️ 知识盲区提示</p>
          {gaps.map((g, i) => (
            <p key={i} className="text-xs text-tm-muted mb-1">
              · {g.suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
