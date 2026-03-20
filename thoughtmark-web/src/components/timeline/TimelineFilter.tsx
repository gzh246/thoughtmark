"use client";

/**
 * 时间范围筛选栏（Story 4.2）
 *
 * 预设快捷筛选：今天/本周/本月/全部
 * 选中后回调 from/to ISO 字符串给父组件
 */
import { useState } from "react";

/** 筛选选项 */
type FilterKey = "all" | "today" | "week" | "month";

interface TimelineFilterProps {
  onFilterChange: (from?: string, to?: string) => void;
  resultCount?: number;
}

/** 计算筛选时间范围 */
function getDateRange(key: FilterKey): { from?: string; to?: string } {
  const now = new Date();

  switch (key) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString() };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString() };
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start.toISOString() };
    }
    default:
      return {};
  }
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
];

export default function TimelineFilter({
  onFilterChange,
  resultCount,
}: TimelineFilterProps) {
  const [active, setActive] = useState<FilterKey>("all");

  const handleClick = (key: FilterKey) => {
    setActive(key);
    const { from, to } = getDateRange(key);
    onFilterChange(from, to);
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active === key
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {resultCount !== undefined && (
        <span className="text-xs text-zinc-400">
          {resultCount} 条记录
        </span>
      )}
    </div>
  );
}
