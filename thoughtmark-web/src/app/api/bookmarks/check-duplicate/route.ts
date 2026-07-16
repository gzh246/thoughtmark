/**
 * 重复内容检测 API（Story 8.4）
 *
 * POST /api/bookmarks/check-duplicate
 * Body: { url: string, pageContent?: string }
 *
 * 检测逻辑：
 * 1. 先检查 URL 完全匹配（24h 内）
 * 2. 如有 pageContent，通过 Embedding 检查内容相似度 > 0.95
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { getEmbeddings } from "@/lib/embedding"

interface SimilarBookmark {
  id: string
  url: string
  title: string
  similarity: number
}

export async function POST(req: NextRequest) {
  try {
    // ── 认证 ──────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { url, pageContent } = body
    const userId = token.id as string

    // ── 1. URL 完全匹配检测 ──────────────────
    const exactMatch = await prisma.bookmark.findFirst({
      where: { userId, url },
      select: { id: true, url: true, title: true, createdAt: true },
    })

    if (exactMatch) {
      return NextResponse.json({
        data: {
          isDuplicate: true,
          type: "exact_url",
          message: "你已收藏过这个 URL",
          similar: [{ ...exactMatch, similarity: 1.0 }],
        },
      })
    }

    // ── 2. 内容相似度检测（需要正文）──────────
    if (pageContent) {
      try {
        const [contentVector] = await getEmbeddings([
          pageContent.slice(0, 3000),
        ])
        if (contentVector && contentVector.length > 0) {
          const vectorSql = `[${contentVector.join(",")}]`
          const similarBookmarks = await prisma.$queryRawUnsafe<
            SimilarBookmark[]
          >(
            `SELECT id, url, title,
              1 - (content_embedding <=> $1::vector) AS similarity
            FROM bookmarks
            WHERE user_id = $2
              AND content_embedding IS NOT NULL
              AND 1 - (content_embedding <=> $1::vector) > 0.95
            ORDER BY similarity DESC
            LIMIT 3`,
            vectorSql,
            userId
          )

          if (similarBookmarks.length > 0) {
            return NextResponse.json({
              data: {
                isDuplicate: true,
                type: "content_similar",
                message: "你可能已经收藏过类似内容",
                similar: similarBookmarks,
              },
            })
          }
        }
      } catch (err) {
        // 向量检测失败不阻塞
        console.error("[Duplicate Check] 向量检测失败:", err)
      }
    }

    // ── 无重复 ──────────────────────────────
    return NextResponse.json({
      data: {
        isDuplicate: false,
        type: null,
        message: null,
        similar: [],
      },
    })
  } catch (error) {
    console.error("[Duplicate Check Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "重复检测失败" } },
      { status: 500 }
    )
  }
}
