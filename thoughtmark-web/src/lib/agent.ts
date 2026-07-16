/**
 * agent.ts — 轻量 Agentic Loop（Story 14.6）
 *
 * 意图分类 + 工具调用式多步检索
 *
 * 意图类型：
 *   - simple_search : 直接 hybridSearch 返回
 *   - aggregate     : hybridSearch + LLM 聚合摘要
 *   - explore       : Agentic Loop（最多 3 步）
 *   - report        : Agentic Loop（最多 3 步，强调结构化输出）
 *
 * Agentic Loop 工具集：
 *   - semantic_search(query, k)  → hybridSearch()
 *   - time_filter(start, end, k) → 时间过滤向量检索
 *   - topic_cluster(topic)       → 按 cluster_label 查 bookmarks
 *   - summarize(bookmarks[])     → LLM 生成摘要
 */
import { hybridSearch, HybridSearchResult, rerankResults } from "./retrieval"
import { prisma } from "./prisma"
import OpenAI from "openai"

/** 意图类型 */
export type IntentType = "simple_search" | "aggregate" | "explore" | "report"

/** Agentic Loop 的单步工具调用结果 */
interface ToolResult {
  toolName: string
  results: HybridSearchResult[]
  summary?: string
}

/** Agentic 运行最终输出 */
export interface AgentRunResult {
  intent: IntentType
  answer: string
  sources: { bookmarkId: string; title: string; url: string; chunkText: string | null }[]
  steps: number  // 实际执行的 Agentic 步骤数
}

/** 通义千问 Chat 客户端 */
const agentClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

/**
 * 意图分类：对用户查询进行分类，决定使用哪种检索策略
 *
 * @param query - 用户原始查询
 * @returns IntentType
 */
export async function classifyIntent(query: string): Promise<IntentType> {
  try {
    const completion = await agentClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `将用户查询分类为以下类型之一（仅输出类型名，不要解释）：
- simple_search: 简单的词语检索，用户想找某个具体内容
- aggregate: 聚合型查询，用户想了解某个主题的全貌或统计
- explore: 探索型查询，用户想深入理解某个领域，需要多步检索
- report: 报告型查询，用户想生成结构化总结（如月度回顾、主题梳理）

示例：
"机器学习资料" → simple_search
"我最近收藏了哪些 AI 相关内容" → aggregate
"帮我深入了解 RAG 检索增强技术" → explore
"帮我整理这个月的学习收获" → report`,
        },
        { role: "user", content: query },
      ],
      max_tokens: 20,
      temperature: 0,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || "simple_search"
    const validIntents: IntentType[] = ["simple_search", "aggregate", "explore", "report"]
    return validIntents.includes(raw as IntentType) ? (raw as IntentType) : "simple_search"
  } catch {
    console.warn("[Agent] 意图分类失败，默认 simple_search")
    return "simple_search"
  }
}

/**
 * 轻量 Agentic Loop 执行器（Story 14.6）
 *
 * @param query   - 用户查询
 * @param userId  - 用户 ID
 * @param intent  - 已分类的意图
 * @param history - 对话历史（最多 3 轮）
 * @returns       - Agentic 运行结果
 */
export async function runAgentSearch(
  query: string,
  userId: string,
  intent: IntentType,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<AgentRunResult> {
  // ── simple_search: 直接 hybridSearch ──
  if (intent === "simple_search") {
    const results = await hybridSearch(query, userId, { topK: 10 })
    const reranked = await rerankResults(query, results, 5)
    return buildSimpleResult(query, reranked, intent)
  }

  // ── aggregate: hybridSearch + LLM 聚合摘要 ──
  if (intent === "aggregate") {
    const results = await hybridSearch(query, userId, { topK: 10 })
    const reranked = await rerankResults(query, results, 5)
    const answer = await aggregateSummarize(query, reranked)
    return {
      intent,
      answer,
      sources: reranked.map((r) => ({
        bookmarkId: r.bookmarkId,
        title: r.title,
        url: r.url,
        chunkText: r.chunkText,
      })),
      steps: 1,
    }
  }

  // ── explore / report: Agentic Loop（最多 3 步）──
  return runAgenticLoop(query, userId, intent, history)
}

/**
 * Agentic Loop：Plan → Tool → Observe，最多 3 步
 */
async function runAgenticLoop(
  query: string,
  userId: string,
  intent: IntentType,
  _history: { role: "user" | "assistant"; content: string }[]
): Promise<AgentRunResult> {
  void _history
  const MAX_STEPS = 3
  const collectedResults: HybridSearchResult[] = []
  let stepCount = 0

  // 工具集定义
  const tools = {
    /** 语义搜索工具 */
    semantic_search: async (subQuery: string, k = 5): Promise<ToolResult> => {
      const r = await hybridSearch(subQuery, userId, { topK: k })
      collectedResults.push(...r)
      return { toolName: "semantic_search", results: r }
    },

    /** 时间过滤工具 */
    time_filter: async (start: string, end: string, k = 5): Promise<ToolResult> => {
      const rows = await prisma.$queryRawUnsafe<HybridSearchResult[]>(
        `SELECT
          id AS "bookmarkId", url, title,
          why_saved AS "whySaved",
          quick_tags AS "quickTags",
          content_summary AS "contentSummary",
          created_at AS "createdAt",
          NULL AS "chunkText",
          0.5::float AS "rrfScore",
          NULL::int AS "vectorRank",
          NULL::int AS "textRank"
        FROM bookmarks
        WHERE user_id = $1
          AND created_at BETWEEN $2::timestamp AND $3::timestamp
        ORDER BY created_at DESC
        LIMIT $4`,
        userId, start, end, k
      )
      collectedResults.push(...rows)
      return { toolName: "time_filter", results: rows }
    },

    /** 主题聚类工具 */
    topic_cluster: async (topic: string, k = 5): Promise<ToolResult> => {
      const rows = await prisma.$queryRawUnsafe<HybridSearchResult[]>(
        `SELECT
          b.id AS "bookmarkId", b.url, b.title,
          b.why_saved AS "whySaved",
          b.quick_tags AS "quickTags",
          b.content_summary AS "contentSummary",
          b.created_at AS "createdAt",
          NULL AS "chunkText",
          0.5::float AS "rrfScore",
          NULL::int AS "vectorRank",
          NULL::int AS "textRank"
        FROM bookmarks b
        JOIN bookmark_clusters bc ON bc.bookmark_id = b.id
        JOIN clusters c ON c.id = bc.cluster_id
        WHERE b.user_id = $1 AND c.name ILIKE $2
        ORDER BY b.created_at DESC
        LIMIT $3`,
        userId, `%${topic}%`, k
      )
      collectedResults.push(...rows)
      return { toolName: "topic_cluster", results: rows }
    },
  }

  // Plan → Tool → Observe 循环
  for (let step = 0; step < MAX_STEPS; step++) {
    stepCount++

    // Plan：LLM 决定下一步调用哪个工具
    const planPrompt = step === 0
      ? `用户查询：「${query}」\n意图：${intent}\n\n请决定第一步应该调用什么工具来回答这个问题。`
      : `已收集 ${collectedResults.length} 条书签。用户问题「${query}」是否已可回答？若是输出"DONE"，若否请继续调用工具。`

    const planCompletion = await agentClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个智能检索规划器，可用工具：
- semantic_search(query: string, k: number)：语义搜索书签
- time_filter(start: string, end: string, k: number)：按时间过滤书签（ISO 日期格式）
- topic_cluster(topic: string, k: number)：按主题查找书签

只输出 JSON 格式的工具调用：{"tool": "tool_name", "args": {...}}
或者如果已够回答则输出："DONE"`,
        },
        { role: "user", content: planPrompt },
      ],
      max_tokens: 100,
      temperature: 0,
    })

    const planContent = planCompletion.choices[0]?.message?.content?.trim() || "DONE"

    // 如果 LLM 判断已够 → 终止循环
    if (planContent.includes("DONE") || planContent.toUpperCase().includes("DONE")) break

    // 解析工具调用
    try {
      const callMatch = planContent.match(/\{[\s\S]*\}/)
      if (!callMatch) break
      const toolCall: { tool: keyof typeof tools; args: Record<string, unknown> } = JSON.parse(callMatch[0])

      if (toolCall.tool === "semantic_search") {
        await tools.semantic_search(String(toolCall.args.query || query), Number(toolCall.args.k || 5))
      } else if (toolCall.tool === "time_filter") {
        await tools.time_filter(String(toolCall.args.start), String(toolCall.args.end), Number(toolCall.args.k || 5))
      } else if (toolCall.tool === "topic_cluster") {
        await tools.topic_cluster(String(toolCall.args.topic || query), Number(toolCall.args.k || 5))
      }
    } catch {
      break // 解析失败，终止循环
    }
  }

  // 生成最终聚合回答
  const uniqueResults = deduplicateByBookmarkId(collectedResults).slice(0, 10)
  const reranked = await rerankResults(query, uniqueResults, 5)
  const answer = await aggregateSummarize(query, reranked, intent === "report")

  return {
    intent,
    answer,
    sources: reranked.map((r) => ({
      bookmarkId: r.bookmarkId,
      title: r.title,
      url: r.url,
      chunkText: r.chunkText,
    })),
    steps: stepCount,
  }
}

/** 按 bookmarkId 去重（优先保留 rrfScore 更高的） */
function deduplicateByBookmarkId(results: HybridSearchResult[]): HybridSearchResult[] {
  const map = new Map<string, HybridSearchResult>()
  for (const r of results) {
    const existing = map.get(r.bookmarkId)
    if (!existing || r.rrfScore > existing.rrfScore) {
      map.set(r.bookmarkId, r)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.rrfScore - a.rrfScore)
}

/** LLM 聚合摘要：将多条书签内容总结为一段完整回答 */
async function aggregateSummarize(
  query: string,
  results: (HybridSearchResult & { rerankScore?: number })[],
  isReport = false
): Promise<string> {
  if (results.length === 0) return "没有找到与查询相关的书签内容。"

  const contextParts = results.map((r, i) => {
    const snippet = r.chunkText || r.contentSummary || r.title
    return `[来源${i + 1}] ${r.title}\n${snippet.slice(0, 500)}`
  })
  const context = contextParts.join("\n\n---\n\n")

  const systemContent = isReport
    ? `基于提供的书签内容，生成一份结构化的知识报告。
使用 Markdown 格式，包含：主要主题分组、关键要点、学习心得。
限制在 500 字以内。`
    : `基于提供的书签内容，对用户问题「${query}」进行全面综合回答。
用中文输出，300 字以内，末尾列出引用来源。`

  try {
    const completion = await agentClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: `上下文：\n${context}\n\n问题：${query}` },
      ],
      max_tokens: 800,
      temperature: 0.3,
    })
    return completion.choices[0]?.message?.content || "无法生成回答。"
  } catch {
    return `基于您的书签，找到了 ${results.length} 条相关内容，请查看来源了解详情。`
  }
}

/** 构建 simple_search 类型的结果（直接返回，不做 LLM 聚合） */
function buildSimpleResult(
  _query: string,
  results: (HybridSearchResult & { rerankScore?: number })[],
  intent: IntentType
): AgentRunResult {
  const answer =
    results.length > 0
      ? `找到 ${results.length} 条相关书签，最相关的是：${results[0].title}。`
      : "没有找到相关书签内容。"

  return {
    intent,
    answer,
    sources: results.map((r) => ({
      bookmarkId: r.bookmarkId,
      title: r.title,
      url: r.url,
      chunkText: r.chunkText,
    })),
    steps: 0,
  }
}
