/**
 * 书签卡片组件（Story 4.1）
 *
 * 时间轴中每个书签的展示卡片：
 * - 标题（可点击跳转原文）
 * - URL 域名
 * - 相对时间（"3 天前"）
 * - 注解摘要（最多 2 行）
 * - 快选标签
 */
import type { Bookmark } from "@/lib/types";
import { timeAgo, extractDomain } from "@/lib/utils";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
}

export default function BookmarkCard({ bookmark, onClick }: BookmarkCardProps) {
  return (
    <article
      className="group relative rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 cursor-pointer"
      onClick={() => onClick?.(bookmark)}
    >
      {/* 标题 + 域名 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {bookmark.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {extractDomain(bookmark.url)}
          </p>
        </div>
        <time className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 pt-0.5">
          {timeAgo(bookmark.createdAt)}
        </time>
      </div>

      {/* 注解摘要（最多 2 行）*/}
      {bookmark.whySaved && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          💡 {bookmark.whySaved}
        </p>
      )}

      {/* 快选标签 */}
      {bookmark.quickTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bookmark.quickTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
