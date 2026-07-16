"use client";

/**
 * SSE 实时通知 Toast（Story 12.3）
 *
 * 通过 EventSource 连接 /api/notifications/stream，
 * 收到通知时弹出 Toast。
 */
import { useState, useEffect, useCallback } from "react";

interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: number;
}

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;

        const notification: Notification = {
          id: `${Date.now()}-${Math.random()}`,
          message: data.message || "新通知",
          type: data.type || "info",
          timestamp: Date.now(),
        };

        setNotifications((prev) => [...prev, notification]);

        // 5 秒后自动消失
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 5000);
      } catch {
        // 忽略解析错误
      }
    };

    es.onerror = () => {
      // SSE 断连时自动重连（浏览器默认行为）
    };

    return () => es.close();
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  if (notifications.length === 0) return null;

  const COLORS = {
    info: "border-blue-400/30 bg-blue-500/10 text-blue-300",
    success: "border-green-400/30 bg-green-500/10 text-green-300",
    warning: "border-yellow-400/30 bg-yellow-500/10 text-yellow-300",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`animate-fadeInUp rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            COLORS[n.type]
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{n.message}</span>
            <button
              onClick={() => dismiss(n.id)}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
