/**
 * 密码修改 API（Story 2.4）
 *
 * PUT /api/user/password
 * Body: { currentPassword, newPassword }
 *
 * 验证当前密码 → bcrypt hash 新密码 → 更新数据库
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

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
    const { currentPassword, newPassword } = body

    // ── 参数校验 ──────────────────────────────
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请填写当前密码和新密码" } },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "新密码至少 8 位" } },
        { status: 400 }
      )
    }

    // ── 验证当前密码 ──────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "此账户未设置密码（OAuth 登录）" } },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "当前密码错误" } },
        { status: 403 }
      )
    }

    // ── 更新密码 ──────────────────────────────
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: token.id as string },
      data: { passwordHash: hashedPassword },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[Password Update Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "密码修改失败" } },
      { status: 500 }
    )
  }
}
