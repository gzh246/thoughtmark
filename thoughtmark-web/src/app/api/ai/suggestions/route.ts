/**
 * AI 建议 API（Story 8.2 + 8.3）
 *
 * POST /api/ai/suggestions
 * Body: { pageContent: string, title: string }
 *
 * 基于文章正文生成：
 * - 2-3 个注解建议（Story 8.2）
 * - 3-5 个标签推荐（Story 8.3）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import OpenAI from "openai"

const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

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
    const { pageContent, title } = body

    if (!pageContent || !title) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "正文和标题不能为空" } },
        { status: 400 }
      )
    }

    // ── 调用通义千问生成建议 ──────────────────
    const contentSlice = pageContent.slice(0, 3000)
    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个收藏助手。基于用户正在收藏的文章，生成建议。
请严格按照 JSON 格式返回，不要包含其他内容：
{
  "annotations": ["注解1", "注解2", "注解3"],
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}
规则：
- annotations: 2-3 个简短注解建议（每个 ≤ 30 字），描述为什么值得收藏
- tags: 3-5 个分类标签（每个 ≤ 6 字），反映文章主题`,
        },
        {
          role: "user",
          content: `标题：${title}\n\n正文摘要：${contentSlice}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
      response_format: { type: "json_object" },
    })

    const rawResponse = completion.choices[0]?.message?.content || "{}"
    let suggestions: { annotations?: string[]; tags?: string[] }
    try {
      suggestions = JSON.parse(rawResponse)
    } catch {
      suggestions = { annotations: [], tags: [] }
    }

    return NextResponse.json({
      data: {
        annotations: suggestions.annotations || [],
        tags: suggestions.tags || [],
      },
    })
  } catch (error) {
    console.error("[AI Suggestions Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "AI 建议生成失败" } },
      { status: 500 }
    )
  }
}
