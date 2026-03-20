/**
 * 运营统计 API（Story 6.4）
 *
 * GET /api/admin/stats — 运营仪表盘数据
 * 需验证管理员身份（user.isAdmin === true）
 *
 * 指标：WAU、注解填写率、新用户注册数、Pro 订阅数/转化率
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

    // ── 管理员权限验证 ──────────────────────────
    const admin = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { isAdmin: true },
    })
    if (!admin?.isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "仅管理员可访问" } },
        { status: 403 }
      )
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // ── 并行查询所有指标 ──────────────────────────
    const [
      totalUsers,
      newUsersLast30d,
      totalBookmarks,
      annotatedBookmarks,
      proUsers,
      wauUsers,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 30 天新注册
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // 总书签数
      prisma.bookmark.count(),
      // 有注解书签数（计算注解填写率）
      prisma.bookmark.count({ where: { whySaved: { not: null } } }),
      // Pro 用户数
      prisma.user.count({ where: { plan: "pro" } }),
      // WAU：过去 7 天内有新书签的用户数
      prisma.bookmark.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    const annotationRate = totalBookmarks > 0
      ? Math.round((annotatedBookmarks / totalBookmarks) * 100)
      : 0
    const conversionRate = totalUsers > 0
      ? Math.round((proUsers / totalUsers) * 100)
      : 0

    return NextResponse.json({
      data: {
        wau: wauUsers.length,
        annotationRate: `${annotationRate}%`,
        newUsersLast30d,
        totalUsers,
        proUsers,
        conversionRate: `${conversionRate}%`,
        totalBookmarks,
        annotatedBookmarks,
      },
    })
  } catch (error) {
    console.error("[Admin Stats Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取统计数据失败" } },
      { status: 500 }
    )
  }
}
