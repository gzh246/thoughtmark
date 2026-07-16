/**
 * AI 聚类 Worker（Story 5.1）
 *
 * BullMQ Worker 消费 ai-cluster 队列：
 * 1. 查询用户所有带注解书签
 * 2. 调用通义千问 Embedding 向量化
 * 3. KMeans 聚类分组
 * 4. 结果写入 Cluster + BookmarkCluster
 * 5. 创建 Notification 通知用户
 *
 * 运行方式：独立进程 `npx tsx src/lib/clusterWorker.ts`
 * 或者在 API Route 中懒启动（开发阶段）
 */
import { Worker } from "bullmq"
import { redisConnection } from "./queue"
import { getEmbeddings, kmeans } from "./embedding"
import { prisma } from "./prisma"

/** 根据书签数量动态决定聚类数 */
function decideK(bookmarkCount: number): number {
  if (bookmarkCount <= 10) return 2
  if (bookmarkCount <= 30) return 3
  if (bookmarkCount <= 60) return 4
  return 5
}

/** 根据每组书签的高频 tag 命名主题 */
function generateClusterName(
  bookmarks: { quickTags: string[]; title: string }[],
  groupIndex: number
): string {
  // 统计该组所有 tag 出现次数
  const tagCounts = new Map<string, number>()
  for (const b of bookmarks) {
    for (const tag of b.quickTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // 找出现最多的 tag 作为主题名
  let maxTag = ""
  let maxCount = 0
  for (const [tag, count] of tagCounts) {
    if (count > maxCount) {
      maxCount = count
      maxTag = tag
    }
  }

  if (maxTag) return maxTag

  // 无 tag 时用第一条书签标题的前 15 字 + 组号
  const firstTitle = bookmarks[0]?.title || `主题 ${groupIndex + 1}`
  return firstTitle.length > 15 ? firstTitle.slice(0, 15) + "…" : firstTitle
}

/** 聚类 Worker */
export const clusterWorker = new Worker(
  "ai-cluster",
  async (job) => {
    const { userId } = job.data as { userId: string }
    console.log(`[AI Cluster] 开始处理用户 ${userId}`)

    // ── 1. 查询所有带注解书签 ──
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId, whySaved: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, whySaved: true, quickTags: true },
    })

    if (bookmarks.length < 5) {
      console.log(`[AI Cluster] 用户 ${userId} 带注解书签不足 5 条，跳过`)
      return
    }

    // ── 2. Embedding 向量化 ──
    const texts = bookmarks.map(
      (b) => `${b.title} ${b.whySaved || ""}`
    )
    const vectors = await getEmbeddings(texts)

    // ── 3. KMeans 聚类 ──
    const k = decideK(bookmarks.length)
    const assignments = kmeans(vectors, k)

    // ── 4. 清除旧聚类结果 → 写入新结果 ──
    await prisma.bookmarkCluster.deleteMany({
      where: { bookmark: { userId } },
    })
    await prisma.cluster.deleteMany({ where: { userId } })

    // 按分组创建 Cluster
    for (let g = 0; g < k; g++) {
      const memberBookmarks = bookmarks.filter((_, i) => assignments[i] === g)
      if (memberBookmarks.length === 0) continue

      const clusterName = generateClusterName(memberBookmarks, g)

      await prisma.cluster.create({
        data: {
          userId,
          name: clusterName,
          bookmarks: {
            create: memberBookmarks.map((b) => ({ bookmarkId: b.id })),
          },
        },
      })
    }

    // ── 5. 创建通知 ──
    await prisma.notification.create({
      data: {
        userId,
        type: "CLUSTER_READY",
        message: `你的 ${bookmarks.length} 条书签已按 ${k} 个主题整理好了，点击查看`,
      },
    })

    console.log(`[AI Cluster] 用户 ${userId} 聚类完成：${k} 个主题`)
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
)

// Worker 事件日志
clusterWorker.on("completed", (job) => {
  console.log(`[AI Cluster] Job ${job.id} 完成`)
})
clusterWorker.on("failed", (job, err) => {
  console.error(`[AI Cluster] Job ${job?.id} 失败:`, err.message)
})
