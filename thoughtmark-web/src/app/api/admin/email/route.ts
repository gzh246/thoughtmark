/**
 * 运营邮件 API（Story 6.5）
 *
 * POST /api/admin/email — 批量发送运营邮件
 * 需验证管理员身份
 *
 * Body: { target: "all" | "free" | "pro", subject: string, html: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { clusterQueue } from "@/lib/queue"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    // ── 管理员权限 ──
    const admin = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { isAdmin: true },
    })
    if (!admin?.isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "仅管理员可访问" } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { target, subject, html } = body as {
      target?: "all" | "free" | "pro"
      subject?: string
      html?: string
    }

    if (!target || !subject || !html) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少必填字段" } },
        { status: 400 }
      )
    }

    // ── 查询目标用户 ──
    const where =
      target === "free"
        ? { plan: "free" }
        : target === "pro"
          ? { plan: "pro" }
          : {} // all

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true },
    })

    // ── 入队 BullMQ 批量发送（避免并发超限）──
    for (const user of users) {
      await clusterQueue.add("send-email", {
        to: user.email,
        subject,
        html: html.replace("{{name}}", user.name || "朋友"),
      })
    }

    return NextResponse.json({
      data: {
        queued: users.length,
        target,
        message: `已向 ${users.length} 位${target === "all" ? "" : target === "free" ? "免费" : "Pro"} 用户发送邮件任务`,
      },
    })
  } catch (error) {
    console.error("[Admin Email Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "发送邮件失败" } },
      { status: 500 }
    )
  }
}
