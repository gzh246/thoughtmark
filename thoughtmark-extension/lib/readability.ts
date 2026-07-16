/**
 * Readability 正文提取封装
 *
 * Story 7.1: 使用 @mozilla/readability 从网页 DOM 中提取正文内容。
 * 在 content script 环境中运行（有 DOM 访问权限）。
 *
 * @module lib/readability
 */
import { Readability } from '@mozilla/readability';

/** Readability 提取结果 */
export interface ExtractedContent {
  /** 文章标题 */
  title: string;
  /** 正文 HTML（已清洗） */
  content: string;
  /** 纯文本摘要（前 500 字） */
  excerpt: string;
  /** 完整纯文本（用于 Embedding） */
  textContent: string;
  /** 提取耗时（ms） */
  extractionTimeMs: number;
}

/**
 * 从当前页面 DOM 提取正文内容
 *
 * 克隆 document 后交给 Readability 处理，
 * 避免修改原始页面 DOM。
 *
 * @returns 提取结果，失败返回 null
 */
export function extractPageContent(): ExtractedContent | null {
  const start = performance.now();

  try {
    // 克隆 document，避免 Readability 修改原始 DOM
    const docClone = document.cloneNode(true) as Document;
    const reader = new Readability(docClone);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn('[Thoughtmark] Readability 未能提取正文');
      return null;
    }

    const extractionTimeMs = Math.round(performance.now() - start);

    return {
      title: article.title || document.title || '',
      content: article.content || '',
      excerpt: (article.textContent || '').slice(0, 500).trim(),
      textContent: article.textContent || '',
      extractionTimeMs,
    };
  } catch (err) {
    console.warn('[Thoughtmark] 正文提取失败:', err);
    return null;
  }
}
