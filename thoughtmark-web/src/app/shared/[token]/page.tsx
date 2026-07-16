"use client";

/**
 * 分享公开页面（Story 12.2 + B1 私密模式）
 *
 * GET /shared/[token]
 *
 * 无需登录，展示分享的书签标题+摘要+注解
 * 如果是私密分享，需要先输入密码
 */
import { useState, useEffect } from "react";
import Link from "next/link";

interface SharedBookmark {
  title: string;
  url: string;
  whySaved: string | null;
  contentSummary: string | null;
  quickTags: string[];
  createdAt: string;
  shareMode: string | null;
  needsPassword: boolean;
}

export default function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState("");
  const [bookmark, setBookmark] = useState<SharedBookmark | null>(null);
  const [loadedToken, setLoadedToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  // 解析 token
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // 加载分享数据
  useEffect(() => {
    if (!token) return;
    fetch(`/api/shared/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.needsPassword) {
          setNeedsPassword(true);
        } else if (json.data) {
          setBookmark(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadedToken(token));
  }, [token]);

  const loading = !token || loadedToken !== token;

  // 提交密码
  const submitPassword = async () => {
    setPasswordError("");
    const res = await fetch(`/api/shared/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (json.data) {
      setBookmark(json.data);
      setNeedsPassword(false);
    } else {
      setPasswordError(json.error?.message || "密码错误");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <span className="text-white animate-pulse">加载中...</span>
      </div>
    );
  }

  // 私密分享 — 密码输入
  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-8 w-80 text-center">
          <p className="text-2xl mb-3">🔒</p>
          <p className="text-white font-medium mb-1">私密分享</p>
          <p className="text-sm text-slate-400 mb-4">请输入密码查看内容</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPassword()}
            placeholder="输入密码"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 mb-3"
          />
          {passwordError && (
            <p className="text-xs text-red-400 mb-2">{passwordError}</p>
          )}
          <button
            onClick={submitPassword}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            查看内容
          </button>
        </div>
      </div>
    );
  }

  if (!bookmark) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-white">页面不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* 品牌头 */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <span className="text-lg font-semibold">
            🔖 Thoughtmark
          </span>
          <Link
            href="/"
            className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            开始收藏知识
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* 标题 */}
        <h1 className="text-2xl font-bold leading-tight text-white">
          {bookmark.title}
        </h1>

        {/* 原文链接 */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-sm text-indigo-400 hover:underline"
        >
          查看原文 ↗
        </a>

        {/* AI 摘要 */}
        {bookmark.contentSummary && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-5">
            <p className="mb-2 text-xs font-medium text-indigo-400">🤖 AI 摘要</p>
            <p className="text-sm leading-relaxed text-slate-300">
              {bookmark.contentSummary}
            </p>
          </div>
        )}

        {/* 用户注解 */}
        {bookmark.whySaved && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-5">
            <p className="mb-2 text-xs font-medium text-amber-400">💬 收藏者的注解</p>
            <p className="text-sm text-slate-300 italic">
              {bookmark.whySaved}
            </p>
          </div>
        )}

        {/* 标签 */}
        {bookmark.quickTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {bookmark.quickTags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 收藏时间 */}
        <p className="mt-6 text-xs text-slate-500">
          收藏于 {new Date(bookmark.createdAt).toLocaleDateString("zh-CN")}
        </p>

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-center">
          <p className="text-lg font-semibold text-white">
            用 AI 管理你的知识收藏
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Thoughtmark — 让每一次收藏都有价值
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            免费开始使用
          </Link>
        </div>
      </main>
    </div>
  );
}
