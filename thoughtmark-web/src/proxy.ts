import { getToken } from "next-auth/jwt"
import { type NextRequest, NextResponse } from "next/server"

/**
 * CORS headers used by the companion browser extension.
 * API routes perform their own authorization checks.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

/**
 * Apply extension CORS headers to API requests and guard authenticated pages.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  if (pathname.startsWith("/api")) {
    const res = NextResponse.next()
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.headers.set(key, value)
    })
    return res
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = Boolean(token)
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register")

  if (isAuthPage) {
    return isLoggedIn
      ? NextResponse.redirect(new URL("/", req.url))
      : NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
