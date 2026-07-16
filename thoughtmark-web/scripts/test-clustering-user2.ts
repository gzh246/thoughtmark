/**
 * 为 test2 用户创建聚类 — 修复用户 ID 问题
 */
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const testBookmarks = [
  { url: "https://react.dev/learn", title: "React 官方教程", whySaved: "React 核心概念和 Hooks 用法学习", quickTags: ["学习资料"] },
  { url: "https://vuejs.org/guide", title: "Vue.js 入门指南", whySaved: "Vue 3 组合式 API 学习笔记", quickTags: ["学习资料"] },
  { url: "https://angular.dev", title: "Angular 开发者文档", whySaved: "Angular 信号和依赖注入机制", quickTags: ["学习资料"] },
  { url: "https://svelte.dev/docs", title: "Svelte 文档", whySaved: "Svelte 编译时框架和响应式原理", quickTags: ["学习资料"] },
  { url: "https://prisma.io/docs", title: "Prisma ORM 深入指南", whySaved: "Prisma 关系查询和事务处理最佳实践", quickTags: ["工作参考"] },
  { url: "https://www.postgresql.org/docs", title: "PostgreSQL 官方文档", whySaved: "PostgreSQL 索引优化和查询计划分析", quickTags: ["工作参考"] },
  { url: "https://redis.io/docs", title: "Redis 数据结构手册", whySaved: "Redis 缓存策略和消息队列模式", quickTags: ["工作参考"] },
  { url: "https://docs.nestjs.com", title: "NestJS 企业级后端框架", whySaved: "NestJS 依赖注入和模块化架构设计", quickTags: ["工作参考"] },
  { url: "https://platform.openai.com/docs", title: "OpenAI API 文档", whySaved: "GPT-4 Function Calling 和 Embedding 接口", quickTags: ["灵感收藏"] },
  { url: "https://huggingface.co/docs", title: "HuggingFace Transformers", whySaved: "预训练模型微调和推理优化", quickTags: ["灵感收藏"] },
  { url: "https://langchain.com/docs", title: "LangChain 框架指南", whySaved: "RAG 检索增强生成和 Agent 链路设计", quickTags: ["灵感收藏"] },
  { url: "https://www.tensorflow.org/tutorials", title: "TensorFlow 教程", whySaved: "深度学习模型训练和部署流程", quickTags: ["学习资料"] },
  { url: "https://vercel.com/docs", title: "Vercel 部署文档", whySaved: "Next.js 部署和 Edge Functions 配置", quickTags: ["工作参考"] },
  { url: "https://docs.docker.com", title: "Docker 容器化指南", whySaved: "Dockerfile 多阶段构建和容器编排", quickTags: ["工作参考"] },
  { url: "https://kubernetes.io/docs", title: "Kubernetes 入门", whySaved: "K8s Pod 调度和服务发现机制", quickTags: ["学习资料"] },
  { url: "https://github.com/features/actions", title: "GitHub Actions CI/CD", whySaved: "自动化测试和持续部署流水线配置", quickTags: ["工作参考"] },
  { url: "https://www.figma.com/best-practices", title: "Figma 设计最佳实践", whySaved: "组件库设计规范和 Auto Layout 技巧", quickTags: ["灵感收藏"] },
  { url: "https://tailwindcss.com/docs", title: "Tailwind CSS 实用指南", whySaved: "原子化 CSS 设计系统和暗色模式方案", quickTags: ["灵感收藏"] },
  { url: "https://dribbble.com/shots/popular", title: "Dribbble 热门设计", whySaved: "UI 设计灵感和交互动效参考", quickTags: ["灵感收藏"] },
  { url: "https://www.nngroup.com/articles", title: "Nielsen Norman 用户体验", whySaved: "UX 可用性测试方法和设计心理学", quickTags: ["灵感收藏"] },
]

async function main() {
  // 找 test2 用户
  const user = await prisma.user.findFirst({
    where: { email: "test2@example.com" },
  })
  if (!user) { console.error("test2 not found"); process.exit(1) }
  console.log("User:", user.email, user.id)

  // 创建书签
  let created = 0
  for (const b of testBookmarks) {
    const existing = await prisma.bookmark.findFirst({ where: { userId: user.id, url: b.url } })
    if (!existing) {
      await prisma.bookmark.create({ data: { userId: user.id, ...b } })
      created++
    }
  }
  console.log("Created:", created)

  // Embedding + KMeans
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id, whySaved: { not: null } },
    select: { id: true, title: true, whySaved: true, quickTags: true },
  })
  console.log("Bookmarks for clustering:", bookmarks.length)

  const { getEmbeddings, kmeans } = await import("../src/lib/embedding")
  const texts = bookmarks.map(b => `${b.title} - ${b.whySaved}`)
  console.log("Calling DashScope Embedding API...")
  const embeddings = await getEmbeddings(texts)
  console.log("Got", embeddings.length, "vectors, dim:", embeddings[0]?.length)

  const k = Math.min(5, Math.ceil(bookmarks.length / 4))
  const assignments = kmeans(embeddings, k)

  const groups: Record<number, typeof bookmarks> = {}
  assignments.forEach((c, i) => { if (!groups[c]) groups[c] = []; groups[c].push(bookmarks[i]) })

  // 清理旧 + 写入新
  await prisma.bookmarkCluster.deleteMany({ where: { cluster: { userId: user.id } } })
  await prisma.cluster.deleteMany({ where: { userId: user.id } })

  for (const [cid, items] of Object.entries(groups)) {
    const tags: Record<string, number> = {}
    items.forEach(b => (b.quickTags as string[])?.forEach(t => { tags[t] = (tags[t] || 0) + 1 }))
    const topTag = Object.entries(tags).sort((a, b) => b[1] - a[1])[0]?.[0] || "主题"
    const cluster = await prisma.cluster.create({ data: { userId: user.id, name: `${topTag} #${Number(cid) + 1}` } })
    for (const b of items) {
      await prisma.bookmarkCluster.create({ data: { bookmarkId: b.id, clusterId: cluster.id } })
    }
    console.log(`Cluster "${topTag} #${Number(cid) + 1}": ${items.length} bookmarks`)
  }

  await prisma.notification.create({
    data: { userId: user.id, type: "CLUSTER_READY", message: `AI 已为你整理出 ${Object.keys(groups).length} 个主题` },
  })

  console.log("DONE! Check /clusters in browser.")
  await prisma.$disconnect()
}
main()
