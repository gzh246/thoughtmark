/**
 * BullMQ 队列初始化（Story 5.1 + Story 7.3）
 *
 * ai-cluster 队列：收藏满 20 条带注解书签后触发 AI 聚类
 * content-embedding 队列：书签保存后异步生成 Embedding 向量
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
let clusterQueue: Queue | undefined

export function getClusterQueue(): Queue {
  clusterQueue ??= new Queue("ai-cluster", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  })

  return clusterQueue
}

/** 导出连接配置供 Worker 复用 */
export { connection as redisConnection }

/** Story 7.3: 正文 Embedding 任务队列 */
let embeddingQueue: Queue | undefined

export function getEmbeddingQueue(): Queue {
  embeddingQueue ??= new Queue("content-embedding", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 50,
    },
  })

  return embeddingQueue
}

/** Story 8.1: AI 摘要生成队列 */
let summaryQueue: Queue | undefined

export function getSummaryQueue(): Queue {
  summaryQueue ??= new Queue("summary-generation", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 50,
    },
  })

  return summaryQueue
}

/** Story 11.4: 月度知识报告队列（BullMQ Repeatable Job） */
let monthlyReportQueue: Queue | undefined

export function getMonthlyReportQueue(): Queue {
  monthlyReportQueue ??= new Queue("monthly-report", {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: 12,  // 保留最近 12 个月
      removeOnFail: 6,
    },
  })

  return monthlyReportQueue
}

/** Story 14.1: Chunk 粒度 Embedding 队列（V3 智能检索） */
let chunkEmbeddingQueue: Queue | undefined

export function getChunkEmbeddingQueue(): Queue {
  chunkEmbeddingQueue ??= new Queue("chunk-embedding", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 50,
    },
  })

  return chunkEmbeddingQueue
}
