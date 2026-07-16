/**
 * 通知 API（Story 5.1）
 *
 * GET /api/notifications — 获取当前用户未读通知列表
 * PUT /api/notifications — 标记通知为已读
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

/** 获取未读通知 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: token.id as string, read: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ data: notifications })
  } catch (error) {
    console.error("[Notifications Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取通知失败" } },
      { status: 500 }
    )
  }
}

/** 标记通知已读 */
export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { ids } = body as { ids?: string[] }

    if (ids && ids.length > 0) {
      // 标记指定通知
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: token.id as string },
        data: { read: true },
      })
    } else {
      // 全部标记已读
      await prisma.notification.updateMany({
        where: { userId: token.id as string, read: false },
        data: { read: true },
      })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[Notifications Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "更新通知失败" } },
      { status: 500 }
    )
  }
}
