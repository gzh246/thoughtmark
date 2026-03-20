/**
 * 通用工具函数
 *
 * Story 4.1: timeAgo — 相对时间显示（"3 天前"、"刚刚"等）
 */

/**
 * 将 Date/ISO 字符串转换为中文相对时间
 * @example timeAgo("2026-03-18T10:00:00Z") => "2 天前"
 */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  if (weeks < 5) return `${weeks} 周前`;
  return `${months} 个月前`;
}

/**
 * 从完整 URL 提取域名（不含 www.）
 * @example extractDomain("https://www.example.com/path") => "example.com"
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
