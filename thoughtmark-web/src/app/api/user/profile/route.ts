/**
 * 用户个人资料 API（Story 2.3）
 *
 * GET  /api/user/profile — 获取当前用户信息
 * PUT  /api/user/profile — 修改显示名称
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

/** 获取用户信息 */
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
      select: { id: true, email: true, name: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "用户不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error("[Profile Get Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取用户信息失败" } },
      { status: 500 }
    )
  }
}

/** 修改显示名称 */
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
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "名称不能为空" } },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: token.id as string },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[Profile Update Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "更新用户信息失败" } },
      { status: 500 }
    )
  }
}
