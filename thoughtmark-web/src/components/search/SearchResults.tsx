"use client";

/**
 * 语义搜索结果组件 — V3 升级（Story 14.2 / 14.3 前端对接）
 *
 * V3 变化：
 *   - similarity → rrfScore（RRF 融合分数，无固定上限，用色阶相对化）
 *   - 新增 chunkText：展示命中的具体段落（FR59）
 *   - relevanceHint 保留
 */
import { timeAgo, extractDomain } from "@/lib/utils";

/** 与 GET /api/search V3 响应对齐 */
export interface SearchResultV3 {
  id: string;
  url: string;
  title: string;
  whySaved: string | null;
  quickTags: string[];
  contentSummary: string | null;
  createdAt: string;
  /** RRF 融合分数（V3，取代 similarity 余弦相似度） */
  rrfScore: number;
  /** 命中的具体 Chunk 段落（V3 FR59） */
  chunkText: string | null;
  /** AI 相关度说明（可选） */
  relevanceHint?: string;
}

interface SearchResultsProps {
  results: SearchResultV3[];
  query: string;
  total: number;
}

/** RRF score 色阶（相对化：取 results 中最高分为基准） */
function scoreColor(score: number, maxScore: number) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.75) return "bg-green-500/15 text-green-400";
  if (ratio >= 0.45) return "bg-yellow-500/15 text-yellow-400";
  return "bg-tm-accent-sub text-tm-accent";
}

/** RRF score 展示为「相对强度」标签 */
function scoreLabel(score: number, maxScore: number) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.75) return "高相关";
  if (ratio >= 0.45) return "相关";
  return "弱相关";
}

export default function SearchResults({ results, query, total }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl">🔍</p>
        <p className="mt-3 text-sm text-tm-muted">
          未找到与「{query}」相关的书签
        </p>
        <p className="mt-1 text-xs text-tm-muted">
          试试用不同的描述搜索，或切换到「问答」模式
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...results.map((r) => r.rrfScore));

  return (
    <div>
      <p className="mb-4 text-xs text-tm-muted">
        共找到 <span className="font-semibold text-tm">{total}</span> 条相关书签
        <span className="ml-2 text-[10px] opacity-60">（混合检索 + RRF 排序）</span>
      </p>
      <div className="space-y-3">
        {results.map((result) => (
          <article
            key={result.id}
            className="group relative rounded-xl border border-tm bg-tm2 p-4 transition-all hover:bg-tm-hover hover:border-tm-h animate-fadeInUp"
          >
            {/* ── 标题行 ── */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-tm hover:text-tm-accent transition-colors line-clamp-2"
                >
                  {result.title}
                  <span className="ml-1 text-tm-muted">↗</span>
                </a>
                <p className="mt-0.5 text-xs text-tm-muted truncate">
                  {extractDomain(result.url)}
                </p>
              </div>
              {/* 相关度标签（V3：RRF 相对强度） */}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreColor(result.rrfScore, maxScore)}`}
              >
                {scoreLabel(result.rrfScore, maxScore)}
              </span>
            </div>

            {/* ── V3 新增：命中 Chunk 段落（FR59）── */}
            {result.chunkText && (
              <div className="mt-2 rounded-lg bg-tm-accent-sub border-l-2 border-tm-accent px-3 py-2">
                <p className="text-[10px] text-tm-accent font-medium mb-0.5">📌 命中段落</p>
                <p className="text-xs text-tm2 leading-relaxed line-clamp-3">
                  {result.chunkText}
                </p>
              </div>
            )}

            {/* AI 相关度说明 */}
            {result.relevanceHint && (
              <p className="mt-1 text-[10px] text-indigo-400/70">
                💡 {result.relevanceHint}
              </p>
            )}

            {/* AI 摘要（无 chunk 时展示） */}
            {!result.chunkText && result.contentSummary && (
              <p className="mt-2 text-xs text-tm2 leading-relaxed line-clamp-2">
                {result.contentSummary}
              </p>
            )}

            {/* 用户注解 */}
            {result.whySaved && (
              <p className="mt-1.5 text-xs text-tm-muted italic">
                💬 {result.whySaved}
              </p>
            )}

            {/* ── 底部：标签 + 时间 ── */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {result.quickTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-tm-accent-sub px-2 py-0.5 text-[10px] font-medium text-tm-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <time className="text-[10px] text-tm-muted shrink-0">
                {timeAgo(result.createdAt)}
              </time>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
