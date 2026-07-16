/**
 * AI 聚类端到端测试脚本
 *
 * 1. 批量创建 20 条不同主题的书签（直接 Prisma 写入）
 * 2. 调用通义千问 Embedding API 生成向量
 * 3. KMeans 聚类
 * 4. 结果写入 Cluster + BookmarkCluster 表
 * 5. 创建 Notification
 *
 * 运行: npx tsx scripts/test-clustering.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 5 个主题方向的测试书签（每个 4 条）
const testBookmarks = [
  // ─── 前端框架 ───
  { url: "https://react.dev/learn", title: "React 官方教程", whySaved: "React 核心概念和 Hooks 用法学习", quickTags: ["学习资料"] },
  { url: "https://vuejs.org/guide", title: "Vue.js 入门指南", whySaved: "Vue 3 组合式 API 学习笔记", quickTags: ["学习资料"] },
  { url: "https://angular.dev", title: "Angular 开发者文档", whySaved: "Angular 信号和依赖注入机制", quickTags: ["学习资料"] },
  { url: "https://svelte.dev/docs", title: "Svelte 文档", whySaved: "Svelte 编译时框架和响应式原理", quickTags: ["学习资料"] },

  // ─── 后端与数据库 ───
  { url: "https://prisma.io/docs", title: "Prisma ORM 深入指南", whySaved: "Prisma 关系查询和事务处理最佳实践", quickTags: ["工作参考"] },
  { url: "https://www.postgresql.org/docs", title: "PostgreSQL 官方文档", whySaved: "PostgreSQL 索引优化和查询计划分析", quickTags: ["工作参考"] },
  { url: "https://redis.io/docs", title: "Redis 数据结构手册", whySaved: "Redis 缓存策略和消息队列模式", quickTags: ["工作参考"] },
  { url: "https://docs.nestjs.com", title: "NestJS 企业级后端框架", whySaved: "NestJS 依赖注入和模块化架构设计", quickTags: ["工作参考"] },

  // ─── AI 与机器学习 ───
  { url: "https://platform.openai.com/docs", title: "OpenAI API 文档", whySaved: "GPT-4 Function Calling 和 Embedding 接口", quickTags: ["灵感收藏"] },
  { url: "https://huggingface.co/docs", title: "HuggingFace Transformers", whySaved: "预训练模型微调和推理优化", quickTags: ["灵感收藏"] },
  { url: "https://langchain.com/docs", title: "LangChain 框架指南", whySaved: "RAG 检索增强生成和 Agent 链路设计", quickTags: ["灵感收藏"] },
  { url: "https://www.tensorflow.org/tutorials", title: "TensorFlow 教程", whySaved: "深度学习模型训练和部署流程", quickTags: ["学习资料"] },

  // ─── DevOps 与部署 ───
  { url: "https://vercel.com/docs", title: "Vercel 部署文档", whySaved: "Next.js 部署和 Edge Functions 配置", quickTags: ["工作参考"] },
  { url: "https://docs.docker.com", title: "Docker 容器化指南", whySaved: "Dockerfile 多阶段构建和容器编排", quickTags: ["工作参考"] },
  { url: "https://kubernetes.io/docs", title: "Kubernetes 入门", whySaved: "K8s Pod 调度和服务发现机制", quickTags: ["学习资料"] },
  { url: "https://github.com/features/actions", title: "GitHub Actions CI/CD", whySaved: "自动化测试和持续部署流水线配置", quickTags: ["工作参考"] },

  // ─── 设计与产品 ───
  { url: "https://www.figma.com/best-practices", title: "Figma 设计最佳实践", whySaved: "组件库设计规范和 Auto Layout 技巧", quickTags: ["灵感收藏"] },
  { url: "https://tailwindcss.com/docs", title: "Tailwind CSS 实用指南", whySaved: "原子化 CSS 设计系统和暗色模式方案", quickTags: ["灵感收藏"] },
  { url: "https://dribbble.com/shots/popular", title: "Dribbble 热门设计", whySaved: "UI 设计灵感和交互动效参考", quickTags: ["灵感收藏"] },
  { url: "https://www.nngroup.com/articles", title: "Nielsen Norman 用户体验", whySaved: "UX 可用性测试方法和设计心理学", quickTags: ["灵感收藏"] },
]

async function main() {
  console.log("🧪 AI 聚类测试开始...\n")

  // ── Step 1: 获取测试用户 ──
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })
  if (!user) {
    console.error("❌ 没有找到用户，请先注册")
    process.exit(1)
  }
  console.log(`👤 用户: ${user.email} (${user.id})`)

  // ── Step 2: 批量创建书签（跳过已存在的 URL） ──
  let created = 0
  for (const b of testBookmarks) {
    const existing = await prisma.bookmark.findFirst({
      where: { userId: user.id, url: b.url },
    })
    if (!existing) {
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          url: b.url,
          title: b.title,
          whySaved: b.whySaved,
          quickTags: b.quickTags,
        },
      })
      created++
    }
  }
  console.log(`📚 创建了 ${created} 条新书签（跳过 ${testBookmarks.length - created} 条已存在的）`)

  // ── Step 3: 统计带注解书签 ──
  const annotatedCount = await prisma.bookmark.count({
    where: { userId: user.id, whySaved: { not: null } },
  })
  console.log(`📝 带注解书签总数: ${annotatedCount}`)

  if (annotatedCount < 20) {
    console.log("⚠️ 不足 20 条带注解书签，跳过聚类")
    process.exit(0)
  }

  // ── Step 4: 获取所有带注解书签 ──
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id, whySaved: { not: null } },
    select: { id: true, title: true, whySaved: true, quickTags: true },
  })
  console.log(`\n🤖 开始 AI Embedding（${bookmarks.length} 条书签）...`)

  // ── Step 5: 调用通义千问 Embedding ──
  const { getEmbeddings, kmeans } = await import("../src/lib/embedding")

  const texts = bookmarks.map(
    (b) => `${b.title} - ${b.whySaved} [${(b.quickTags as string[])?.join(",")}]`
  )

  console.log("📡 调用通义千问 text-embedding-v3 API...")
  const embeddings = await getEmbeddings(texts)
  console.log(`✅ 获取到 ${embeddings.length} 个向量（维度: ${embeddings[0]?.length}）`)

  // ── Step 6: KMeans 聚类 ──
  const k = Math.min(5, Math.ceil(bookmarks.length / 4))
  console.log(`\n🔬 KMeans 聚类（k=${k}）...`)
  const assignments = kmeans(embeddings, k)

  // ── Step 7: 分组输出 ──
  const groups: Record<number, typeof bookmarks> = {}
  assignments.forEach((cluster, i) => {
    if (!groups[cluster]) groups[cluster] = []
    groups[cluster].push(bookmarks[i])
  })

  console.log("\n📊 聚类结果：\n")
  for (const [clusterId, items] of Object.entries(groups)) {
    // 用最频繁的 tag 作为主题名
    const tagCounts: Record<string, number> = {}
    items.forEach((b) => {
      const tags = b.quickTags as string[]
      tags?.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
    })
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || `主题 ${clusterId}`
    const clusterName = `${topTag} #${Number(clusterId) + 1}`

    console.log(`  🏷️ ${clusterName}（${items.length} 条）`)
    items.forEach((b) => console.log(`     📄 ${b.title}`))
    console.log("")
  }

  // ── Step 8: 写入数据库 ──
  console.log("💾 写入聚类结果到数据库...")

  // 清理旧结果
  await prisma.bookmarkCluster.deleteMany({
    where: { cluster: { userId: user.id } },
  })
  await prisma.cluster.deleteMany({ where: { userId: user.id } })

  for (const [clusterId, items] of Object.entries(groups)) {
    const tagCounts: Record<string, number> = {}
    items.forEach((b) => {
      const tags = b.quickTags as string[]
      tags?.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
    })
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || `主题 ${clusterId}`

    const cluster = await prisma.cluster.create({
      data: {
        userId: user.id,
        name: `${topTag} #${Number(clusterId) + 1}`,
      },
    })

    for (const b of items) {
      await prisma.bookmarkCluster.create({
        data: { bookmarkId: b.id, clusterId: cluster.id },
      })
    }
  }

  // 创建通知
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "CLUSTER_READY",
      message: `AI 已为你整理出 ${Object.keys(groups).length} 个主题分组`,
    },
  })

  console.log("✅ 聚类结果已写入数据库！")
  console.log(`\n🎉 测试完成！打开 http://localhost:3000/clusters 查看结果。\n`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("❌ 测试失败:", e)
  process.exit(1)
})
