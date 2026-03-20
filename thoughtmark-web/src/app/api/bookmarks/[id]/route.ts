/**
 * 书签 API — 单个书签操作
 *
 * PUT /api/bookmarks/[id]     — 覆盖更新（Story 3.4）
 * DELETE /api/bookmarks/[id]  — 删除书签（Story 4.3）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 认证 ──────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { title, whySaved, quickTags } = body

    // ── 查找并验证所有权 ──────────────────────
    const existing = await prisma.bookmark.findUnique({ where: { id } })
    if (!existing || existing.userId !== token.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "书签不存在" } },
        { status: 404 }
      )
    }

    // ── 覆盖更新 ──────────────────────────────
    const updated = await prisma.bookmark.update({
      where: { id },
      data: {
        title: title || existing.title,
        whySaved: whySaved !== undefined ? (whySaved || null) : existing.whySaved,
        quickTags: quickTags !== undefined ? quickTags : existing.quickTags,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[Bookmark Update Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "更新书签失败" } },
      { status: 500 }
    )
  }
}

/** Story 4.3: 删除书签 */
export async function DELETE(
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

    // ── 查找并验证所有权 ──────────────────────
    const existing = await prisma.bookmark.findUnique({ where: { id } })
    if (!existing || existing.userId !== token.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "书签不存在" } },
        { status: 404 }
      )
    }

    await prisma.bookmark.delete({ where: { id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("[Bookmark Delete Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "删除书签失败" } },
      { status: 500 }
    )
  }
}
