/**
 * Token 生成 API
 *
 * GET /api/auth/token
 *
 * Story 3.1: 为插件端提供 JWT token
 * 已登录用户访问此 API 获取当前 session 的 JWT，
 * 复制到插件端即可完成认证。
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录 Web App" } },
        { status: 401 }
      )
    }

    // 返回原始 JWT token（从 cookie 中提取）
    // NextAuth v4 将 JWT 存在名为 next-auth.session-token 的 cookie 中
    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: "TOKEN_NOT_FOUND", message: "未找到 session token" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        token: sessionToken,
        userId: token.id,
        email: token.email,
      },
    })
  } catch (error) {
    console.error("[Token API Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "获取 token 失败" } },
      { status: 500 }
    )
  }
}
