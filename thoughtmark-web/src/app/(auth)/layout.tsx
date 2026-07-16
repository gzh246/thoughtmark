/**
 * 认证页面共享布局
 *
 * (auth) 是 Next.js Route Group — 不影响 URL 路径。
 * /login 和 /register 页面共享这个居中卡片布局。
 *
 * 🅲 设计决策：Auth 页面永远保持深色，不跟随主题切换。
 * 理由：登录页是品牌第一印象，深色渐变更显高级感。
 * 参考：Notion、GitHub、Vercel 的 auth 页都是固定深色。
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#1e293b",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {children}
      </div>
    </div>
  )
}
