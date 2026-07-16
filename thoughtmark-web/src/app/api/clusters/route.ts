/**
 * 聚类结果 API（Story 5.2）
 *
 * GET /api/clusters — 获取当前用户所有主题分组 + 书签数量 + 详情
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const clusters = await prisma.cluster.findMany({
      where: { userId: token.id as string },
      orderBy: { updatedAt: "desc" },
      include: {
        bookmarks: {
          include: {
            bookmark: {
              select: { id: true, title: true, url: true, whySaved: true, createdAt: true },
            },
          },
          orderBy: { addedAt: "desc" },
        },
        _count: { select: { bookmarks: true } },
      },
    })

    // 扁平化响应结构
    const data = clusters.map((c) => ({
      id: c.id,
      name: c.name,
      bookmarkCount: c._count.bookmarks,
      updatedAt: c.updatedAt,
      bookmarks: c.bookmarks.map((bc) => bc.bookmark),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Clusters Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取聚类结果失败" } },
      { status: 500 }
    )
  }
}
