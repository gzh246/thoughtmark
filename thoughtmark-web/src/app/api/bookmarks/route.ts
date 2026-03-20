/**
 * 书签 API — 创建书签
 *
 * POST /api/bookmarks
 * Body: { url: string, title: string, whySaved?: string, quickTags?: string[] }
 *
 * Story 3.1: 一键收藏基础
 * - 认证：getToken() 验证 JWT
 * - 响应格式：{ data } 或 { error: { code, message } }
 *
 * Story 5.1: 保存书签后检查带注解数是否达 20 → 触发 AI 聚类
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { clusterQueue } from "@/lib/queue"

export async function POST(req: NextRequest) {
  try {
    // ── 认证 ──────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { url, title, whySaved, quickTags } = body

    // ── Story 6.1: 免费层书签上限检查 ────────
    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { plan: true },
    })
    if (user?.plan !== "pro") {
      const bookmarkCount = await prisma.bookmark.count({
        where: { userId: token.id as string },
      })
      if (bookmarkCount >= 500) {
        return NextResponse.json(
          {
            error: {
              code: "PLAN_LIMIT",
              message: "已达免费额度上限（500 条），升级 Pro 解锁无限书签",
            },
          },
          { status: 403 }
        )
      }
    }

    // ── 参数校验 ──────────────────────────────
    if (!url || !title) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "URL 和标题不能为空" } },
        { status: 400 }
      )
    }

    // ── 注解长度校验（Story 3.2: max 140 字符）──
    if (whySaved && whySaved.length > 140) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "注解不能超过 140 字" } },
        { status: 400 }
      )
    }

    // ── 快选标签白名单校验（Story 3.2: PRD FR9）──
    const VALID_QUICK_TAGS = ["学习资料", "工作参考", "灵感收藏"]
    if (quickTags && Array.isArray(quickTags)) {
      const invalidTags = quickTags.filter(
        (tag: string) => !VALID_QUICK_TAGS.includes(tag)
      )
      if (invalidTags.length > 0) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "无效的标签" } },
          { status: 400 }
        )
      }
    }

    // ── URL 去重检测（Story 3.4: 24h 内同 URL）──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        userId: token.id as string,
        url,
        createdAt: { gte: twentyFourHoursAgo },
      },
    })
    if (existingBookmark) {
      return NextResponse.json(
        {
          error: { code: "DUPLICATE", message: "你已收藏过这个页面" },
          data: { existingBookmark },
        },
        { status: 409 }
      )
    }

    // ── 创建书签 ──────────────────────────────
    const bookmark = await prisma.bookmark.create({
      data: {
        url,
        title,
        whySaved: whySaved || null,
        quickTags: quickTags || [],
        userId: token.id as string,
      },
    })

    // ── Story 5.1: 检查是否触发 AI 聚类 ──────
    // 带注解书签数达 20 → 入队 BullMQ 异步聚类任务
    if (whySaved) {
      try {
        const annotatedCount = await prisma.bookmark.count({
          where: {
            userId: token.id as string,
            whySaved: { not: null },
          },
        })
        // 每 20 条带注解书签触发一次聚类（20/40/60...）
        if (annotatedCount >= 20 && annotatedCount % 20 === 0) {
          await clusterQueue.add("cluster", { userId: token.id })
          // 创建"进行中"通知
          await prisma.notification.create({
            data: {
              userId: token.id as string,
              type: "CLUSTER_READY",
              message: "AI 正在帮你整理主题，稍后查看结果",
            },
          })
        }
      } catch (queueErr) {
        // 队列失败不影响书签创建
        console.error("[Cluster Queue Error]", queueErr)
      }
    }

    return NextResponse.json({ data: bookmark }, { status: 201 })
  } catch (error) {
    console.error("[Bookmark Create Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "创建书签失败" } },
      { status: 500 }
    )
  }
}

/**
 * 书签 API — 获取用户书签列表
 *
 * GET /api/bookmarks?page=1&limit=20&from=ISO&to=ISO
 *
 * 按 createdAt 降序排列（最新在前）
 * Story 4.1: 支持 from/to 时间范围筛选
 */
export async function GET(req: NextRequest) {
  try {
    // ── 认证 ──────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    // Story 4.1: 时间范围筛选（from/to ISO 参数）
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const where = {
      userId: token.id as string,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    }

    // ── 查询 ──────────────────────────────────
    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bookmark.count({ where }),
    ])

    return NextResponse.json({
      data: bookmarks,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("[Bookmark List Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取书签失败" } },
      { status: 500 }
    )
  }
}
