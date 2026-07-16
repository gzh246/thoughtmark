"use client";

/**
 * Q1: 兴趣演化时间线图表组件
 *
 * 用 Canvas 绘制多主题折线图（面积图）
 * 数据来源: GET /api/insights/interest-evolution
 */
import { useEffect, useRef, useState, useCallback } from "react";

interface TimelineEntry {
  month: string;
  [topic: string]: number | string;
}

interface InterestEvolutionChartProps {
  className?: string;
}

// 专业配色方案（最多 12 条线）
const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#e11d48", "#7c3aed",
];

export default function InterestEvolutionChart({ className }: InterestEvolutionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{
    timeline: TimelineEntry[];
    topics: string[];
    months: string[];
    totalBookmarks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 加载数据
  useEffect(() => {
    fetch("/api/insights/interest-evolution")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setData(json.data);
        else setError(json.error?.message || "数据不足");
      })
      .catch(() => setError("请求失败"))
      .finally(() => setLoading(false));
  }, []);

  // Canvas 绘制
  const draw = useCallback(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const { timeline, topics } = data;
    if (timeline.length === 0) return;

    // 布局参数
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // 计算最大值
    let maxVal = 0;
    for (const entry of timeline) {
      for (const topic of topics) {
        const v = Number(entry[topic]) || 0;
        if (v > maxVal) maxVal = v;
      }
    }
    if (maxVal === 0) maxVal = 1;

    // 清除 + 背景
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.fillRect(0, 0, width, height);

    // 网格线
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      // Y 轴标签
      const val = Math.round(maxVal * (1 - i / gridLines));
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(val), paddingLeft - 6, y + 3);
    }

    // X 轴标签
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(timeline.length / 6));
    for (let i = 0; i < timeline.length; i += step) {
      const x = paddingLeft + (i / Math.max(1, timeline.length - 1)) * chartW;
      const label = timeline[i].month.slice(2); // "26-03"
      ctx.fillText(label, x, height - paddingBottom + 16);
    }

    // 绘制每条折线 + 面积
    topics.forEach((topic, topicIdx) => {
      const color = COLORS[topicIdx % COLORS.length];
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < timeline.length; i++) {
        const x = paddingLeft + (i / Math.max(1, timeline.length - 1)) * chartW;
        const v = Number(timeline[i][topic]) || 0;
        const y = paddingTop + chartH - (v / maxVal) * chartH;
        points.push({ x, y });
      }

      // 面积填充
      ctx.beginPath();
      ctx.moveTo(points[0].x, paddingTop + chartH);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.lineTo(points[points.length - 1].x, paddingTop + chartH);
      ctx.closePath();
      ctx.fillStyle = color + "15"; // 低透明度
      ctx.fill();

      // 折线
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        // 贝塞尔平滑
        const cp1x = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cp1x, points[i - 1].y, cp1x, points[i].y, points[i].x, points[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 数据点
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });
  }, [data]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <span className="text-sm text-tm-muted animate-pulse">加载兴趣演化数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <span className="text-xs text-tm-muted">{error}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-64 rounded-xl"
        />
      </div>
      {/* 图例 */}
      {data && (
        <div className="mt-3 flex flex-wrap gap-3">
          {data.topics.map((topic, i) => (
            <span key={topic} className="flex items-center gap-1 text-xs text-tm-muted">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
