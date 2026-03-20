/**
 * 注册页面
 *
 * Story 2.1: Email + 密码注册
 * - 调用 POST /api/auth/register 创建用户
 * - 成功后自动调用 signIn("credentials") 登录
 */
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // ── 前端校验 ──────────────────────────────
    if (password.length < 8) {
      setError("密码至少 8 位")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setLoading(true)

    try {
      // ── 调用注册 API ──────────────────────────
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "注册失败")
        setLoading(false)
        return
      }

      // ── 注册成功，自动登录 ──────────────────────
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (loginResult?.error) {
        // 注册成功但自动登录失败 — 引导手动登录
        router.push("/login")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("注册失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#f1f5f9",
          marginBottom: "0.5rem",
          textAlign: "center",
        }}
      >
        注册 Thoughtmark
      </h1>
      <p
        style={{
          color: "#94a3b8",
          fontSize: "0.875rem",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        开始记录你的思维轨迹
      </p>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "1rem",
            color: "#fca5a5",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="name"
            style={{
              display: "block",
              color: "#cbd5e1",
              fontSize: "0.875rem",
              marginBottom: "0.375rem",
            }}
          >
            昵称 <span style={{ color: "#64748b" }}>（可选）</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="reg-email"
            style={{
              display: "block",
              color: "#cbd5e1",
              fontSize: "0.875rem",
              marginBottom: "0.375rem",
            }}
          >
            邮箱
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="reg-password"
            style={{
              display: "block",
              color: "#cbd5e1",
              fontSize: "0.875rem",
              marginBottom: "0.375rem",
            }}
          >
            密码
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="至少 8 位"
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="reg-confirm"
            style={{
              display: "block",
              color: "#cbd5e1",
              fontSize: "0.875rem",
              marginBottom: "0.375rem",
            }}
          >
            确认密码
          </label>
          <input
            id="reg-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="再输入一次密码"
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.625rem",
            background: loading
              ? "rgba(99, 102, 241, 0.5)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "注册中..." : "注册"}
        </button>
      </form>

      {/* Story 2.2: Google OAuth */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          margin: "1.25rem 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>或</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        style={{
          width: "100%",
          padding: "0.625rem",
          background: "transparent",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          color: "#f1f5f9",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        🔗 Continue with Google
      </button>

      <p
        style={{
          color: "#94a3b8",
          fontSize: "0.8rem",
          textAlign: "center",
          marginTop: "1.25rem",
        }}
      >
        已有账号？{" "}
        <Link
          href="/login"
          style={{ color: "#818cf8", textDecoration: "none" }}
        >
          登录
        </Link>
      </p>
    </>
  )
}
