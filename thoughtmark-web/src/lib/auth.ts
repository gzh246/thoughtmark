/**
 * NextAuth v4 配置
 *
 * Story 1.1: 建立基础骨架。
 * Story 2.1: 填充 CredentialsProvider（Email + 密码登录）
 * Story 2.2: 填充 GoogleProvider（OAuth）
 *
 * 注意：当前安装的是 next-auth@4.x（非 v5），API 不同：
 * - v4: authOptions 导出 + NextAuth(authOptions) 在 route 中调用
 * - v5: NextAuth() 返回 { handlers, auth, signIn, signOut }
 *
 * 使用 PrismaAdapter 将 session/account 数据存入 PostgreSQL。
 * session 策略为 JWT（无状态，适合插件端共享认证）。
 */
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * 验证用户凭据
       * - 查询用户 → bcrypt.compare() → 返回 user 或 null
       * - 返回 null 时 NextAuth 会自动返回认证失败
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // 用户不存在 或 用户没有密码（OAuth 注册的用户）
        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
    // Story 2.2: Google OAuth — 需要 GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // 同 Email 自动合并账户
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * JWT callback: 将 user.id 写入 token
     * 首次登录时 user 对象存在，后续请求只有 token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    /**
     * Session callback: 从 token 中读取 id 写入 session.user
     * 前端通过 useSession() 获取 session.user.id
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
