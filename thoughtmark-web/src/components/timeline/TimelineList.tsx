"use client";

/**
 * 时间轴列表组件（Story 4.1）
 *
 * 核心功能：
 * - 调用 GET /api/bookmarks 获取书签列表
 * - Intersection Observer 实现无限滚动
 * - 每页 20 条，按时间倒序
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { Bookmark, BookmarkListResponse } from "@/lib/types";
import BookmarkCard from "./BookmarkCard";

interface TimelineListProps {
  /** 时间范围筛选（Story 4.2 预留） */
  from?: string;
  to?: string;
  /** 点击书签卡片的回调（Story 4.3 预留） */
  onBookmarkClick?: (bookmark: Bookmark) => void;
}

export default function TimelineList({ from, to, onBookmarkClick }: TimelineListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── 加载一页数据 ──────────────────────────
  const loadPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("获取书签失败");

      const json: BookmarkListResponse = await res.json();

      setBookmarks((prev) =>
        pageNum === 1 ? json.data : [...prev, ...json.data]
      );
      setHasMore(pageNum < json.meta.totalPages);
      setPage(pageNum);
    } catch {
      setError("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [loading, from, to]);

  // ── 首次加载 + 筛选变化时重置 ──────────────
  useEffect(() => {
    setBookmarks([]);
    setPage(1);
    setHasMore(true);
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // ── Intersection Observer 无限滚动 ────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(page + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onClick={onBookmarkClick}
        />
      ))}

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 空状态 */}
      {!loading && bookmarks.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="mt-3 text-sm text-zinc-500">还没有收藏</p>
          <p className="text-xs text-zinc-400">使用浏览器插件开始收藏你的第一个书签吧</p>
        </div>
      )}

      {/* 加载更多：滚动哨兵 */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}

      {/* 到底了 */}
      {!hasMore && bookmarks.length > 0 && (
        <p className="py-6 text-center text-xs text-zinc-400">
          — 已经到底了 —
        </p>
      )}
    </div>
  );
}
