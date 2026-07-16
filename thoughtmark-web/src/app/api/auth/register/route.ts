/**
 * 注册 API
 *
 * POST /api/auth/register
 * Body: { email: string, password: string, name?: string }
 *
 * Story 2.1: Email + 密码注册
 * - 校验：email 格式、password ≥ 8 位
 * - 查重：Email 已注册 → 409
 * - 创建：bcrypt.hash(password, 12) → prisma.user.create()
 */
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

/** 简单的 email 格式正则 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // ── 参数校验 ──────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { message: "邮箱和密码不能为空" },
        { status: 400 }
      )
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "邮箱格式不正确" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "密码至少 8 位" },
        { status: 400 }
      )
    }

    // ── 邮箱查重 ──────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { message: "该邮箱已被使用" },
        { status: 409 }
      )
    }

    // ── 创建用户 ──────────────────────────────
    // bcrypt cost factor 12（PRD NFR 安全要求）
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    })

    return NextResponse.json(
      { id: user.id, email: user.email },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Register API Error]", error)
    return NextResponse.json(
      { message: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
