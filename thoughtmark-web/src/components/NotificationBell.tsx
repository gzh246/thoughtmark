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

  useEffect(() => {
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
        className="relative text-sm text-tm-muted transition-colors hover:text-tm2"
        aria-label="通知"
        id="notification-bell"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-tm-error text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-tm bg-tm2 shadow-lg">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-tm px-4 py-3">
            <span className="text-xs font-semibold text-tm">
              通知 {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-tm-accent hover:text-tm-accent-h"
              >
                全部标为已读
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-tm-muted">
                暂无新通知 ✨
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="border-b border-tm-50 px-4 py-3 last:border-0"
                >
                  <p className="text-xs text-tm">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-tm-muted">
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
