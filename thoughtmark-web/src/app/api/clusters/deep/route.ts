/**
 * 深度聚类 API（Story 10.1）
 *
 * POST /api/clusters/deep
 *
 * 基于 pgvector Embedding 向量的 KMeans 聚类：
 * 1. 读取所有有 content_embedding 的书签向量
 * 2. 手写 KMeans（余弦距离，k = ceil(√(n/2))）
 * 3. LLM 生成聚类主题名
 * 4. 写入 Cluster + BookmarkCluster
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

const chatClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

/** 余弦相似度 */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10)
}

/** 向量加法（归位用） */
function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i])
}

/** 向量除以标量 */
function vecDiv(a: number[], s: number): number[] {
  return a.map(v => v / s)
}

/** 简单 KMeans 聚类 */
function kmeans(
  vectors: number[][],
  k: number,
  maxIter: number = 20
): number[] {
  const n = vectors.length
  const dim = vectors[0].length

  // 随机初始化质心（选前 k 个不同的点）
  const usedIndices = new Set<number>()
  const centroids: number[][] = []
  while (centroids.length < k && usedIndices.size < n) {
    const idx = Math.floor(Math.random() * n)
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx)
      centroids.push([...vectors[idx]])
    }
  }

  const assignments = new Array(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    // 分配: 每个点分到最相似的质心
    let changed = false
    for (let i = 0; i < n; i++) {
      let bestCluster = 0
      let bestSim = -Infinity
      for (let c = 0; c < k; c++) {
        const sim = cosineSim(vectors[i], centroids[c])
        if (sim > bestSim) {
          bestSim = sim
          bestCluster = c
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster
        changed = true
      }
    }

    if (!changed) break

    // 更新质心
    for (let c = 0; c < k; c++) {
      let sum = new Array(dim).fill(0)
      let count = 0
      for (let i = 0; i < n; i++) {
        if (assignments[i] === c) {
          sum = vecAdd(sum, vectors[i])
          count++
        }
      }
      if (count > 0) {
        centroids[c] = vecDiv(sum, count)
      }
    }
  }

  return assignments
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const userId = token.id as string

    // ── 1. 读取所有有 Embedding 的书签 ──────────
    const bookmarks = await prisma.$queryRawUnsafe<
      { id: string; title: string; embedding: string }[]
    >(
      `SELECT id, title, content_embedding::text as embedding
       FROM bookmarks
       WHERE user_id = $1 AND content_embedding IS NOT NULL`,
      userId
    )

    if (bookmarks.length < 5) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_DATA", message: "至少需要 5 条有正文的书签" } },
        { status: 400 }
      )
    }

    // ── 2. 解析向量 ──────────────────────────────
    const vectors = bookmarks.map(b => {
      const raw = b.embedding.replace(/[\[\]]/g, "")
      return raw.split(",").map(Number)
    })

    // ── 3. KMeans 聚类 ──────────────────────────
    const k = Math.max(2, Math.ceil(Math.sqrt(bookmarks.length / 2)))
    const assignments = kmeans(vectors, k)

    // ── 4. 分组 ──────────────────────────────────
    const groups: Map<number, typeof bookmarks> = new Map()
    for (let i = 0; i < bookmarks.length; i++) {
      const cluster = assignments[i]
      if (!groups.has(cluster)) groups.set(cluster, [])
      groups.get(cluster)!.push(bookmarks[i])
    }

    // ── 5. 为每组生成主题名 + 写入 DB ──────────
    // 先清除旧的深度聚类（以 [深度] 前缀标识）
    await prisma.$executeRawUnsafe(
      `DELETE FROM bookmark_clusters WHERE cluster_id IN (
        SELECT id FROM clusters WHERE user_id = $1 AND name LIKE '[深度]%'
      )`,
      userId
    )
    await prisma.$executeRawUnsafe(
      `DELETE FROM clusters WHERE user_id = $1 AND name LIKE '[深度]%'`,
      userId
    )

    const createdClusters: { name: string; count: number }[] = []

    for (const [, members] of groups) {
      if (members.length < 2) continue

      // LLM 命名
      const titleList = members.map(m => m.title).join("\n- ")
      const completion = await chatClient.chat.completions.create({
        model: "qwen-plus",
        messages: [
          {
            role: "system",
            content: "根据以下文章标题，生成一个 3-6 字的主题名称。只返回名称，不要解释。",
          },
          { role: "user", content: `- ${titleList}` },
        ],
        max_tokens: 30,
        temperature: 0.3,
      })

      const rawName =
        completion.choices[0]?.message?.content?.trim() || `主题 ${createdClusters.length + 1}`
      const clusterName = `[深度] ${rawName}`

      // 写入 Cluster
      const cluster = await prisma.cluster.create({
        data: {
          name: clusterName,
          userId,
        },
      })

      // 写入 BookmarkCluster
      for (const member of members) {
        await prisma.bookmarkCluster.create({
          data: {
            bookmarkId: member.id,
            clusterId: cluster.id,
          },
        })
      }

      createdClusters.push({ name: clusterName, count: members.length })
    }

    return NextResponse.json({
      data: {
        k,
        clusters: createdClusters,
        totalBookmarks: bookmarks.length,
      },
    })
  } catch (error) {
    console.error("[Deep Clustering Error]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "深度聚类失败" } },
      { status: 500 }
    )
  }
}
