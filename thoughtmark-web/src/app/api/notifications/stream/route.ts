/**
 * SSE 实时通知 API（Story 12.3）
 *
 * GET /api/notifications/stream
 *
 * Server-Sent Events 推送 AI 处理完成通知：
 * - 聚类完成
 * - 摘要生成完成
 * - 洞察生成完成
 *
 * 客户端使用 EventSource API，断线自动重连
 */
import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = token.id as string

  // ── SSE 流 ──────────────────────────────
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始连接确认
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", message: "SSE 连接成功" })}\n\n`)
      )

      // 轮询新通知（每 5 秒检查一次未读通知）
      const interval = setInterval(async () => {
        try {
          const notifications = await prisma.notification.findMany({
            where: {
              userId,
              read: false,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })

          if (notifications.length > 0) {
            for (const notification of notifications) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "notification",
                    id: notification.id,
                    notificationType: notification.type,
                    message: notification.message,
                    createdAt: notification.createdAt.toISOString(),
                  })}\n\n`
                )
              )
            }
          }
        } catch {
          // 静默失败
        }
      }, 5000)

      // 保持连接 30 分钟后关闭
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 30 * 60 * 1000)

      // 清理
      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
