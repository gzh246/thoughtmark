/**
 * 兴趣演化时间线 API（Story 13.4 / FR56）
 *
 * GET /api/insights/interest-evolution
 *
 * 按月统计各聚类主题的收藏密度变化趋势
 * AC: ≥ 20 条不同月份的书签
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const userId = token.id as string

    // 获取所有书签（带聚类关系）
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: {
        createdAt: true,
        clusters: {
          include: { cluster: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    if (bookmarks.length < 20) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_DATA", message: `当前仅有 ${bookmarks.length} 条书签，兴趣演化分析需要至少 20 条` } },
        { status: 400 }
      )
    }

    // 按月分组统计各主题的收藏数
    const monthlyData: Record<string, Record<string, number>> = {}
    const allTopics = new Set<string>()

    for (const bm of bookmarks) {
      const month = bm.createdAt.toISOString().slice(0, 7) // "2026-03"
      if (!monthlyData[month]) monthlyData[month] = {}

      if (bm.clusters.length === 0) {
        // 未聚类的书签计入"未分类"
        const topic = "未分类"
        allTopics.add(topic)
        monthlyData[month][topic] = (monthlyData[month][topic] || 0) + 1
      } else {
        for (const bc of bm.clusters) {
          const topic = bc.cluster.name
          allTopics.add(topic)
          monthlyData[month][topic] = (monthlyData[month][topic] || 0) + 1
        }
      }
    }

    // 转为时间序列格式
    const months = Object.keys(monthlyData).sort()
    const topics = Array.from(allTopics)

    const timeline = months.map((month) => {
      const data: Record<string, number | string> = { month }
      for (const topic of topics) {
        data[topic] = monthlyData[month][topic] || 0
      }
      return data
    })

    return NextResponse.json({
      data: {
        type: "interest-evolution",
        timeline,
        topics,
        months,
        totalBookmarks: bookmarks.length,
      },
    })
  } catch (error) {
    console.error("[Interest Evolution Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "兴趣演化分析失败" } },
      { status: 500 }
    )
  }
}
