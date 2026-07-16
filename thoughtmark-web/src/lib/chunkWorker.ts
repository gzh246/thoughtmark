/**
 * chunkWorker.ts — Chunk 粒度 Embedding Worker（Story 14.1）
 *
 * BullMQ Worker 消费 chunk-embedding 队列：
 *   1. 查询书签正文（page_content）
 *   2. 调用 splitIntoChunks() 拆分为段落数组
 *   3. 批量调用通义千问 Embedding API（≤10 条/批）
 *   4. 通过 raw SQL Upsert 写入 bookmark_chunks 表
 *
 * 触发时机：content-embedding Worker 完成后链式触发
 * 运行方式：由 workerProcess.ts 统一启动
 */
import { Worker } from "bullmq"
import { redisConnection } from "./queue"
import { getEmbeddings } from "./embedding"
import { prisma } from "./prisma"
import { splitIntoChunks } from "./chunker"

/** 将 number[] 向量格式化为 pgvector SQL 字面量: '[0.1,0.2,...]' */
function vectorToSql(vec: number[]): string {
  return `[${vec.join(",")}]`
}

/** Chunk Embedding Worker */
export const chunkWorker = new Worker(
  "chunk-embedding",
  async (job) => {
    const { bookmarkId } = job.data as { bookmarkId: string }
    console.log(`[ChunkWorker] 开始处理书签 ${bookmarkId}`)

    // ── 1. 查询书签正文 ──
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: { id: true, pageContent: true, title: true },
    })

    if (!bookmark || !bookmark.pageContent) {
      console.log(`[ChunkWorker] 书签 ${bookmarkId} 无正文，跳过`)
      return
    }

    // ── 2. 拆分为 Chunks ──
    const chunks = splitIntoChunks(bookmark.pageContent)
    if (chunks.length === 0) {
      console.log(`[ChunkWorker] 书签 ${bookmarkId} 正文太短，无有效 Chunk`)
      return
    }
    console.log(`[ChunkWorker] 书签 ${bookmarkId} 拆分为 ${chunks.length} 个 Chunk`)

    // ── 3. 批量 Embedding（≤10 条/批，遵守通义千问 API 限制） ──
    // 教训 #2: 通义千问 text-embedding-v3 批量上限为 10，不假设更大值
    const BATCH_SIZE = 10
    const allVectors: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const vectors = await getEmbeddings(batch)

      if (!vectors || vectors.length !== batch.length) {
        console.error(`[ChunkWorker] 书签 ${bookmarkId} 第 ${i}-${i + BATCH_SIZE} 批 Embedding 失败`)
        // 降级：用零向量占位，保证索引对齐
        const zeroVec = new Array(1024).fill(0)
        for (let j = 0; j < batch.length; j++) {
          allVectors.push(zeroVec)
        }
        continue
      }
      allVectors.push(...vectors)
    }

    // ── 4. Upsert 写入 bookmark_chunks 表（幂等） ──
    // 先通过 Prisma 写入元数据行，再通过 raw SQL 更新 embedding 列
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx]
      const vector = allVectors[idx]

      // Step 4a: Upsert 行（Prisma 管理 id/timestamps）
      const upserted = await prisma.bookmarkChunk.upsert({
        where: {
          bookmarkId_chunkIndex: {
            bookmarkId: bookmarkId,
            chunkIndex: idx,
          },
        },
        create: {
          bookmarkId,
          chunkIndex: idx,
          chunkText,
        },
        update: {
          chunkText,
        },
        select: { id: true },
      })

      // Step 4b: 更新 embedding 列（raw SQL，pgvector 类型）
      if (vector && vector.length > 0) {
        const vectorSql = vectorToSql(vector)
        await prisma.$executeRawUnsafe(
          `UPDATE bookmark_chunks SET embedding = $1::vector WHERE id = $2`,
          vectorSql,
          upserted.id
        )
      }
    }

    console.log(`[ChunkWorker] 书签 ${bookmarkId} 完成，写入 ${chunks.length} 个 Chunk`)
  },
  {
    connection: redisConnection,
    concurrency: 2, // Chunk 任务较重，降低并发度
  }
)

// Worker 事件日志
chunkWorker.on("completed", (job) => {
  console.log(`[ChunkWorker] Job ${job.id} 完成`)
})
chunkWorker.on("failed", (job, err) => {
  console.error(`[ChunkWorker] Job ${job?.id} 失败:`, err.message)
})
