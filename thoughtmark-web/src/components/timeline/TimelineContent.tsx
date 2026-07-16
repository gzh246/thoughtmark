"use client";

/**
 * 时间轴内容包装组件（Story 4.2 + 4.3）
 *
 * 管理 filter 状态 + 详情侧边栏，协调子组件
 */
import { useState } from "react";
import TimelineFilter from "./TimelineFilter";
import TimelineList from "./TimelineList";
import BookmarkDetail from "./BookmarkDetail";
import type { Bookmark } from "@/lib/types";

export default function TimelineContent() {
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  // Story 4.3: 详情侧边栏
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  // 强制刷新 key（删除/更新后重新加载列表）
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilterChange = (newFrom?: string, newTo?: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
  };

  const handleUpdated = (updated: Bookmark) => {
    setSelectedBookmark(updated);
    setRefreshKey((k) => k + 1);
  };

  const handleDeleted = () => {
    setSelectedBookmark(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <TimelineFilter onFilterChange={handleFilterChange} />
      <TimelineList
        key={refreshKey}
        from={from}
        to={to}
        onBookmarkClick={handleBookmarkClick}
      />
      {selectedBookmark && (
        <BookmarkDetail
          bookmark={selectedBookmark}
          onClose={() => setSelectedBookmark(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
