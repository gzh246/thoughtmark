"use client";

/**
 * 通知铃铛组件（修复 Bug — 后端 API 已实现但前端缺失）
 *
 * 功能：
 * - 轮询 /api/notifications 获取未读通知
 * - 显示红色数字 badge
 * - 点击展开下拉面板
 * - 支持"全部标为已读"
 */
import { useState, useEffect, useRef } from "react";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── 获取未读通知 ──────────────────────────
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch {
      // 静默失败
    }
  };

  useEffect(() => {
    fetchNotifications();
    // 每 60 秒轮询一次
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── 点击外部关闭 ──────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── 全部标已读 ──────────────────────────
  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications([]);
    } catch {
      // 静默
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        aria-label="通知"
        id="notification-bell"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              通知 {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-indigo-500 hover:text-indigo-600"
              >
                全部标为已读
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-400">
                暂无新通知 ✨
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="border-b border-zinc-50 px-4 py-3 last:border-0 dark:border-zinc-800"
                >
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {new Date(n.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
