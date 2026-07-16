/**
 * 语义搜索 API — V3 混合检索升级（Story 14.2）
 *
 * GET /api/search?q=自然语言查询&page=1&limit=10
 *
 * V3 升级内容：
 *   - 向量路：bookmark_chunks.embedding cosine Top-20 (Chunk 粒度)
 *   - 全文路：PostgreSQL to_tsvector + ts_rank Top-20
 *   - RRF 融合排序：score = Σ 1/(60 + rank_i)，返回全局 Top-10
 *   - 结果携带命中 Chunk 段落（chunkText），而非整篇截取
 *
 * 降级策略：
 *   1. 无 Chunk 数据 → 整篇 content_embedding 向量搜索（Story 9.1 兜底）
 *   2. pgvector 不可用 → ILIKE 文本搜索
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { hybridSearch } from "@/lib/retrieval"
import { prisma } from "@/lib/prisma"

/** 搜索 API 响应中的单条结果类型 */
interface SearchResultResponse {
  id: string           // bookmarkId
  url: string
  title: string
  whySaved: string | null
  quickTags: string[]
  contentSummary: string | null
  createdAt: Date
  chunkText: string | null  // V3: 命中 Chunk 段落文本（FR59）
  rrfScore: number          // V3: RRF 融合分数
  relevanceHint: string     // 人类可读的相关度描述
}

export async function GET(req: NextRequest) {
  try {
    // ── 认证 ──────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10")))

    // ── 参数校验 ──────────────────────────────
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "搜索内容不能为空" } },
        { status: 400 }
      )
    }

    const userId = token.id as string

    // ── 主路径：混合检索（hybridSearch）──────────────────
    let results: SearchResultResponse[] = []
    let mode = "hybrid"

    try {
      const hybridResults = await hybridSearch(query.trim(), userId, { topK: limit * page })

      // 手动分页（hybridSearch 返回全量 Top-K，在这里按 page/limit 切片）
      const startIdx = (page - 1) * limit
      const pageResults = hybridResults.slice(startIdx, startIdx + limit)

      results = pageResults.map((r) => ({
        id: r.bookmarkId,
        url: r.url,
        title: r.title,
        whySaved: r.whySaved,
        quickTags: r.quickTags,
        contentSummary: r.contentSummary,
        createdAt: r.createdAt,
        chunkText: r.chunkText,
        rrfScore: r.rrfScore,
        relevanceHint: buildRelevanceHint(r.rrfScore, r.vectorRank, r.textRank),
      }))

      // 判断实际使用的检索模式（向量 + 全文 = hybrid，仅全文 = text，仅向量 = semantic）
      if (pageResults.every((r) => r.vectorRank === null)) mode = "text"
      else if (pageResults.every((r) => r.textRank === null)) mode = "semantic"
    } catch (err) {
      // ── 降级路径：hybridSearch 整体失败 → ILIKE 文本搜索 ──
      console.warn("[Search] hybridSearch failed, falling back to ILIKE:", (err as Error).message)
      mode = "text-fallback"
      results = await ilikeFallback(query.trim(), userId, limit, (page - 1) * limit)
    }

    // ── 统计总数（简化：返回当前结果数量，后续可优化）──
    const total = results.length === limit ? limit * page + 1 : (page - 1) * limit + results.length

    return NextResponse.json({
      data: results,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        query: query.trim(),
        mode,  // "hybrid" | "semantic" | "text" | "text-fallback"
      },
    })
  } catch (error) {
    console.error("[Search Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "搜索失败" } },
      { status: 500 }
    )
  }
}

/**
 * 根据 RRF 分数和排名构建人类可读的相关度提示文字
 */
function buildRelevanceHint(
  rrfScore: number,
  vectorRank: number | null,
  textRank: number | null
): string {
  const bothMatched = vectorRank !== null && textRank !== null
  const onlyVector = vectorRank !== null && textRank === null
  const onlyText = vectorRank === null && textRank !== null

  if (bothMatched) {
    return `语义 + 关键词双重匹配（相关度 ${Math.round(rrfScore * 1000)}）`
  } else if (onlyVector) {
    const rank = vectorRank as number
    if (rank <= 3) return `语义高度匹配（向量排名 #${rank}）`
    if (rank <= 10) return `语义较为匹配（向量排名 #${rank}）`
    return `语义相关（向量排名 #${rank}）`
  } else if (onlyText) {
    return `关键词匹配（全文排名 #${textRank}）`
  }
  return "相关结果"
}

/**
 * 降级搜索：ILIKE 文本模糊匹配（pgvector 整体不可用时的最后保障）
 */
async function ilikeFallback(
  query: string,
  userId: string,
  limit: number,
  offset: number
): Promise<SearchResultResponse[]> {
  const likePattern = `%${query}%`
  const rows = await prisma.$queryRawUnsafe<SearchResultResponse[]>(
    `SELECT
      id, url, title,
      why_saved AS "whySaved",
      quick_tags AS "quickTags",
      content_summary AS "contentSummary",
      created_at AS "createdAt",
      NULL AS "chunkText",
      0.1::float AS "rrfScore",
      '文本匹配结果（语义搜索暂不可用）' AS "relevanceHint"
    FROM bookmarks
    WHERE user_id = $1 AND (
      title ILIKE $2 OR why_saved ILIKE $2 OR content_summary ILIKE $2
    )
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4`,
    userId, likePattern, limit, offset
  )
  return rows
}
