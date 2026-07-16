/**
 * 账户删除 API（Story 2.6: GDPR FR5）
 *
 * DELETE /api/user/delete
 * Body: { confirmation: "DELETE" }
 *
 * 级联删除用户及所有关联数据（书签、账户、会话）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { confirmation } = body

    // ── 确认文本校验 ──────────────────────────
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请输入 DELETE 确认删除" } },
        { status: 400 }
      )
    }

    // ── 级联删除（Prisma onDelete: Cascade 会处理关联数据）──
    await prisma.user.delete({
      where: { id: token.id as string },
    })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("[Account Delete Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "账户删除失败" } },
      { status: 500 }
    )
  }
}
