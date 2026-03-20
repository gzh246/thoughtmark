"use client";

/**
 * 时间轴内容包装组件（Story 4.2）
 *
 * 管理 filter 状态，协调 TimelineFilter 和 TimelineList
 */
import { useState } from "react";
import TimelineFilter from "./TimelineFilter";
import TimelineList from "./TimelineList";
import type { Bookmark } from "@/lib/types";

export default function TimelineContent() {
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const handleFilterChange = (newFrom?: string, newTo?: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    // Story 4.3: 打开详情面板（预留）
    window.open(bookmark.url, "_blank");
  };

  return (
    <>
      <TimelineFilter onFilterChange={handleFilterChange} />
      <TimelineList
        from={from}
        to={to}
        onBookmarkClick={handleBookmarkClick}
      />
    </>
  );
}
