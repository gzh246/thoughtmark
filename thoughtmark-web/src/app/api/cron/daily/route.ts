/**
 * 定时任务 — 重激活提醒 + 记忆推送（Story 5.4 + 5.5）
 *
 * Vercel Cron Job 触发：
 * POST /api/cron/daily
 *
 * 5.4: 查询 7 天无新书签用户 → 发送重激活邮件
 * 5.5: 查询 14 天未看主题 → 发送记忆推送（Feature Flag 默认关闭）
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    // 简单鉴权：Cron Secret（防止外部调用）
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-cron-secret"}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── Story 5.4: 重激活提醒（7 天未用）──────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const inactiveUsers = await prisma.user.findMany({
      where: {
        bookmarks: {
          none: { createdAt: { gte: sevenDaysAgo } },
        },
      },
      select: { id: true, email: true, name: true, _count: { select: { bookmarks: true } } },
    })

    let reactivationSent = 0
    for (const user of inactiveUsers) {
      if (user._count.bookmarks === 0) continue // 从未收藏过的用户跳过

      // 检查 7 天内是否已发过（防重复）
      const recentNotif = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "REACTIVATION",
          createdAt: { gte: sevenDaysAgo },
        },
      })
      if (recentNotif) continue

      try {
        await sendEmail(
          user.email,
          `你的 ${user._count.bookmarks} 条书签在等你回来 📚`,
          `<p>Hi ${user.name || "朋友"}，</p>
           <p>已经有一段时间没见到你了。你在 Thoughtmark 上收藏了 <strong>${user._count.bookmarks}</strong> 条书签，它们还在等你回来整理。</p>
           <p>打开 Thoughtmark，看看 AI 帮你发现了什么新规律 →</p>`
        )
        await prisma.notification.create({
          data: { userId: user.id, type: "REACTIVATION", message: "已发送重激活邮件" },
        })
        reactivationSent++
      } catch {
        // 单封失败不影响整体
      }
    }

    // ── Story 5.5: 记忆推送（Feature Flag）──────
    // TODO(V2-MemoryPush): 实现 14 天未看主题推送 — 原因: V1 Feature Flag 默认关闭
    let memoryPushSent = 0
    if (process.env.MEMORY_PUSH_ENABLED === "true") {
      // V2 实现
      memoryPushSent = 0 // placeholder
    }

    return NextResponse.json({
      data: {
        reactivationSent,
        memoryPushSent,
        inactiveUsersFound: inactiveUsers.length,
      },
    })
  } catch (error) {
    console.error("[Cron Daily Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "定时任务失败" } },
      { status: 500 }
    )
  }
}
