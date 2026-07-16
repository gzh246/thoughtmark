/**
 * Bookmark 类型定义（前端用）
 *
 * 与 Prisma Bookmark model 对应，用于 Timeline 组件
 */
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  whySaved: string | null;
  quickTags: string[];
  contentSummary: string | null; // V2: AI 生成摘要
  pageContent: string | null;    // V2: 网页正文（详情页用于判断是否已提取）
  userId: string;
  createdAt: string; // ISO 8601
}

/** API 分页响应格式 */
export interface BookmarkListResponse {
  data: Bookmark[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
