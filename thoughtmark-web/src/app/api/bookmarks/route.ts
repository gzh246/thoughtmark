/**
 * 书签 API — 创建书签
 *
 * POST /api/bookmarks
 * Body: { url: string, title: string, whySaved?: string, quickTags?: string[] }
 *
 * Story 3.1: 一键收藏基础
 * - 认证：getToken() 验证 JWT
 * - 响应格式：{ data } 或 { error: { code, message } }
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

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
 * GET /api/bookmarks?page=1&limit=20
 *
 * 按 createdAt 降序排列（最新在前）
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

    // ── 查询 ──────────────────────────────────
    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: token.id as string },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bookmark.count({
        where: { userId: token.id as string },
      }),
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
