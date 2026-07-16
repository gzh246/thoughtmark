/**
 * 书签卡片组件（Story 4.1 + UI 打磨）
 *
 * 时间轴中每个书签的展示卡片：
 * - 标题（可点击跳转原文）
 * - URL 域名
 * - 相对时间（"3 天前"）
 * - 注解摘要（最多 2 行）
 * - 快选标签（多色化：学习=蓝 / 工作=紫 / 灵感=橙）
 * - Accent bar 左侧渐变条（hover 显现）
 * - 卡片阴影 + hover 上浮微动画
 */
import type { Bookmark } from "@/lib/types";
import { timeAgo, extractDomain } from "@/lib/utils";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  /** 列表中的索引，用于进场动画延迟 */
  index?: number;
}

/**
 * 标签色彩映射
 * 有匹配的中文标签名用对应色，否则用默认 accent 色
 */
const TAG_COLORS: Record<string, string> = {
  "学习资料": "tag-学习资料",
  "工作参考": "tag-工作参考",
  "灵感收藏": "tag-灵感收藏",
};

export default function BookmarkCard({ bookmark, onClick, index = 0 }: BookmarkCardProps) {
  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-tm bg-tm2 p-5 card-shadow transition-all duration-200 hover:border-tm-h hover:card-shadow-hover hover:-translate-y-0.5 cursor-pointer animate-fadeInUp"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
      onClick={() => onClick?.(bookmark)}
    >
      {/* Accent bar — hover 时显现的左侧渐变条 */}
      <div className="accent-bar" />

      {/* 标题 + 域名 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-tm line-clamp-1 group-hover:text-tm-accent transition-colors duration-200">
            {bookmark.title}
          </h3>
          <p className="mt-1 text-xs text-tm-muted tracking-wide">
            {extractDomain(bookmark.url)}
          </p>
        </div>
        <time className="shrink-0 text-xs text-tm-muted pt-0.5 tabular-nums">
          {timeAgo(bookmark.createdAt)}
        </time>
      </div>

      {/* 注解摘要（最多 2 行）*/}
      {bookmark.whySaved && (
        <p className="mt-3 text-sm text-tm2 line-clamp-2 leading-relaxed">
          💡 {bookmark.whySaved}
        </p>
      )}

      {/* Story 8.1 AC4: AI 摘要（最多 1 行）*/}
      {bookmark.contentSummary && (
        <p className="mt-2 text-xs text-tm-muted line-clamp-1 leading-relaxed">
          🤖 {bookmark.contentSummary}
        </p>
      )}

      {/* 快选标签（多色化） */}
      {bookmark.quickTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bookmark.quickTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-transform duration-150 hover:scale-105 ${
                TAG_COLORS[tag] ||
                "bg-tm-accent-sub text-tm-accent"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
