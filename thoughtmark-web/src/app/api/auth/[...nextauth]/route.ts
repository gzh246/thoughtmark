/**
 * NextAuth v4 API Route Handler
 *
 * v4 用法：NextAuth(authOptions) 返回 handler 函数
 */
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
