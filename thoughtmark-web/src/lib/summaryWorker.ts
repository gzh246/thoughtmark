/**
 * AI 摘要生成 Worker（Story 8.1）
 *
 * BullMQ Worker 消费 summary-generation 队列：
 * 1. 查询书签正文 pageContent
 * 2. 调用通义千问 Chat API 生成 3 句话摘要
 * 3. 存入 content_summary 字段
 *
 * 运行方式：独立进程 `npx tsx src/lib/summaryWorker.ts`
 */
import { Worker } from "bullmq"
import { redisConnection } from "./queue"
import { prisma } from "./prisma"
import OpenAI from "openai"

/** 通义千问 Chat 客户端 */
const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

/** 摘要生成 Worker */
export const summaryWorker = new Worker(
  "summary-generation",
  async (job) => {
    const { bookmarkId } = job.data as { bookmarkId: string }
    console.log(`[Summary] 开始生成书签 ${bookmarkId} 的摘要`)

    // ── 1. 查询书签正文 ──
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: { id: true, title: true, pageContent: true, contentSummary: true },
    })

    if (!bookmark) {
      console.warn(`[Summary] 书签 ${bookmarkId} 不存在`)
      return
    }

    // 已有摘要则跳过
    if (bookmark.contentSummary) {
      console.log(`[Summary] 书签 ${bookmarkId} 已有摘要，跳过`)
      return
    }

    if (!bookmark.pageContent) {
      console.log(`[Summary] 书签 ${bookmarkId} 无正文，跳过`)
      return
    }

    // ── 2. 调用通义千问生成摘要 ──
    const contentSlice = bookmark.pageContent.slice(0, 5000)
    const completion = await chatClient.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content: `你是一个文章摘要助手。请用中文为以下文章生成简洁的 3 句话摘要。
规则：
1. 每句话独立成段
2. 突出核心观点和关键信息
3. 总字数控制在 100-200 字`,
        },
        {
          role: "user",
          content: `标题：${bookmark.title}\n\n正文：${contentSlice}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    })

    const summary =
      completion.choices[0]?.message?.content?.trim() || null

    if (!summary) {
      console.warn(`[Summary] 书签 ${bookmarkId} 摘要生成失败`)
      return
    }

    // ── 3. 存入 content_summary ──
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { contentSummary: summary },
    })

    // B2: 写入 Notification → SSE NotificationToast 自动推送
    const bm = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: { userId: true, title: true },
    })
    if (bm) {
      await prisma.notification.create({
        data: {
          userId: bm.userId,
          type: "SUMMARY_READY",
          message: `📝 「${bm.title}」AI 摘要已生成`,
        },
      })
    }

    console.log(`[Summary] 书签 ${bookmarkId} 摘要生成完成`)
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
)

summaryWorker.on("completed", (job) => {
  console.log(`[Summary] Job ${job.id} 完成`)
})
summaryWorker.on("failed", (job, err) => {
  console.error(`[Summary] Job ${job?.id} 失败:`, err.message)
})
