/**
 * NextAuth v5 配置
 *
 * Story 1.1: 建立基础骨架，providers 为空数组。
 * Story 2.1: 填充 CredentialsProvider（Email + 密码）
 * Story 2.2: 填充 GoogleProvider（OAuth）
 *
 * 使用 PrismaAdapter 将 session/account 数据存入 PostgreSQL。
 * session 策略为 JWT（无状态，适合插件端共享认证）。
 */
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [], // TODO(Story-2.1): 填充 CredentialsProvider
  session: { strategy: "jwt" },
})
