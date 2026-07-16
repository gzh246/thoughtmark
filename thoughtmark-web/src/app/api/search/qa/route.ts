/**
 * 问答式检索 API — V3 Agentic 升级（Story 14.6）
 *
 * POST /api/search/qa
 * Body: {
 *   question: string,
 *   history?: { role: "user"|"assistant", content: string }[]
 * }
 *
 * V3 Agentic 升级（Story 14.6）：
 *   - 意图分类：simple_search / aggregate / explore / report
 *   - 路由策略：按意图选择最合适的检索方案
 *   - Agentic Loop：explore/report 类问题支持多步工具调用（最多3步）
 *   - Re-ranking：QA 场景自动启用 LLM 二次排序
 *
 * 保留自 Story 14.4：
 *   - 对话记忆（history 字段）
 *   - 幻觉控制（低置信度声明）
 *   - Chunk 级引用来源
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { classifyIntent, runAgentSearch } from "@/lib/agent"

/** 对话历史单条消息 */
interface HistoryMessage {
  role: "user" | "assistant"
  content: string
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

    // ── 安全解析 body ──────────────────────────
    let body: { question?: string; history?: HistoryMessage[] } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请求体格式错误" } },
        { status: 400 }
      )
    }

    const { question, history = [] } = body

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "问题不能为空" } },
        { status: 400 }
      )
    }

    const userId = token.id as string
    const recentHistory = history.slice(-3) // 保留最近 3 轮

    // ── 1. 意图分类（Story 14.6 核心）──────────────────
    const intent = await classifyIntent(question.trim())
    console.log(`[QA] 意图分类结果：${intent}，问题：「${question.slice(0, 30)}」`)

    // ── 2. 按意图路由到对应检索策略 ──────────────────
    const agentResult = await runAgentSearch(
      question.trim(),
      userId,
      intent,
      recentHistory
    )

    // ── 3. 返回结果 ──────────────────────────────
    return NextResponse.json({
      data: {
        answer: agentResult.answer,
        sources: agentResult.sources,
        meta: {
          intent,
          agentSteps: agentResult.steps,
          historyLength: recentHistory.length,
          retrievalMode: intent === "simple_search" ? "hybrid-rerank" : "agentic",
        },
      },
    })
  } catch (error) {
    console.error("[QA Retrieval Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "问答检索失败" } },
      { status: 500 }
    )
  }
}
