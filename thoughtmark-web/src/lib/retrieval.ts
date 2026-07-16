/**
 * retrieval.ts — 混合检索核心封装（Story 14.2 + Story 14.3）
 *
 * 实现 hybridSearch()：向量检索（Chunk 粒度）+ PostgreSQL 全文检索，
 * 通过 RRF（Reciprocal Rank Fusion）融合排序，返回 Top-K 结果。
 *
 * 算法细节：
 *   - 向量路：bookmark_chunks.embedding cosine 距离 Top-20
 *   - 全文路：to_tsvector('simple') + ts_rank Top-20
 *   - RRF 公式：score(d) = Σ 1 / (k + rank_i)，其中 k=60
 *   - 最终结果：按 RRF score 降序取 Top-K（默认 10）
 *
 * Story 14.3: 新增 HyDE（Hypothetical Document Embeddings）查询增强
 *   - hybridSearch(…, { useHyDE: true }) 时，先用 qwen-plus 生成假设文档再 Embedding
 *   - 关键词检索仍使用原始查询（双路保留）
 *   - HyDE LLM 失败时自动降级至普通向量检索（不报错）
 */
import { prisma } from "./prisma"
import { getEmbeddings } from "./embedding"
import OpenAI from "openai"

/** 混合检索结果类型 */
export interface HybridSearchResult {
  bookmarkId: string
  url: string
  title: string
  whySaved: string | null
  quickTags: string[]
  contentSummary: string | null
  createdAt: Date
  /** 命中的 Chunk 段落文本（FR59：精确到段落级别，而非整篇截取） */
  chunkText: string | null
  /** RRF 融合分数（越大越相关） */
  rrfScore: number
  /** 在向量路的原始排名（null 表示未出现在向量路结果中） */
  vectorRank: number | null
  /** 在全文路的原始排名（null 表示未出现在全文路结果中） */
  textRank: number | null
}

/** 向量路原始行类型 */
interface VectorRow {
  bookmarkId: string
  url: string
  title: string
  whySaved: string | null
  quickTags: string[]
  contentSummary: string | null
  createdAt: Date
  chunkText: string
  similarity: number
}

/** 全文路原始行类型 */
interface TextRow {
  bookmarkId: string
  url: string
  title: string
  whySaved: string | null
  quickTags: string[]
  contentSummary: string | null
  createdAt: Date
  rank: number
}

/** 将 number[] 向量格式化为 pgvector SQL 字面量 */
function vectorToSql(vec: number[]): string {
  return `[${vec.join(",")}]`
}

/**
 * 混合检索主函数（Story 14.2 + 14.3）
 *
 * @param query   - 用户查询字符串
 * @param userId  - 当前用户 ID（仅搜索该用户的书签）
 * @param options - 可选参数：
 *   - topK: 返回数量（默认 10）
 *   - useHyDE: 是否启用 HyDE 查询增强（true=强制启用，false=禁用，undefined=自动判断）
 * @returns       - RRF 融合排序后的结果列表
 */
export async function hybridSearch(
  query: string,
  userId: string,
  options: { topK?: number; useHyDE?: boolean } = {}
): Promise<HybridSearchResult[]> {
  const { topK = 10, useHyDE } = options
  const RRF_K = 60 // RRF 常数，控制高排名文档的权重衰减速度
  const CANDIDATE_POOL = 20 // 每路取 Top-20 候选

  // ── 检查 bookmark_chunks 是否有数据 ──
  const chunkCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM bookmark_chunks bc
     JOIN bookmarks b ON bc.bookmark_id = b.id
     WHERE b.user_id = $1 AND bc.embedding IS NOT NULL`,
    userId
  )
  const hasChunks = Number(chunkCount[0]?.count || 0) > 0

  // ── 降级路径 1：无 Chunk 数据 → 整篇向量搜索（Story 9.1 兜底） ──
  if (!hasChunks) {
    return fallbackWholeDocSearch(query, userId, topK)
  }

  // ── Step 1: 生成查询 Embedding（支持 HyDE 增强）──
  let queryVector: number[] | null = null

  // Story 14.3: HyDE — 短查询（< 10 字）或显式启用时生成假设文档
  const shouldUseHyDE = useHyDE === true || (useHyDE === undefined && query.trim().length < 10)
  if (shouldUseHyDE) {
    try {
      const hydeDoc = await generateHyDE(query.trim())
      const [vec] = await getEmbeddings([hydeDoc])
      if (vec && vec.length > 0) {
        queryVector = vec
        console.log(`[HybridSearch] HyDE 启用，假设文档已生成（${hydeDoc.length}字）`)
      }
    } catch {
      console.warn("[HybridSearch] HyDE 生成失败，降级到普通向量检索")
    }
  }

  // 如果 HyDE 未启用或失败，使用原始查询向量
  if (!queryVector) {
    try {
      const [vec] = await getEmbeddings([query.trim()])
      if (vec && vec.length > 0) queryVector = vec
    } catch {
      console.warn("[HybridSearch] Embedding 生成失败，降级到纯全文检索")
    }
  }

  // ── Step 2A: 向量路（Chunk 粒度） ──
  let vectorRows: VectorRow[] = []
  if (queryVector) {
    const vectorSql = vectorToSql(queryVector)
    try {
      vectorRows = await prisma.$queryRawUnsafe<VectorRow[]>(
        `SELECT
          b.id          AS "bookmarkId",
          b.url, b.title,
          b.why_saved   AS "whySaved",
          b.quick_tags  AS "quickTags",
          b.content_summary AS "contentSummary",
          b.created_at  AS "createdAt",
          bc.chunk_text AS "chunkText",
          1 - (bc.embedding <=> $1::vector) AS similarity
        FROM bookmark_chunks bc
        JOIN bookmarks b ON bc.bookmark_id = b.id
        WHERE b.user_id = $2 AND bc.embedding IS NOT NULL
        ORDER BY bc.embedding <=> $1::vector
        LIMIT $3`,
        vectorSql,
        userId,
        CANDIDATE_POOL
      )
    } catch (e) {
      console.warn("[HybridSearch] 向量路查询失败:", (e as Error).message)
    }
  }

  // ── Step 2B: 全文路（ts_vector）──
  // 使用 'simple' 字典兼容中英文，避免 pg 没有中文词典
  let textRows: TextRow[] = []
  try {
    const escapedQuery = query.trim().split(/\s+/).join(" | ") // OR 逻辑
    textRows = await prisma.$queryRawUnsafe<TextRow[]>(
      `SELECT
        b.id          AS "bookmarkId",
        b.url, b.title,
        b.why_saved   AS "whySaved",
        b.quick_tags  AS "quickTags",
        b.content_summary AS "contentSummary",
        b.created_at  AS "createdAt",
        ts_rank(
          to_tsvector('simple', COALESCE(b.title,'') || ' ' || COALESCE(b.why_saved,'') || ' ' || COALESCE(b.content_summary,'')),
          to_tsquery('simple', $1)
        ) AS rank
      FROM bookmarks b
      WHERE b.user_id = $2
        AND to_tsvector('simple', COALESCE(b.title,'') || ' ' || COALESCE(b.why_saved,'') || ' ' || COALESCE(b.content_summary,''))
            @@ to_tsquery('simple', $1)
      ORDER BY rank DESC
      LIMIT $3`,
      escapedQuery,
      userId,
      CANDIDATE_POOL
    )
  } catch (e) {
    console.warn("[HybridSearch] 全文路查询失败:", (e as Error).message)
  }

  // ── Step 3: RRF 融合 ──
  const scoreMap = new Map<
    string,
    {
      meta: Omit<HybridSearchResult, "rrfScore" | "vectorRank" | "textRank">
      vectorRank: number | null
      textRank: number | null
      rrfScore: number
    }
  >()

  // 处理向量路
  vectorRows.forEach((row, idx) => {
    const rank = idx + 1
    const existing = scoreMap.get(row.bookmarkId)
    const rrfContrib = 1 / (RRF_K + rank)
    if (existing) {
      existing.vectorRank = rank
      existing.rrfScore += rrfContrib
    } else {
      scoreMap.set(row.bookmarkId, {
        meta: {
          bookmarkId: row.bookmarkId,
          url: row.url,
          title: row.title,
          whySaved: row.whySaved,
          quickTags: row.quickTags,
          contentSummary: row.contentSummary,
          createdAt: row.createdAt,
          chunkText: row.chunkText,
        },
        vectorRank: rank,
        textRank: null,
        rrfScore: rrfContrib,
      })
    }
  })

  // 处理全文路
  textRows.forEach((row, idx) => {
    const rank = idx + 1
    const existing = scoreMap.get(row.bookmarkId)
    const rrfContrib = 1 / (RRF_K + rank)
    if (existing) {
      existing.textRank = rank
      existing.rrfScore += rrfContrib
    } else {
      scoreMap.set(row.bookmarkId, {
        meta: {
          bookmarkId: row.bookmarkId,
          url: row.url,
          title: row.title,
          whySaved: row.whySaved,
          quickTags: row.quickTags,
          contentSummary: row.contentSummary,
          createdAt: row.createdAt,
          chunkText: null,
        },
        vectorRank: null,
        textRank: rank,
        rrfScore: rrfContrib,
      })
    }
  })

  // ── Step 4: 排序 + 取 TopK ──
  const sorted = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)

  return sorted.map((entry) => ({
    ...entry.meta,
    rrfScore: entry.rrfScore,
    vectorRank: entry.vectorRank,
    textRank: entry.textRank,
  }))
}

/**
 * 降级方案：无 Chunk 数据时回退到整篇 content_embedding 搜索（Story 9.1 逻辑）
 */
async function fallbackWholeDocSearch(
  query: string,
  userId: string,
  topK: number
): Promise<HybridSearchResult[]> {
  try {
    const [queryVector] = await getEmbeddings([query.trim()])
    if (!queryVector || queryVector.length === 0) return []

    const vectorSql = vectorToSql(queryVector)
    const rows = await prisma.$queryRawUnsafe<
      (Omit<HybridSearchResult, "chunkText" | "rrfScore" | "vectorRank" | "textRank"> & {
        similarity: number
      })[]
    >(
      `SELECT
        id AS "bookmarkId", url, title,
        why_saved AS "whySaved",
        quick_tags AS "quickTags",
        content_summary AS "contentSummary",
        created_at AS "createdAt",
        1 - (content_embedding <=> $1::vector) AS similarity
      FROM bookmarks
      WHERE user_id = $2 AND content_embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT $3`,
      vectorSql,
      userId,
      topK
    )

    return rows.map((r, idx) => ({
      ...r,
      chunkText: null,
      rrfScore: r.similarity,
      vectorRank: idx + 1,
      textRank: null,
    }))
  } catch {
    return []
  }
}

/**
 * Story 14.3: HyDE — 生成假设性回答文档
 *
 * 原理：对于模糊的短查询，LLM 先生成一篇「假副文章」回答这个问题，
 * 再对假副文章做 Embedding，语义比原始短查询更丰富，提升向量检索的覆盖率。
 *
 * 降级：LLM 调用失败时返回原始 query，调用方捕获错误后使用原始向量。
 *
 * @param query - 用户原始查询
 * @returns     - 假设内容文章（约 200 字）
 */
async function generateHyDE(query: string): Promise<string> {
  const hydeClient = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || "",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  })

  const response = await hydeClient.chat.completions.create({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content:
          "你是一个知识库内容模拟器。用户正在搜索某个主题的内容，请模拟写一段约 200 字的书签笔记摘要，" +
          "该摘要应属于一篇与用户查询高度相关的网页。只输出摘要内容，不要添加任何其他文字。",
      },
      {
        role: "user",
        content: query,
      },
    ],
    max_tokens: 300,
    temperature: 0.3, // 较低 temperature，确保内容聚焦
  })

  return response.choices[0]?.message?.content?.trim() || query
}

/**
 * Story 14.5: LLM Re-ranking — 对候选结果进行相关性重排序
 *
 * 对 hybridSearch 返回的 Top-N 候选，用 LLM 评估每个 (query, chunk) 对的相关性，
 * 按分数重排序，返回 Top-K 最相关结果。
 *
 * 适用场景：QA 问答（需要高精度）
 * 不适用：普通关键词检索（速度优先）
 *
 * @param query     - 用户原始查询
 * @param candidates - hybridSearch 返回的候选列表
 * @param topK      - 最终返回数量（默认 5）
 * @returns          - Re-rank 后的结果列表（含 rerankScore 字段）
 */
export async function rerankResults(
  query: string,
  candidates: HybridSearchResult[],
  topK = 5
): Promise<(HybridSearchResult & { rerankScore: number })[]> {
  if (candidates.length === 0) return []
  if (candidates.length <= topK) {
    // 候选数量不超过 topK，直接返回（无需 Re-rank）
    return candidates.map((c) => ({ ...c, rerankScore: c.rrfScore }))
  }

  const rerankClient = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || "",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  })

  // 构建批量评分 Prompt（单次 LLM 调用，避免多次 round-trip）
  const candidateList = candidates
    .map(
      (c, i) =>
        `[文档${i + 1}] 标题：${c.title}\n内容：${(c.chunkText || c.contentSummary || c.title).slice(0, 300)}`
    )
    .join("\n\n")

  const scoringPrompt = `你是一个搜索相关性评估器。用户查询为：「${query}」

请对以下每个文档与查询的相关性评分（0.0 到 1.0），仅输出 JSON 格式的评分数组，不要任何解释。
格式：[{"id": 1, "score": 0.9}, {"id": 2, "score": 0.3}, ...]

文档列表：
${candidateList}`

  try {
    const completion = await rerankClient.chat.completions.create({
      model: "qwen-plus",
      messages: [{ role: "user", content: scoringPrompt }],
      max_tokens: 200,
      temperature: 0.1, // 极低 temperature，确保评分稳定
    })

    const rawContent = completion.choices[0]?.message?.content || "[]"

    // 解析 LLM 返回的 JSON 评分
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error("LLM 返回格式非法")

    const scores: { id: number; score: number }[] = JSON.parse(jsonMatch[0])

    // 将分数映射回候选结果并排序
    const scored = candidates.map((c, i) => {
      const scoreItem = scores.find((s) => s.id === i + 1)
      return { ...c, rerankScore: scoreItem?.score ?? c.rrfScore }
    })

    return scored
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topK)
  } catch (e) {
    console.warn("[ReRank] LLM 评分失败，降级返回 RRF 排序结果:", (e as Error).message)
    // 降级：返回 RRF 原始排序的 topK 结果
    return candidates.slice(0, topK).map((c) => ({ ...c, rerankScore: c.rrfScore }))
  }
}
