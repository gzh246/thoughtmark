/**
 * 月度知识回顾报告 API（Story 11.4）
 *
 * GET /api/insights/monthly?month=2026-03
 *
 * 生成月度知识回顾：
 * - 本月新增书签数
 * - 主题分布
 * - 认知偏移分析
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

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
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    // 解析月份范围
    const startDate = new Date(`${month}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // ── 查询本月数据 ──────────────────────────
    const monthBookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lt: endDate },
      },
      select: {
        title: true,
        quickTags: true,
        whySaved: true,
        contentSummary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const totalCount = monthBookmarks.length

    if (totalCount === 0) {
      return NextResponse.json({
        data: {
          month,
          totalCount: 0,
          report: `${month} 暂无收藏记录。`,
          tagDistribution: {},
        },
      })
    }

    // 标签分布
    const tagCounts: Record<string, number> = {}
    for (const b of monthBookmarks) {
      for (const tag of b.quickTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    // ── LLM 生成报告 ──────────────────────────
    const context = monthBookmarks
      .map(
        (b, i) =>
          `${i + 1}. ${b.title}${b.whySaved ? ` — ${b.whySaved}` : ""}${b.contentSummary ? `\n  摘要：${b.contentSummary}` : ""}`
      )
      .join("\n")

    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个知识管理顾问。基于用户本月的收藏清单，生成月度知识回顾报告。
输出 Markdown 格式，包含：
## 📊 数据概览
## 🎯 本月关注领域
## 📈 认知趋势
## 💡 建议
简洁有洞察力，200-400 字。`,
        },
        {
          role: "user",
          content: `${month} 月度收藏（共 ${totalCount} 条）：\n${context}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    })

    return NextResponse.json({
      data: {
        month,
        totalCount,
        report: completion.choices[0]?.message?.content || "报告生成失败",
        tagDistribution: tagCounts,
      },
    })
  } catch (error) {
    console.error("[Monthly Report Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "报告生成失败" } },
      { status: 500 }
    )
  }
}
