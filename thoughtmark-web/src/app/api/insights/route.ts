/**
 * 深度洞察 API（Epic 11 — Story 11.1/11.2/11.3/11.5）
 *
 * POST /api/insights
 * Body: { type: "cross-article" | "gap-detection" | "topic-summary" | "writing-material", clusterId?: string }
 *
 * 统一入口，根据 type 分发不同的 AI 分析任务
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const userId = token.id as string
    const body = await req.json()
    const { type, clusterId } = body

    // ── Story 11.1: 跨文章观点对比 ──────────
    if (type === "cross-article") {
      if (!clusterId) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "请指定聚类主题" } },
          { status: 400 }
        )
      }

      const clusterBookmarks = await prisma.bookmarkCluster.findMany({
        where: { clusterId },
        include: {
          bookmark: {
            select: { id: true, title: true, pageContent: true, url: true, whySaved: true },
          },
        },
        take: 10,
      })

      // 验证属于当前用户
      const cluster = await prisma.cluster.findFirst({
        where: { id: clusterId, userId },
      })
      if (!cluster) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "聚类不存在" } },
          { status: 404 }
        )
      }

      const articles = clusterBookmarks
        .filter((cb) => cb.bookmark.pageContent)
        .map((cb, i) => `[文章${i + 1}] ${cb.bookmark.title}\n${cb.bookmark.pageContent!.slice(0, 2000)}`)
        .join("\n\n---\n\n")

      // B5: AC 要求 ≥ 3 篇文章
      if (clusterBookmarks.length < 3) {
        return NextResponse.json(
          { error: { code: "INSUFFICIENT_DATA", message: `该主题下仅有 ${clusterBookmarks.length} 篇文章，跨文章对比需要至少 3 篇` } },
          { status: 400 }
        )
      }

      const completion = await chatClient.chat.completions.create({
        model: "qwen-plus",
        messages: [
          {
            role: "system",
            content: `你是一个知识分析师。分析同一主题下多篇文章的观点异同。
输出格式：
1. 共识：所有文章一致同意的观点
2. 分歧：不同文章的不同观点或角度
3. 洞察：综合分析后的深层发现`,
          },
          { role: "user", content: `主题：${cluster.name}\n\n${articles}` },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      })

      return NextResponse.json({
        data: {
          type: "cross-article",
          clusterName: cluster.name,
          content: completion.choices[0]?.message?.content || "分析失败",
          articleCount: clusterBookmarks.length,
        },
      })
    }

    // ── Story 11.2: 知识盲区检测 ──────────────
    if (type === "gap-detection") {
      const clusters = await prisma.cluster.findMany({
        where: { userId },
        include: {
          _count: { select: { bookmarks: true } },
        },
      })

      // 查每个聚类的注解覆盖率
      const gapAnalysis = []
      for (const cluster of clusters) {
        const bookmarks = await prisma.bookmarkCluster.findMany({
          where: { clusterId: cluster.id },
          include: {
            bookmark: { select: { whySaved: true, pageContent: true } },
          },
        })
        const total = bookmarks.length
        const withAnnotation = bookmarks.filter((b) => b.bookmark.whySaved).length
        const annotationRate = total > 0 ? withAnnotation / total : 0

        if (annotationRate < 0.3 && total >= 3) {
          gapAnalysis.push({
            clusterId: cluster.id,
            clusterName: cluster.name,
            bookmarkCount: total,
            annotationRate: Math.round(annotationRate * 100),
            suggestion: `「${cluster.name}」主题收藏了 ${total} 篇但仅 ${Math.round(annotationRate * 100)}% 有注解，建议回顾并补充你的思考`,
          })
        }
      }

      return NextResponse.json({
        data: {
          type: "gap-detection",
          gaps: gapAnalysis,
          totalClusters: clusters.length,
        },
      })
    }

    // ── Story 11.3: 主题深度摘要 ──────────────
    if (type === "topic-summary") {
      if (!clusterId) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "请指定聚类主题" } },
          { status: 400 }
        )
      }

      const cluster = await prisma.cluster.findFirst({
        where: { id: clusterId, userId },
      })
      if (!cluster) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "聚类不存在" } },
          { status: 404 }
        )
      }

      const clusterBookmarks = await prisma.bookmarkCluster.findMany({
        where: { clusterId },
        include: {
          bookmark: {
            select: { title: true, pageContent: true, whySaved: true },
          },
        },
        take: 15,
      })

      const context = clusterBookmarks
        .map((cb, i) => {
          const b = cb.bookmark
          const note = b.whySaved ? `\n用户注解：${b.whySaved}` : ""
          return `[${i + 1}] ${b.title}${note}\n${(b.pageContent || "").slice(0, 2000)}`
        })
        .join("\n\n---\n\n")

      const completion = await chatClient.chat.completions.create({
        model: "qwen-plus",
        messages: [
          {
            role: "system",
            content: `你是一个知识总结专家。综合用户收藏的所有文章和注解，生成该主题的深度摘要。
要求：
1. 500-1000 字
2. 结构化输出（核心概念、关键发现、实战建议）
3. 引用具体文章标题
4. 输出 Markdown 格式`,
          },
          { role: "user", content: `主题：${cluster.name}\n\n${context}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      })

      return NextResponse.json({
        data: {
          type: "topic-summary",
          clusterName: cluster.name,
          content: completion.choices[0]?.message?.content || "摘要生成失败",
          sourceCount: clusterBookmarks.length,
        },
      })
    }

    // ── Story 11.5: 写作素材提取 ──────────────
    if (type === "writing-material") {
      if (!clusterId) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "请指定主题" } },
          { status: 400 }
        )
      }

      const cluster = await prisma.cluster.findFirst({
        where: { id: clusterId, userId },
      })
      if (!cluster) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "主题不存在" } },
          { status: 404 }
        )
      }

      const clusterBookmarks = await prisma.bookmarkCluster.findMany({
        where: { clusterId },
        include: {
          bookmark: {
            select: { title: true, url: true, pageContent: true },
          },
        },
        take: 10,
      })

      const context = clusterBookmarks
        .map((cb, i) => `[${i + 1}] ${cb.bookmark.title}\n${(cb.bookmark.pageContent || "").slice(0, 2000)}`)
        .join("\n\n---\n\n")

      const completion = await chatClient.chat.completions.create({
        model: "qwen-plus",
        messages: [
          {
            role: "system",
            content: `你是一个写作助手。从用户收藏的文章中提取写作素材。
输出 Markdown 格式：
## 关键观点
- 观点 1（来源：[文章标题]）
- ...

## 数据/案例
- ...

## 可引用段落
> 原文引用（来源：[文章标题]）

保持简洁，便于直接复制到写作中。`,
          },
          { role: "user", content: `主题：${cluster.name}\n\n${context}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      })

      return NextResponse.json({
        data: {
          type: "writing-material",
          clusterName: cluster.name,
          content: completion.choices[0]?.message?.content || "素材提取失败",
          sourceCount: clusterBookmarks.length,
          sources: clusterBookmarks.map((cb) => ({
            title: cb.bookmark.title,
            url: cb.bookmark.url,
          })),
        },
      })
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "未知的洞察类型" } },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Insights API Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "洞察生成失败" } },
      { status: 500 }
    )
  }
}
