/**
 * chunker.ts — 文本 Chunk 拆分工具（Story 14.1）
 *
 * 将长文本按段落拆分为适合 Embedding 的 Chunk 数组。
 * 策略：
 *   1. 按双换行（段落）分割
 *   2. 超过 600 字的段落按中文句末标点（。！？）进一步拆分
 *   3. 相邻 Chunk 添加 50 字重叠（overlap），提升上下文连续性
 *   4. 过滤 < 30 字的碎片（噪声段落）
 */

/** 每个 Chunk 的目标最大字符数 */
const CHUNK_MAX_CHARS = 500

/** 相邻 Chunk 的重叠字符数 */
const CHUNK_OVERLAP = 50

/** Chunk 最小有效字符数（过短则丢弃） */
const CHUNK_MIN_CHARS = 30

/**
 * 将输入文本拆分为 Chunk 数组
 *
 * @param text - 原始正文文本
 * @returns 清洗后的 Chunk 字符串数组（已去重空白）
 */
export function splitIntoChunks(text: string): string[] {
  if (!text || text.trim().length < CHUNK_MIN_CHARS) return []

  // ── Step 1: 按段落（双换行）初步拆分 ──
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= CHUNK_MIN_CHARS)

  // ── Step 2: 超长段落进一步按句末标点拆分 ──
  const segments: string[] = []
  for (const para of paragraphs) {
    if (para.length <= CHUNK_MAX_CHARS) {
      segments.push(para)
    } else {
      // 按中文/英文句末标点拆分
      const sentences = para.split(/(?<=[。！？!?.])\s*/)
      let current = ""
      for (const sen of sentences) {
        if ((current + sen).length > CHUNK_MAX_CHARS && current.length > 0) {
          segments.push(current.trim())
          current = sen
        } else {
          current += sen
        }
      }
      if (current.trim().length >= CHUNK_MIN_CHARS) {
        segments.push(current.trim())
      }
    }
  }

  // ── Step 3: 添加相邻 Chunk 重叠（overlap） ──
  const chunks: string[] = []
  for (let i = 0; i < segments.length; i++) {
    let chunk = segments[i]

    // 向前追加上一段末尾 CHUNK_OVERLAP 字符作为前缀
    if (i > 0) {
      const prev = segments[i - 1]
      const overlap = prev.slice(-CHUNK_OVERLAP)
      chunk = overlap + " " + chunk
    }

    if (chunk.trim().length >= CHUNK_MIN_CHARS) {
      chunks.push(chunk.trim())
    }
  }

  return chunks
}
