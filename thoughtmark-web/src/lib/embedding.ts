/**
 * AI Embedding 客户端（Story 5.1）
 *
 * 使用 OpenAI SDK 连接通义千问 DashScope 兼容 API
 * 将书签 title + whySaved 转为向量，用于 KMeans 聚类
 *
 * 切换到原生 OpenAI：只需改 baseURL 和 apiKey 环境变量
 */
import OpenAI from "openai"

/** 通义千问客户端（OpenAI 兼容模式） */
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

/**
 * 批量获取文本 Embedding 向量
 *
 * @param texts - 待向量化的文本数组，每条 = title + whySaved
 * @returns number[][] 每条文本对应一个向量
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  // DashScope 限制单次最多 10 条，分批处理
  const batchSize = 10
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const response = await client.embeddings.create({
      model: "text-embedding-v3",
      input: batch,
    })
    for (const item of response.data) {
      allEmbeddings.push(item.embedding)
    }
  }

  return allEmbeddings
}

/**
 * 简单 KMeans 聚类算法（纯 JS 实现）
 *
 * 将 N 个向量分为 K 组：
 * 1. 随机选 K 个质心
 * 2. 每个点归到最近质心
 * 3. 重新计算质心
 * 4. 重复直到收敛（或达最大迭代）
 *
 * @param vectors - N×D 维向量数组
 * @param k - 分组数
 * @param maxIter - 最大迭代数
 * @returns number[] 每个向量的分组编号（0 ~ k-1）
 */
export function kmeans(vectors: number[][], k: number, maxIter = 50): number[] {
  const n = vectors.length
  const dim = vectors[0].length

  // 随机挑 K 个点作为初始质心
  const centroids: number[][] = []
  const used = new Set<number>()
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n)
    if (!used.has(idx)) {
      used.add(idx)
      centroids.push([...vectors[idx]])
    }
  }

  let assignments = new Array<number>(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    // ── 分配：每个点归到最近质心 ──
    const newAssignments = vectors.map((v) => {
      let bestDist = Infinity
      let bestIdx = 0
      for (let c = 0; c < k; c++) {
        let dist = 0
        for (let d = 0; d < dim; d++) {
          dist += (v[d] - centroids[c][d]) ** 2
        }
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = c
        }
      }
      return bestIdx
    })

    // 检查收敛
    const converged = newAssignments.every((a, i) => a === assignments[i])
    assignments = newAssignments

    if (converged) break

    // ── 更新质心 ──
    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => assignments[i] === c)
      if (members.length === 0) continue
      for (let d = 0; d < dim; d++) {
        centroids[c][d] = members.reduce((s, v) => s + v[d], 0) / members.length
      }
    }
  }

  return assignments
}
