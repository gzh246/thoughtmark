/**
 * 认知演化检测 API（Story 13.2 / FR54）
 *
 * POST /api/insights/cognitive-evolution
 * Body: { clusterId: string }
 *
 * 追踪同一主题下用户注解随时间的变化
 * AC: 聚类下 ≥ 5 条不同时间段的书签
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { getInsightCache, setInsightCache } from "@/lib/insightCache"
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
    const { clusterId } = await req.json()

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

    // 查询该聚类下的书签（按时间排序）
    const clusterBookmarks = await prisma.bookmarkCluster.findMany({
      where: { clusterId },
      include: {
        bookmark: {
          select: { title: true, whySaved: true, createdAt: true },
        },
      },
      orderBy: { bookmark: { createdAt: "asc" } },
    })

    // AC: ≥ 5 条
    if (clusterBookmarks.length < 5) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_DATA", message: `该主题下仅有 ${clusterBookmarks.length} 条书签，认知演化分析需要至少 5 条` } },
        { status: 400 }
      )
    }

    // Q3: 时间段分布校验 — 至少分布在 3 个不同月份
    const monthSet = new Set(
      clusterBookmarks.map((cb) =>
        new Date(cb.bookmark.createdAt).toISOString().slice(0, 7)
      )
    )
    if (monthSet.size < 3) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_TIMESPAN", message: `该主题的书签仅分布在 ${monthSet.size} 个月份，认知演化分析需要至少 3 个不同月份的数据` } },
        { status: 400 }
      )
    }

    // Q4: 检查缓存
    const cacheKey = `${clusterId}-count-${clusterBookmarks.length}`
    const cached = await getInsightCache(userId, "cognitive-evolution", cacheKey)
    if (cached) {
      return NextResponse.json({
        data: {
          type: "cognitive-evolution",
          clusterName: cluster.name,
          content: cached,
          bookmarkCount: clusterBookmarks.length,
          fromCache: true,
        },
      })
    }

    // 按时间排列注解
    const timeline = clusterBookmarks
      .map((cb) => {
        const date = new Date(cb.bookmark.createdAt).toLocaleDateString("zh-CN")
        const note = cb.bookmark.whySaved || "(无注解)"
        return `[${date}] ${cb.bookmark.title} — ${note}`
      })
      .join("\n")

    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个认知发展分析师。分析用户在同一主题下不同时间的注解，检测认知演化轨迹。

输出 Markdown 格式，包含：
1. **演化叙事**：描述用户认知如何随时间变化（如从"初步了解"到"深入质疑"到"形成独特观点"）
2. **关键转折点**：标出哪条注解标志着认知转变，解释为什么
3. **当前认知阶段**：用户目前处于什么认知水平
4. **建议**：基于演化轨迹，建议下一步深入方向`,
        },
        {
          role: "user",
          content: `主题：${cluster.name}\n\n时间线（${clusterBookmarks.length} 条）：\n${timeline}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.4,
    })

    const content = completion.choices[0]?.message?.content || "分析失败"

    // Q4: 写入缓存
    await setInsightCache(userId, "cognitive-evolution", cacheKey, content)

    return NextResponse.json({
      data: {
        type: "cognitive-evolution",
        clusterName: cluster.name,
        content,
        bookmarkCount: clusterBookmarks.length,
      },
    })
  } catch (error) {
    console.error("[Cognitive Evolution Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "认知演化分析失败" } },
      { status: 500 }
    )
  }
}
