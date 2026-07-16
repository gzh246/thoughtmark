/**
 * 知识图谱 API（Story 10.1 + 10.2 + 10.3）
 *
 * GET /api/graph?from=ISO&to=ISO
 *
 * 基于正文 Embedding 聚类，返回力导向图所需的 nodes + links 数据：
 * - cluster 节点（主题）
 * - bookmark 节点（书签）
 * - cluster → bookmark 边
 * - 支持 from/to 时间范围过滤（Story 10.3）
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

interface GraphNode {
  id: string
  type: "cluster" | "bookmark"
  label: string
  url?: string
  createdAt?: string
  size: number
}

interface GraphLink {
  source: string
  target: string
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const userId = token.id as string
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Story 10.3: 时间范围过滤
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const bookmarkWhere = {
      userId,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    }

    // ── 查询聚类 + 关联书签 ──────────────────
    const clusters = await prisma.cluster.findMany({
      where: { userId },
      include: {
        bookmarks: {
          include: {
            bookmark: {
              select: {
                id: true,
                title: true,
                url: true,
                quickTags: true,
                createdAt: true,
              },
            },
          },
          where: {
            bookmark: bookmarkWhere,
          },
        },
      },
    })

    // ── 构建图谱数据 ──────────────────────────
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const addedBookmarkIds = new Set<string>()

    for (const cluster of clusters) {
      // 跳过空聚类（时间过滤后可能为空）
      if (cluster.bookmarks.length === 0) continue

      // 聚类节点
      nodes.push({
        id: `c-${cluster.id}`,
        type: "cluster",
        label: cluster.name,
        size: cluster.bookmarks.length * 3 + 10,
      })

      // 书签节点 + 连线
      for (const bc of cluster.bookmarks) {
        const b = bc.bookmark
        if (!addedBookmarkIds.has(b.id)) {
          addedBookmarkIds.add(b.id)
          nodes.push({
            id: `b-${b.id}`,
            type: "bookmark",
            label: b.title.length > 30 ? b.title.slice(0, 30) + "…" : b.title,
            url: b.url,
            createdAt: b.createdAt.toISOString(),
            size: 5,
          })
        }
        links.push({
          source: `c-${cluster.id}`,
          target: `b-${b.id}`,
        })
      }
    }

    return NextResponse.json({
      data: { nodes, links },
      meta: {
        clusterCount: clusters.filter((c) => c.bookmarks.length > 0).length,
        bookmarkCount: addedBookmarkIds.size,
      },
    })
  } catch (error) {
    console.error("[Graph API Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取图谱数据失败" } },
      { status: 500 }
    )
  }
}
