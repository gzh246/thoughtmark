/**
 * 意图模式识别 API（Story 13.1 / FR53）
 *
 * POST /api/insights/intent-patterns
 *
 * 分析用户 why_saved 注解中的思维习惯，识别意图模式
 * AC: ≥ 30 条带注解的书签
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

    // AC: ≥ 30 条带注解的书签
    const annotatedBookmarks = await prisma.bookmark.findMany({
      where: { userId, whySaved: { not: null } },
      select: { title: true, whySaved: true, quickTags: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    if (annotatedBookmarks.length < 30) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_DATA", message: `当前仅有 ${annotatedBookmarks.length} 条带注解的书签，意图分析需要至少 30 条` } },
        { status: 400 }
      )
    }

    // Q4: 检查缓存（以书签数量作为缓存 key 的一部分，数据变化时自动失效）
    const cacheKey = `count-${annotatedBookmarks.length}`
    const cached = await getInsightCache(userId, "intent-patterns", cacheKey)
    if (cached) {
      return NextResponse.json({
        data: {
          type: "intent-patterns",
          content: cached,
          totalAnnotations: annotatedBookmarks.length,
          fromCache: true,
        },
      })
    }

    // 拼接注解上下文
    const annotations = annotatedBookmarks
      .map((b, i) => `${i + 1}. [${b.title}] — ${b.whySaved}`)
      .join("\n")

    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个认知行为分析师。分析以下用户书签注解，识别出 3-5 个"意图模式"。

每个模式需包含：
1. **模式名称**（如：对比型、质疑型、灵感型、学习型、参考型、探索型等）
2. **占比**（该模式在所有注解中的大致比例）
3. **典型注解示例**（2-3 条原始注解）
4. **解读**（这种模式说明用户什么样的认知偏好）

输出 Markdown 格式。`,
        },
        {
          role: "user",
          content: `用户共 ${annotatedBookmarks.length} 条注解：\n\n${annotations}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    })

    const content = completion.choices[0]?.message?.content || "分析失败"

    // Q4: 写入缓存
    await setInsightCache(userId, "intent-patterns", cacheKey, content)

    return NextResponse.json({
      data: {
        type: "intent-patterns",
        content,
        totalAnnotations: annotatedBookmarks.length,
      },
    })
  } catch (error) {
    console.error("[Intent Patterns Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "意图分析失败" } },
      { status: 500 }
    )
  }
}
