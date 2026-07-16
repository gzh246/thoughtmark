/**
 * 月度知识报告 Worker（Story 11.4）
 *
 * BullMQ Worker 消费 monthly-report 队列：
 * 1. 遍历所有用户
 * 2. 统计本月新增书签数、主题变化
 * 3. 调用 LLM 生成认知偏移分析
 * 4. 创建 Notification 提醒用户查看
 *
 * 运行方式：独立进程 `npx tsx src/lib/monthlyReportWorker.ts`
 *
 * 启动 cron 调度（在 Worker 文件末尾注册 Repeatable Job）：
 * 每月 1 日 00:00 UTC 触发
 */
import { Worker } from "bullmq"
import { redisConnection } from "./queue"
import { prisma } from "./prisma"
import { getMonthlyReportQueue } from "./queue"
import OpenAI from "openai"
import nodemailer from "nodemailer"

const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

/** B4: QQ SMTP 邮件发送器 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/** 月报 Worker */
export const monthlyReportWorker = new Worker(
  "monthly-report",
  async () => {
    console.log("[MonthlyReport] 开始生成月度报告")

    // ── 1. 获取所有有书签的用户 ──────────────
    const users = await prisma.user.findMany({
      where: { bookmarks: { some: {} } },
      select: { id: true, name: true, email: true },
    })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`

    for (const user of users) {
      try {
        // ── 2. 统计本月数据 ──────────────────
        const newBookmarks = await prisma.bookmark.count({
          where: {
            userId: user.id,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        })

        const totalBookmarks = await prisma.bookmark.count({
          where: { userId: user.id },
        })

        const clusters = await prisma.cluster.findMany({
          where: { userId: user.id },
          select: { name: true, _count: { select: { bookmarks: true } } },
          orderBy: { updatedAt: "desc" },
          take: 10,
        })

        // ── 3. 生成分析 ──────────────────────
        const topicList = clusters.map(
          (c) => `${c.name}(${c._count.bookmarks}篇)`
        ).join("、")

        const completion = await chatClient.chat.completions.create({
          model: "qwen-plus",
          messages: [
            {
              role: "system",
              content: `你是一个知识管理助手。根据用户的月度数据，生成简短的知识回顾报告（200字以内）。
包含：本月收藏概况、主要关注主题、认知偏移趋势建议。`,
            },
            {
              role: "user",
              content: `月份：${monthLabel}
新增书签：${newBookmarks} 条
总书签数：${totalBookmarks} 条
主要主题：${topicList || "暂无聚类"}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.5,
        })

        const analysis = completion.choices[0]?.message?.content?.trim() || ""

        // ── 4. 创建通知 ──────────────────────
        const reportSummary = `📊 ${monthLabel} 月度知识报告\n\n本月新增 ${newBookmarks} 条书签，总计 ${totalBookmarks} 条。\n\n${analysis}`

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "MONTHLY_REPORT",
            message: reportSummary,
          },
        })

        // B4: 邮件推送（可选 — SMTP 配置存在时发送）
        if (process.env.SMTP_USER && user.email) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: user.email,
              subject: `📊 ${monthLabel} Thoughtmark 月度知识报告`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #6366f1;">📊 ${monthLabel} 月度知识报告</h2>
                  <p>你好 ${user.name || "知识探索者"}，</p>
                  <p>本月新增 <strong>${newBookmarks}</strong> 条书签，总计 <strong>${totalBookmarks}</strong> 条。</p>
                  <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0;">
                    ${analysis.replace(/\n/g, "<br/>")}
                  </div>
                  <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/insights" style="color: #6366f1;">查看完整报告 →</a></p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="color: #94a3b8; font-size: 12px;">Thoughtmark — 让每一次收藏都有价值</p>
                </div>
              `,
            })
            console.log(`[MonthlyReport] 邮件已发送至 ${user.email}`)
          } catch (emailErr) {
            console.error(`[MonthlyReport] 邮件发送失败:`, emailErr)
          }
        }

        console.log(`[MonthlyReport] 用户 ${user.email} 报告生成完成`)
      } catch (err) {
        console.error(`[MonthlyReport] 用户 ${user.id} 报告失败:`, err)
      }
    }

    console.log(`[MonthlyReport] 全部用户处理完毕`)
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
)

monthlyReportWorker.on("completed", (job) => {
  console.log(`[MonthlyReport] Job ${job.id} 完成`)
})
monthlyReportWorker.on("failed", (job, err) => {
  console.error(`[MonthlyReport] Job ${job?.id} 失败:`, err.message)
})

// ── 注册 Repeatable Job：每月 1 日 00:00 UTC ──
getMonthlyReportQueue().add(
  "monthly-generate",
  {},
  { repeat: { pattern: "0 0 1 * *" } }
).then(() => {
  console.log("[MonthlyReport] Cron 已注册: 每月 1 日 00:00 UTC")
}).catch((err) => {
  console.error("[MonthlyReport] Cron 注册失败:", err)
})
