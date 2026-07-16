/**
 * 单个聚类操作 API（Story 5.3）
 *
 * PUT  /api/clusters/[id] — 重命名主题
 * DELETE /api/clusters/[id] — 删除主题（书签不删除，只解除关联）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

/** 重命名主题 */
export async function PUT(
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
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "主题名称不能为空" } },
        { status: 400 }
      )
    }

    // 验证归属
    const cluster = await prisma.cluster.findFirst({
      where: { id, userId: token.id as string },
    })
    if (!cluster) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "主题不存在" } },
        { status: 404 }
      )
    }

    const updated = await prisma.cluster.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[Cluster Rename Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "重命名失败" } },
      { status: 500 }
    )
  }
}

/** 删除主题（书签不删除，只解除关联） */
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

    const cluster = await prisma.cluster.findFirst({
      where: { id, userId: token.id as string },
    })
    if (!cluster) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "主题不存在" } },
        { status: 404 }
      )
    }

    // Prisma onDelete: Cascade 会自动删除 BookmarkCluster 记录
    await prisma.cluster.delete({ where: { id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("[Cluster Delete Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "删除失败" } },
      { status: 500 }
    )
  }
}
