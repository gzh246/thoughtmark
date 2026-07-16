/**
 * 分享链接 API（Story 12.1）
 *
 * POST /api/bookmarks/[id]/share
 * Body: { mode: "public" | "private", password?: string }
 *
 * 生成唯一分享 token，存入 share_token 字段
 * mode="private" 时需提供 password，访客打开链接时需输入密码
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = token.id as string

    // 验证书签属于当前用户
    const bookmark = await prisma.bookmark.findFirst({
      where: { id, userId },
      select: { id: true, title: true },
    })

    if (!bookmark) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "书签不存在" } },
        { status: 404 }
      )
    }

    // 解析 mode 和 password（兼容空 body）
    let body: Record<string, string> = {}
    try {
      body = await req.json()
    } catch {
      // 前端未传 body 时默认 public 模式
    }
    const mode = body.mode || "public"
    const password = mode === "private" ? (body.password || "") : null

    // 生成分享 token
    const shareToken = crypto.randomBytes(16).toString("hex")

    // Story 12.1: 存入 share_token + share_mode + share_password
    await prisma.$executeRawUnsafe(
      `UPDATE bookmarks SET share_token = $1, share_mode = $2, share_password = $3 WHERE id = $4`,
      shareToken,
      mode,
      password,
      id
    )

    const shareUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shared/${shareToken}`

    return NextResponse.json({
      data: {
        shareToken,
        shareUrl,
        mode,
        bookmarkTitle: bookmark.title,
      },
    })
  } catch (error) {
    console.error("[Share Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "分享链接生成失败" } },
      { status: 500 }
    )
  }
}
