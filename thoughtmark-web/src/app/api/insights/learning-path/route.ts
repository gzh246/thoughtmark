/**
 * 学习路径建议 API（Story 13.3 / FR55）
 *
 * POST /api/insights/learning-path
 *
 * 基于知识图谱和盲区分析，推荐下一步学习方向
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

    // 获取用户的聚类主题 + 书签数
    const clusters = await prisma.cluster.findMany({
      where: { userId },
      include: {
        _count: { select: { bookmarks: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    if (clusters.length === 0) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_DATA", message: "暂无聚类数据，需要先收藏并聚类" } },
        { status: 400 }
      )
    }

    // Q5: 优化 — 一次性查询所有聚类的书签注解情况（避免 N+1）
    const allBookmarkClusters = await prisma.bookmarkCluster.findMany({
      where: { clusterId: { in: clusters.map(c => c.id) } },
      include: {
        bookmark: { select: { whySaved: true } },
      },
    })

    // 按 clusterId 分组统计
    const clusterStatsMap = new Map<string, { total: number; withAnnotation: number }>()
    for (const bc of allBookmarkClusters) {
      const stats = clusterStatsMap.get(bc.clusterId) || { total: 0, withAnnotation: 0 }
      stats.total++
      if (bc.bookmark.whySaved) stats.withAnnotation++
      clusterStatsMap.set(bc.clusterId, stats)
    }

    const gapAnalysis = clusters.map((cluster) => {
      const stats = clusterStatsMap.get(cluster.id) || { total: 0, withAnnotation: 0 }
      const annotationRate = stats.total > 0 ? stats.withAnnotation / stats.total : 0
      return {
        name: cluster.name,
        count: stats.total,
        annotationRate: Math.round(annotationRate * 100),
        isGap: annotationRate < 0.3 && stats.total >= 3,
      }
    })

    // Q4: 检查缓存
    const gapCount = gapAnalysis.filter(g => g.isGap).length
    const cacheKey = `topics-${clusters.length}-gaps-${gapCount}`
    const cached = await getInsightCache(userId, "learning-path", cacheKey)
    if (cached) {
      return NextResponse.json({
        data: {
          type: "learning-path",
          content: cached,
          totalTopics: clusters.length,
          gapCount,
          fromCache: true,
        },
      })
    }

    // 拼接知识图谱摘要
    const topicSummary = gapAnalysis
      .map((g) => `${g.name}(${g.count}篇, 注解率${g.annotationRate}%${g.isGap ? " ⚠️盲区" : ""})`)
      .join("\n")

    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个知识规划顾问。基于用户的知识图谱主题分布和盲区分析，推荐 3-5 个学习方向。

每个方向包含：
1. **推荐主题/关键词**
2. **推荐理由**（为什么这是下一步的好方向）
3. **与现有知识的关联**（如何与用户已有主题衔接）

优先推荐：
- 用户盲区领域的补充方向
- 跨主题交叉学习方向
- 现有主题的深化方向

输出 Markdown 格式。`,
        },
        {
          role: "user",
          content: `用户知识图谱：\n${topicSummary}\n\n共 ${clusters.length} 个主题，${gapAnalysis.filter(g => g.isGap).length} 个盲区`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    })

    const content = completion.choices[0]?.message?.content || "建议生成失败"

    // Q4: 写入缓存
    await setInsightCache(userId, "learning-path", cacheKey, content)

    return NextResponse.json({
      data: {
        type: "learning-path",
        content,
        totalTopics: clusters.length,
        gapCount: gapAnalysis.filter((g) => g.isGap).length,
      },
    })
  } catch (error) {
    console.error("[Learning Path Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "学习路径建议失败" } },
      { status: 500 }
    )
  }
}
