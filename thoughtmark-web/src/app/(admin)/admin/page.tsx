"use client";

/**
 * 运营管理后台（Story 6.4 + 6.5）
 *
 * 管理员仪表盘 + 运营邮件发送
 * 访问路径：/admin
 * 权限：仅 isAdmin=true 的用户
 */
import { useState, useEffect } from "react";

interface Stats {
  wau: number;
  annotationRate: string;
  newUsersLast30d: number;
  totalUsers: number;
  proUsers: number;
  conversionRate: string;
  totalBookmarks: number;
  annotatedBookmarks: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 邮件表单
  const [emailTarget, setEmailTarget] = useState<"all" | "free" | "pro">("all");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  useEffect(() => {
    fetchStats();
    // 每小时自动刷新（AC 要求）
    const interval = setInterval(fetchStats, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
        setError("");
      } else if (res.status === 403) {
        setError("仅管理员可访问此页面");
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailHtml.trim()) return;
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: emailTarget, subject: emailSubject, html: emailHtml }),
      });
      const json = await res.json();
      if (res.ok) {
        setSendResult(`✅ ${json.data.message}`);
        setEmailSubject("");
        setEmailHtml("");
      } else {
        setSendResult(`❌ ${json.error?.message || "发送失败"}`);
      }
    } catch {
      setSendResult("❌ 网络错误");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            📊 运营仪表盘
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* ── 核心指标卡片 ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "WAU (周活)", value: stats?.wau || 0, color: "text-indigo-600" },
            { label: "注解填写率", value: stats?.annotationRate || "0%", color: "text-emerald-600" },
            { label: "30天新用户", value: stats?.newUsersLast30d || 0, color: "text-amber-600" },
            { label: "Pro 转化率", value: stats?.conversionRate || "0%", color: "text-purple-600" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* ── 详细统计 ── */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">详细数据</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-zinc-400">总用户</p>
            <p className="text-zinc-900 dark:text-zinc-100">{stats?.totalUsers}</p>
            <p className="text-zinc-400">Pro 用户</p>
            <p className="text-zinc-900 dark:text-zinc-100">{stats?.proUsers}</p>
            <p className="text-zinc-400">总书签</p>
            <p className="text-zinc-900 dark:text-zinc-100">{stats?.totalBookmarks}</p>
            <p className="text-zinc-400">有注解书签</p>
            <p className="text-zinc-900 dark:text-zinc-100">{stats?.annotatedBookmarks}</p>
          </div>
        </div>

        {/* ── Story 6.5: 运营邮件 ── */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">📧 发送运营邮件</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400">目标用户群</label>
              <select
                value={emailTarget}
                onChange={(e) => setEmailTarget(e.target.value as "all" | "free" | "pro")}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="all">全部用户</option>
                <option value="free">免费用户</option>
                <option value="pro">Pro 用户</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">邮件主题</label>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="例：Thoughtmark 新功能上线通知"
                className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">邮件正文 (HTML)</label>
              <textarea
                value={emailHtml}
                onChange={(e) => setEmailHtml(e.target.value)}
                placeholder="<p>Hi {{name}}，新功能上线了...</p>"
                rows={4}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? "发送中..." : "发送邮件"}
            </button>
            {sendResult && (
              <p className="text-xs text-zinc-500">{sendResult}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
