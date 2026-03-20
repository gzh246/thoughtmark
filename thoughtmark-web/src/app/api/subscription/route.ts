/**
 * 订阅管理 API（Story 6.2 + 6.3）
 *
 * GET  /api/subscription — 获取当前订阅状态
 * POST /api/subscription — MVP Mock: 管理员切换 Pro（预留 Stripe 接口）
 * DELETE /api/subscription — 取消订阅（到期降级）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

/** 获取订阅状态 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { plan: true, planExpiresAt: true, email: true },
    })

    return NextResponse.json({
      data: {
        plan: user?.plan || "free",
        planExpiresAt: user?.planExpiresAt,
      },
    })
  } catch (error) {
    console.error("[Subscription Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取订阅信息失败" } },
      { status: 500 }
    )
  }
}

/**
 * MVP Mock: 升级为 Pro
 *
 * 真实场景下此接口由 Stripe Webhook 触发
 * MVP 阶段：管理员手动调用 or 前端 Mock 按钮
 *
 * TODO(V2-Stripe): 替换为真实 Stripe Checkout → Webhook 流程
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { action } = body as { action?: string }

    if (action === "upgrade") {
      // Mock: 直接升级为 Pro，有效期 30 天
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await prisma.user.update({
        where: { id: token.id as string },
        data: { plan: "pro", planExpiresAt: expiresAt },
      })
      return NextResponse.json({
        data: { plan: "pro", planExpiresAt: expiresAt, message: "已成功订阅 Pro 计划" },
      })
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "请指定操作" } },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Subscription Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "订阅操作失败" } },
      { status: 500 }
    )
  }
}

/** 取消订阅（到期降级） */
export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { plan: true, planExpiresAt: true },
    })

    if (user?.plan !== "pro") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "当前不是 Pro 用户" } },
        { status: 400 }
      )
    }

    // 设置到期时间为当前 planExpiresAt（不立即降级，期间仍享 Pro 权益）
    // 如果有到期时间就保留，没有的话设置为 7 天后
    const expiresAt = user.planExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: token.id as string },
      data: { planExpiresAt: expiresAt },
    })

    return NextResponse.json({
      data: {
        message: "订阅已取消，Pro 权益将持续到期满",
        planExpiresAt: expiresAt,
      },
    })
  } catch (error) {
    console.error("[Subscription Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "取消订阅失败" } },
      { status: 500 }
    )
  }
}
