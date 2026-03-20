/**
 * 首页 — 重定向到时间轴
 *
 * Story 4.1: 替换 Next.js 默认模板
 * 已登录用户跳转 /timeline，未登录跳转 /login
 */
import { redirect } from "next/navigation";

export default function Home() {
  // TODO(Epic-4): 添加 session 检查，未登录跳转 /login
  redirect("/timeline");
}
