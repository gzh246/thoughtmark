/**
 * BullMQ Worker 入口文件（生产部署用）
 *
 * 在 Docker 容器中作为独立进程运行，消费 Redis 队列：
 * - content-embedding: 书签正文 → 通义千问 Embedding → pgvector
 * - summary-generation: 书签正文 → 通义千问 Chat → AI 摘要
 * - chunk-embedding: 书签正文 → Chunk 拆分 → 批量 Embedding → bookmark_chunks（V3）
 *
 * 构建方式：Dockerfile 中 RUN npx tsx src/worker-entry.ts > /dev/null
 * 运行方式：entrypoint.sh 中 node worker-entry.js &
 */

// 直接导入 worker 文件即可自动注册 BullMQ Worker
import "./lib/embeddingWorker"
import "./lib/summaryWorker"
import "./lib/chunkWorker" // Story 14.1: Chunk 粒度 Embedding（V3 智能检索）

console.log("[Worker Entry] ✅ Embedding Worker + Summary Worker + Chunk Worker 已启动")
console.log("[Worker Entry] 等待 Redis 队列任务...")
