/**
 * 路由保护中间件
 *
 * Story 2.1: 保护需要登录的路由
 * - 未登录访问受保护页面 → 重定向到 /login
 * - 已登录访问 /login 或 /register → 重定向到 /
 * - /api/* 路由不做 redirect（让各 API 自行验证 JWT）
 *
 * Bug fix: 添加 CORS 支持，允许 Chrome Extension 跨域请求
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

/** CORS headers — 允许 Extension 跨域调用 API */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── CORS 预检请求处理 ──────────────────────
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  // ── API 路由：不做 redirect，追加 CORS headers ──
  if (pathname.startsWith("/api")) {
    const res = NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── 页面路由：原有认证逻辑 ──────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register")

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

