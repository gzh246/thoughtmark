/**
 * 合并主题 API（Story 5.3）
 *
 * POST /api/clusters/merge
 * Body: { sourceId, targetId }
 *
 * 将 sourceId 主题的所有书签移到 targetId，然后删除 sourceId
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

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
    const { sourceId, targetId } = body

    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请指定两个不同的主题" } },
        { status: 400 }
      )
    }

    // 验证两个主题都归属当前用户
    const [source, target] = await Promise.all([
      prisma.cluster.findFirst({ where: { id: sourceId, userId: token.id as string } }),
      prisma.cluster.findFirst({ where: { id: targetId, userId: token.id as string } }),
    ])

    if (!source || !target) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "主题不存在" } },
        { status: 404 }
      )
    }

    // 获取 source 的所有书签 ID（排除已在 target 中的）
    const sourceBookmarks = await prisma.bookmarkCluster.findMany({
      where: { clusterId: sourceId },
      select: { bookmarkId: true },
    })
    const targetBookmarkIds = new Set(
      (await prisma.bookmarkCluster.findMany({
        where: { clusterId: targetId },
        select: { bookmarkId: true },
      })).map((b) => b.bookmarkId)
    )

    const toMove = sourceBookmarks.filter((b) => !targetBookmarkIds.has(b.bookmarkId))

    // 批量创建新关联 + 删除 source
    await prisma.$transaction([
      ...toMove.map((b) =>
        prisma.bookmarkCluster.create({
          data: { bookmarkId: b.bookmarkId, clusterId: targetId },
        })
      ),
      prisma.cluster.delete({ where: { id: sourceId } }),
    ])

    return NextResponse.json({ data: { merged: true, movedCount: toMove.length } })
  } catch (error) {
    console.error("[Cluster Merge Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "合并失败" } },
      { status: 500 }
    )
  }
}
