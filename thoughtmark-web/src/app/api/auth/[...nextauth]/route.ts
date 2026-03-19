/**
 * NextAuth v5 API Route Handler
 *
 * 从 lib/auth.ts 导入 handlers，暴露 GET 和 POST。
 * 所有认证相关配置集中在 lib/auth.ts 中管理。
 */
export { handlers as GET, handlers as POST } from "@/lib/auth"
