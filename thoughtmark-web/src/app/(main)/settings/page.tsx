"use client";

/**
 * 账户设置页面（Story 2.3 + 2.4 + 2.5 + 2.6）
 *
 * 功能区域：
 * - 基本信息（显示名称编辑）
 * - 密码修改
 * - 数据导出
 * - 危险区域（账户删除）
 */
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  // ── 用户数据 ──────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── 名称编辑 ──────────────────────────────
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // ── 密码修改 ──────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  // ── 账户删除 ──────────────────────────────
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── 加载用户信息 ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.data);
          setName(json.data.name || "");
        }
      } catch {
        // 静默
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── 保存名称 ──────────────────────────────
  const handleSaveName = async () => {
    setNameSaving(true);
    setNameMsg("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (res.ok) {
        setProfile(json.data);
        setNameMsg("✅ 名称已更新");
      } else {
        setNameMsg(`❌ ${json.error?.message || "更新失败"}`);
      }
    } catch {
      setNameMsg("❌ 网络错误");
    } finally {
      setNameSaving(false);
    }
  };

  // ── 修改密码 ──────────────────────────────
  const handleChangePassword = async () => {
    setPwdSaving(true);
    setPwdMsg("");
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (res.ok) {
        setPwdMsg("✅ 密码已更新");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setPwdMsg(`❌ ${json.error?.message || "修改失败"}`);
      }
    } catch {
      setPwdMsg("❌ 网络错误");
    } finally {
      setPwdSaving(false);
    }
  };

  // ── 导出数据 ──────────────────────────────
  const handleExport = () => {
    window.open("/api/user/export", "_blank");
  };

  // ── 删除账户 ──────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      }
    } catch {
      // 静默
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            ⚙️ 账户设置
          </h1>
          <a href="/timeline" className="text-xs text-indigo-500 hover:text-indigo-600">
            ← 返回时间轴
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* ── 基本信息（Story 2.3）──────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            基本信息
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">邮箱</label>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile?.email}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">注册时间</label>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("zh-CN") : "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">显示名称</label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {nameSaving ? "保存中..." : "保存"}
                </button>
              </div>
              {nameMsg && <p className="mt-1 text-xs text-zinc-500">{nameMsg}</p>}
            </div>
          </div>
        </section>

        {/* ── 密码修改（Story 2.4）──────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            修改密码
          </h2>
          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="当前密码"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 8 位）"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              onClick={handleChangePassword}
              disabled={pwdSaving || !currentPassword || newPassword.length < 8}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pwdSaving ? "修改中..." : "修改密码"}
            </button>
            {pwdMsg && <p className="text-xs text-zinc-500">{pwdMsg}</p>}
          </div>
        </section>

        {/* ── 数据导出（Story 2.5）──────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            数据导出
          </h2>
          <p className="mb-3 text-xs text-zinc-400">
            下载你的所有书签和注解数据（JSON 格式）
          </p>
          <button
            onClick={handleExport}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            📦 导出数据
          </button>
        </section>

        {/* ── 危险区域（Story 2.6）──────────── */}
        <section className="rounded-xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
            ⚠️ 危险区域
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            删除账户后，所有数据将被永久清除，不可恢复。请输入 <code className="rounded bg-red-50 px-1 text-red-600 dark:bg-red-950 dark:text-red-400">DELETE</code> 确认。
          </p>
          <div className="flex gap-2">
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='输入 "DELETE" 确认'
              className="flex-1 rounded-lg border border-red-200 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 dark:border-red-900 dark:bg-red-950/30 dark:text-zinc-100"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteInput !== "DELETE" || deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "删除中..." : "永久删除"}
            </button>
          </div>
        </section>

        {/* ── 退出登录 ──────────────────────── */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            退出登录
          </button>
        </div>
      </main>
    </div>
  );
}
