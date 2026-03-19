/**
 * 路由保护中间件
 *
 * Story 2.1: 保护需要登录的路由
 * - 未登录访问受保护页面 → 重定向到 /login
 * - 已登录访问 /login 或 /register → 重定向到 /
 * - /api/auth/* 不拦截（NextAuth 需要）
 *
 * 使用 getToken() 检查 JWT（而非 auth() wrapper），
 * 兼容 Next.js 16 的 middleware convention。
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token
  const { pathname } = req.nextUrl

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register")
  const isApiAuth = pathname.startsWith("/api/auth")

  // NextAuth API 路由不拦截
  if (isApiAuth) return NextResponse.next()

  // 已登录用户访问登录/注册页 → 重定向到首页
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // 未登录用户访问受保护页面 → 重定向到登录页
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
