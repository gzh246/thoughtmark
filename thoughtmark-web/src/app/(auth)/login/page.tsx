/**
 * 登录页面
 *
 * Story 2.1: Email + 密码登录
 * 使用 NextAuth signIn("credentials") 完成认证。
 */
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("邮箱或密码错误")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("登录失败，请稍后重试")
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
        登录 Thoughtmark
      </h1>
      <p
        style={{
          color: "#94a3b8",
          fontSize: "0.875rem",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        记录你为什么收藏
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
            htmlFor="email"
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
            id="email"
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

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="password"
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
            id="password"
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
          {loading ? "登录中..." : "登录"}
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
        还没有账号？{" "}
        <Link
          href="/register"
          style={{ color: "#818cf8", textDecoration: "none" }}
        >
          注册
        </Link>
      </p>
    </>
  )
}
