/**
 * NextAuth v5 类型声明扩展
 *
 * 扩展 Session 和 JWT 类型，添加自定义字段。
 * Story 2.1+ 根据需要添加更多字段（如 role、subscriptionTier 等）。
 */
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
