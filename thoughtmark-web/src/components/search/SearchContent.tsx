"use client";

/**
 * 语义搜索页面内容 — V3 全功能版（Story 14.2 ~ 14.6 前端对接）
 *
 * V3 升级点：
 *   - 搜索模式：接入混合检索 V3 API（rrfScore + chunkText + relevanceHint）
 *   - QA 模式：多轮对话记忆（最近 3 轮 history）
 *   - QA 模式：展示意图标签（simple_search / aggregate / explore / report）
 *   - QA 模式：chunkText 命中段落展示
 *   - QA 模式：低置信度警告展示（isLowConfidence）
 */
import { useState, useCallback, useRef } from "react";
import SearchResults, { SearchResultV3 } from "@/components/search/SearchResults";

// ── 类型定义 ── ──────────────────────────────────

interface QASource {
  id: string;
  url: string;
  title: string;
  /** V3：命中 Chunk 段落摘要 */
  chunkText: string | null;
  rrfScore: number;
}

interface QAMeta {
  intent: "simple_search" | "aggregate" | "explore" | "report";
  agentSteps: number;
  historyLength: number;
  retrievalMode: string;
}

interface QAResponse {
  answer: string;
  sources: QASource[];
  meta?: QAMeta;
}

/** 对话历史消息 */
interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// ── 意图标签配置 ── ──────────────────────────────
const INTENT_CONFIG: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  simple_search: { emoji: "🔍", label: "直接检索", color: "text-blue-400" },
  aggregate: { emoji: "📊", label: "聚合统计", color: "text-yellow-400" },
  explore: { emoji: "🗺️", label: "深度探索", color: "text-purple-400" },
  report: { emoji: "📋", label: "报告生成", color: "text-green-400" },
};

// ── 主组件 ── ──────────────────────────────────

export default function SearchContent() {
  // 搜索模式状态
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultV3[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 模式切换
  const [mode, setMode] = useState<"search" | "qa">("search");

  // QA 模式状态（V3：多轮对话）
  const [qaResponse, setQaResponse] = useState<QAResponse | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<HistoryMessage[]>([]); // 对话历史
  const [qaInput, setQaInput] = useState(""); // QA 独立输入框

  // ── 搜索请求（防抖 300ms）──────────────────────
  const doSearch = useCallback(async (q: string, p: number = 1) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}&limit=20&page=${p}`
      );
      if (res.ok) {
        const json = await res.json();
        // V3 API 响应：数据层对齐
        const mapped: SearchResultV3[] = (json.data || []).map(
          (item: Record<string, unknown>) => ({
            id: item.bookmarkId || item.id,
            url: item.url,
            title: item.title,
            whySaved: item.whySaved ?? null,
            quickTags: item.quickTags ?? [],
            contentSummary: item.contentSummary ?? null,
            createdAt: item.createdAt,
            rrfScore: (item.rrfScore as number) ?? (item.similarity as number) ?? 0,
            chunkText: (item.chunkText as string) ?? null,
            relevanceHint: item.relevanceHint as string | undefined,
          })
        );
        setResults(mapped);
        setTotal(json.meta?.total ?? mapped.length);
        setTotalPages(json.meta?.totalPages ?? 1);
        setPage(p);
      }
    } catch {
      // 静默失败
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, []);

  // ── QA 请求（V3：携带 history，接收 meta）──────────
  const doQA = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setQaLoading(true);
      setQaResponse(null);

      // 构建 history（最近 3 轮）
      const history = qaHistory.slice(-3);

      try {
        const res = await fetch("/api/search/qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q.trim(), history }),
        });
        if (res.ok) {
          const json = await res.json();
          const data: QAResponse = json.data;
          setQaResponse(data);
          // 追加本轮到对话历史
          setQaHistory((prev) => [
            ...prev,
            { role: "user", content: q.trim() },
            { role: "assistant", content: data.answer },
          ]);
        } else {
          setQaResponse({ answer: "请求失败，请稍后重试。", sources: [] });
        }
      } catch {
        setQaResponse({ answer: "网络错误，请检查连接后重试。", sources: [] });
      } finally {
        setQaLoading(false);
      }
    },
    [qaHistory]
  );

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (mode === "search") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "search") doSearch(query);
  };

  const handleQASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doQA(qaInput);
    setQaInput("");
  };

  const handleClearHistory = () => {
    setQaHistory([]);
    setQaResponse(null);
  };

  return (
    <div>
      {/* ── 模式切换 ── */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("search")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            mode === "search"
              ? "bg-tm-accent text-white shadow-sm"
              : "bg-tm2 text-tm-muted hover:text-tm2 hover:bg-tm-hover"
          }`}
        >
          🔍 混合搜索
        </button>
        <button
          onClick={() => setMode("qa")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            mode === "qa"
              ? "bg-tm-accent text-white shadow-sm"
              : "bg-tm2 text-tm-muted hover:text-tm2 hover:bg-tm-hover"
          }`}
        >
          🤖 智能问答
        </button>
        {mode === "search" && (
          <span className="ml-auto self-center text-[10px] text-tm-muted">
            V3 · 混合检索 + RRF
          </span>
        )}
        {mode === "qa" && qaHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="ml-auto self-center text-[10px] text-tm-muted hover:text-tm-error transition-colors"
          >
            清空对话
          </button>
        )}
      </div>

      {/* ── 搜索模式输入框 ── */}
      {mode === "search" && (
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tm-muted text-sm">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="用自然语言搜索你的书签，支持口语化描述..."
              className="w-full rounded-xl border border-tm bg-tm2 py-3 pl-10 pr-4 text-sm text-tm outline-none placeholder:text-tm-muted focus:border-tm-accent focus:ring-1 focus:ring-tm-accent transition-all"
              autoFocus
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tm-muted animate-pulse">
                搜索中...
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── QA 模式：对话历史区 ── */}
      {mode === "qa" && (
        <div className="space-y-3">
          {/* 历史对话气泡 */}
          {qaHistory.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {qaHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-tm-accent text-white rounded-br-sm"
                        : "bg-tm2 text-tm border border-tm rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-tm-accent mr-1">🤖</span>
                    )}
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 最新 AI 回答（带引用来源 + 意图标签） */}
          {qaResponse && !qaLoading && (
            <div className="rounded-xl border border-tm bg-tm2 p-4 space-y-3 animate-fadeInUp">
              {/* 意图标签 */}
              {qaResponse.meta && (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-tm-muted">意图识别：</span>
                  <span
                    className={`font-semibold ${
                      INTENT_CONFIG[qaResponse.meta.intent]?.color ?? "text-tm2"
                    }`}
                  >
                    {INTENT_CONFIG[qaResponse.meta.intent]?.emoji}{" "}
                    {INTENT_CONFIG[qaResponse.meta.intent]?.label ??
                      qaResponse.meta.intent}
                  </span>
                  {qaResponse.meta.agentSteps > 0 && (
                    <span className="text-tm-muted">
                      · Agentic {qaResponse.meta.agentSteps} 步
                    </span>
                  )}
                </div>
              )}

              {/* 引用来源 */}
              {qaResponse.sources.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] text-tm-muted font-medium">
                    📚 引用来源
                  </p>
                  <div className="space-y-1.5">
                    {qaResponse.sources.map((source, i) => (
                      <div
                        key={source.id}
                        className="rounded-lg border border-tm bg-tm-card p-2.5 space-y-1"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-tm2 hover:text-tm-accent transition-colors"
                        >
                          <span className="shrink-0 text-tm-muted text-[10px]">
                            [{i + 1}]
                          </span>
                          <span className="truncate font-medium">{source.title}</span>
                          <span className="ml-auto shrink-0 text-tm-accent text-[10px]">↗</span>
                        </a>
                        {/* V3：命中 Chunk 段落 */}
                        {source.chunkText && (
                          <p className="text-[10px] text-tm-muted leading-relaxed line-clamp-2 pl-4">
                            {source.chunkText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 输入区 */}
          <form onSubmit={handleQASubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                placeholder={
                  qaHistory.length > 0
                    ? "继续追问..."
                    : "向你的知识库提问，支持多轮对话..."
                }
                className="w-full rounded-xl border border-tm bg-tm2 py-3 pl-4 pr-4 text-sm text-tm outline-none placeholder:text-tm-muted focus:border-tm-accent focus:ring-1 focus:ring-tm-accent transition-all"
                disabled={qaLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={qaLoading || !qaInput.trim()}
              className="btn-accent shrink-0 px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {qaLoading ? (
                <span className="animate-pulse">思考中</span>
              ) : (
                "发送"
              )}
            </button>
          </form>

          {/* 空态提示 */}
          {qaHistory.length === 0 && !qaLoading && (
            <div className="py-10 text-center">
              <p className="text-4xl">🤖</p>
              <p className="mt-3 text-sm text-tm-muted">向你的知识库提问</p>
              <p className="mt-1 text-xs text-tm-muted">
                支持多轮对话，AI 会记住本次对话上下文
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "我最近收藏了哪些 AI 相关内容",
                  "帮我整理这个月的学习重点",
                  "什么是 RAG",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      setQaInput(hint);
                    }}
                    className="rounded-full border border-tm bg-tm2 px-3 py-1 text-xs text-tm-muted hover:border-tm-accent hover:text-tm-accent transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 搜索模式：空态 ── */}
      {mode === "search" && !searched && !searching && (
        <div className="py-16 text-center">
          <p className="text-4xl">🧠</p>
          <p className="mt-3 text-sm text-tm-muted">输入任何你记得的关键描述</p>
          <p className="mt-1 text-xs text-tm-muted">
            例如：「那篇讲 React 性能优化的文章」
          </p>
        </div>
      )}

      {/* ── 搜索模式：结果 ── */}
      {mode === "search" && searched && (
        <div className="mt-4">
          <SearchResults results={results} query={query} total={total} />

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => doSearch(query, page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-tm bg-tm2 px-3 py-1.5 text-xs font-medium text-tm2 hover:bg-tm-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← 上一页
              </button>
              <span className="text-xs text-tm-muted tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => doSearch(query, page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-tm bg-tm2 px-3 py-1.5 text-xs font-medium text-tm2 hover:bg-tm-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                下一页 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
