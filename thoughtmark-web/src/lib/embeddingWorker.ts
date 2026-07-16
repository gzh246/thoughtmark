/**
 * 正文 Embedding Worker（Story 7.3 + Story 8.1）
 *
 * BullMQ Worker 消费 content-embedding 队列：
 * 1. 查询书签的 pageContent
 * 2. 调用通义千问 Embedding API 生成 1024 维向量
 * 3. 通过 raw SQL 存入 pgvector content_embedding 列
 *
 * 运行方式：独立进程 `npx tsx src/lib/embeddingWorker.ts`
 * 或在 API Route 中懒启动（开发阶段）
 */
import { Worker } from "bullmq"
import {
  getChunkEmbeddingQueue,
  getSummaryQueue,
  redisConnection,
} from "./queue"
import { getEmbeddings } from "./embedding"
import { prisma } from "./prisma"

/** 将 number[] 向量格式化为 pgvector SQL 字面量: '[0.1,0.2,...]' */
function vectorToSql(vec: number[]): string {
  return `[${vec.join(",")}]`
}

/** Embedding Worker */
export const embeddingWorker = new Worker(
  "content-embedding",
  async (job) => {
    const { bookmarkId } = job.data as { bookmarkId: string }
    console.log(`[Embedding] 开始处理书签 ${bookmarkId}`)

    // ── 1. 查询书签正文 ──
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: { id: true, pageContent: true, title: true },
    })

    if (!bookmark) {
      console.warn(`[Embedding] 书签 ${bookmarkId} 不存在，跳过`)
      return
    }

    if (!bookmark.pageContent) {
      console.log(`[Embedding] 书签 ${bookmarkId} 无正文，跳过`)
      return
    }

    // ── 2. 调用通义千问 Embedding ──
    // 截取正文前 8000 字符（避免超出 API 限制）
    const text = `${bookmark.title} ${bookmark.pageContent.slice(0, 8000)}`
    const [vector] = await getEmbeddings([text])

    if (!vector || vector.length === 0) {
      console.warn(`[Embedding] 书签 ${bookmarkId} Embedding 生成失败`)
      return
    }

    // ── 3. 通过 raw SQL 存入 pgvector ──
    // Prisma 不原生支持 vector 类型，使用 $executeRawUnsafe
    const vectorSql = vectorToSql(vector)
    await prisma.$executeRawUnsafe(
      `UPDATE bookmarks SET content_embedding = $1::vector WHERE id = $2`,
      vectorSql,
      bookmarkId
    )

    console.log(`[Embedding] 书签 ${bookmarkId} 向量化完成 (${vector.length}维)`)

    // Story 8.1: 链式触发摘要生成
    try {
      await getSummaryQueue().add("summarize", { bookmarkId })
    } catch (err) {
      console.error(`[Embedding] 摘要任务入队失败:`, err)
    }

    // Story 14.1: 链式触发 Chunk Embedding（V3 智能检索）
    try {
      await getChunkEmbeddingQueue().add("chunk-embed", { bookmarkId })
    } catch (err) {
      // 降级：Chunk 任务失败不影响书签正常使用
      console.error(`[Embedding] Chunk 任务入队失败（降级，不中断）:`, err)
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
)

// Worker 事件日志
embeddingWorker.on("completed", (job) => {
  console.log(`[Embedding] Job ${job.id} 完成`)
})
embeddingWorker.on("failed", (job, err) => {
  console.error(`[Embedding] Job ${job?.id} 失败:`, err.message)
})
