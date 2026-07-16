/**
 * 分享页面数据 API
 *
 * GET /api/shared/[token] — 获取公开分享数据（私密时返回 needsPassword）
 * POST /api/shared/[token] — 提交密码验证（私密分享）
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const results = await prisma.$queryRawUnsafe<
      {
        title: string
        url: string
        why_saved: string | null
        content_summary: string | null
        quick_tags: string[]
        created_at: Date
        share_mode: string | null
        share_password: string | null
      }[]
    >(
      `SELECT title, url, why_saved, content_summary, quick_tags, created_at, share_mode, share_password
       FROM bookmarks WHERE share_token = $1 LIMIT 1`,
      token
    )

    if (results.length === 0) {
      return NextResponse.json({ error: { message: "分享链接不存在" } }, { status: 404 })
    }

    const bm = results[0]

    // 私密模式 — 需要密码
    if (bm.share_mode === "private") {
      return NextResponse.json({ needsPassword: true })
    }

    return NextResponse.json({
      data: {
        title: bm.title,
        url: bm.url,
        whySaved: bm.why_saved,
        contentSummary: bm.content_summary,
        quickTags: bm.quick_tags,
        createdAt: bm.created_at,
        shareMode: bm.share_mode,
      },
    })
  } catch (error) {
    console.error("[Share Page GET Error]", error)
    return NextResponse.json({ error: { message: "获取失败" } }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await req.json()

    const results = await prisma.$queryRawUnsafe<
      {
        title: string
        url: string
        why_saved: string | null
        content_summary: string | null
        quick_tags: string[]
        created_at: Date
        share_mode: string | null
        share_password: string | null
      }[]
    >(
      `SELECT title, url, why_saved, content_summary, quick_tags, created_at, share_mode, share_password
       FROM bookmarks WHERE share_token = $1 LIMIT 1`,
      token
    )

    if (results.length === 0) {
      return NextResponse.json({ error: { message: "分享链接不存在" } }, { status: 404 })
    }

    const bm = results[0]

    // 密码校验
    if (bm.share_password && bm.share_password !== password) {
      return NextResponse.json({ error: { message: "密码错误" } }, { status: 403 })
    }

    return NextResponse.json({
      data: {
        title: bm.title,
        url: bm.url,
        whySaved: bm.why_saved,
        contentSummary: bm.content_summary,
        quickTags: bm.quick_tags,
        createdAt: bm.created_at,
        shareMode: bm.share_mode,
      },
    })
  } catch (error) {
    console.error("[Share Page POST Error]", error)
    return NextResponse.json({ error: { message: "验证失败" } }, { status: 500 })
  }
}
