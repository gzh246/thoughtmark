/**
 * 数据导出 API（Story 2.5: GDPR FR6）
 *
 * GET /api/user/export
 *
 * 导出当前用户所有书签为 JSON 文件下载
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

    // 获取用户所有书签
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: token.id as string },
      orderBy: { createdAt: "desc" },
      select: {
        url: true,
        title: true,
        whySaved: true,
        quickTags: true,
        createdAt: true,
      },
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalBookmarks: bookmarks.length,
      bookmarks,
    }

    // 返回 JSON 文件下载
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="thoughtmark-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    console.error("[Data Export Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "数据导出失败" } },
      { status: 500 }
    )
  }
}
