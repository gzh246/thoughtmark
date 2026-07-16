/**
 * Q4: AI 洞察结果缓存工具
 *
 * 7 天缓存策略 — 避免重复调用 LLM
 * 用法：
 *   const cached = await getInsightCache(userId, type, cacheKey)
 *   if (cached) return cached
 *   ... call LLM ...
 *   await setInsightCache(userId, type, cacheKey, content)
 */
import { prisma } from "./prisma"

const CACHE_TTL_DAYS = 7

/** 读取缓存（未过期时返回 content，否则返回 null） */
export async function getInsightCache(
  userId: string,
  type: string,
  cacheKey: string = "default"
): Promise<string | null> {
  try {
    const entry = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `SELECT content FROM insight_cache
       WHERE user_id = $1 AND type = $2 AND cache_key = $3 AND expires_at > NOW()
       LIMIT 1`,
      userId, type, cacheKey
    )
    return entry.length > 0 ? entry[0].content : null
  } catch {
    // 表不存在时静默返回 null（migration 前兜底）
    return null
  }
}

/** 写入缓存（upsert） */
export async function setInsightCache(
  userId: string,
  type: string,
  cacheKey: string = "default",
  content: string
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
    await prisma.$executeRawUnsafe(
      `INSERT INTO insight_cache (id, user_id, type, cache_key, content, expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, type, cache_key) DO UPDATE
       SET content = EXCLUDED.content, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      userId, type, cacheKey, content, expiresAt
    )
  } catch (e) {
    console.error("[InsightCache] 写入失败:", e)
  }
}
