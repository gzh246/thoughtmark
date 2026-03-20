/**
 * BullMQ 队列初始化（Story 5.1）
 *
 * ai-cluster 队列：收藏满 20 条带注解书签后触发 AI 聚类
 *
 * Redis 连接配置：
 * - 开发环境：本地 Docker redis://localhost:6379
 * - 生产环境：Upstash Redis
 *
 * 注意：使用 BullMQ 内置的 ioredis，不单独安装 ioredis（避免版本冲突）
 */
import { Queue } from "bullmq"

/** Redis 连接配置（BullMQ 接受 URL 字符串或 ConnectionOptions） */
const redisConnection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
}

/** 解析 Redis URL 为 BullMQ ConnectionOptions */
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port || "6379"),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null as null,
    }
  } catch {
    return { host: "localhost", port: 6379, maxRetriesPerRequest: null as null }
  }
}

const connection = parseRedisUrl(redisConnection.url)

/** AI 聚类任务队列 */
export const clusterQueue = new Queue("ai-cluster", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

/** 导出连接配置供 Worker 复用 */
export { connection as redisConnection }
