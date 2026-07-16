/**
 * Demo 数据种子脚本
 *
 * 为现有测试用户灌入 25 条带注解的示范书签 + 3 个 AI 聚类，
 * 让 Timeline 和 Clusters 页面有丰富的内容展示。
 *
 * 运行方式: npx tsx scripts/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── 25 条 Demo 书签 ──────────────────────────
const DEMO_BOOKMARKS = [
  // 聚类1: AI & 机器学习（8条）
  { url: 'https://openai.com/research/gpt-4', title: 'GPT-4 Technical Report', whySaved: '了解多模态大模型的技术实现路径，可能对我们的 Embedding 方案有启发', quickTags: ['学习资料'], daysAgo: 21 },
  { url: 'https://lilianweng.github.io/posts/2023-06-23-agent/', title: 'LLM Powered Autonomous Agents', whySaved: 'Agent 架构的最佳总结文章，ReAct + Tool Use 的思路很清晰', quickTags: ['学习资料'], daysAgo: 19 },
  { url: 'https://www.anthropic.com/research/constitutional-ai', title: 'Constitutional AI - Anthropic', whySaved: 'RLHF 的替代方案，对齐问题的新思路值得深入研究', quickTags: ['学习资料'], daysAgo: 17 },
  { url: 'https://huggingface.co/blog/embedding-quantization', title: 'Embedding 量化技术详解', whySaved: '向量检索成本优化的关键——量化后精度损失可控', quickTags: ['工作参考'], daysAgo: 14 },
  { url: 'https://arxiv.org/abs/2401.04088', title: 'Mixtral of Experts 论文', whySaved: 'MoE 架构让小模型也能有大模型的效果，通义千问可能也用了类似思路', quickTags: ['学习资料'], daysAgo: 12 },
  { url: 'https://www.deeplearning.ai/short-courses/building-agentic-rag/', title: 'Building Agentic RAG - DeepLearning.AI', whySaved: '吴恩达的 Agentic RAG 课程，和我们的知识管理方向高度相关', quickTags: ['学习资料'], daysAgo: 8 },
  { url: 'https://simonwillison.net/2024/Apr/8/aider-llm/', title: 'Aider: AI Pair Programming', whySaved: 'AI 辅助编程的最佳实践，能提升我们的开发效率', quickTags: ['工作参考', '灵感收藏'], daysAgo: 5 },
  { url: 'https://platform.openai.com/docs/guides/embeddings', title: 'OpenAI Embeddings Guide', whySaved: '对比通义千问和 OpenAI 的 Embedding 接口差异，为未来迁移做准备', quickTags: ['工作参考'], daysAgo: 2 },

  // 聚类2: Web 开发 & 架构（9条）
  { url: 'https://nextjs.org/blog/next-15', title: 'Next.js 15 Release Notes', whySaved: 'Partial Prerendering 看起来能大幅优化我们的首屏速度', quickTags: ['工作参考'], daysAgo: 20 },
  { url: 'https://tailwindcss.com/blog/tailwindcss-v4-alpha', title: 'Tailwind CSS v4 Alpha', whySaved: '⚠️ @theme inline 的行为变了！var() 会被编译为静态值，需要用 @layer utilities', quickTags: ['工作参考'], daysAgo: 18 },
  { url: 'https://www.prisma.io/blog/prisma-5-performance', title: 'Prisma 5 性能优化详解', whySaved: '连接池和查询引擎的改进，对我们的 P99 延迟指标有帮助', quickTags: ['工作参考'], daysAgo: 15 },
  { url: 'https://blog.cloudflare.com/workers-ai/', title: 'Cloudflare Workers AI', whySaved: '边缘计算跑 AI 推理——V2 架构的候选方案之一', quickTags: ['灵感收藏'], daysAgo: 13 },
  { url: 'https://vercel.com/blog/introducing-the-vercel-firewall', title: 'Vercel Firewall & WAF', whySaved: '部署后的安全防护，Rate Limiting 可以用 Vercel 原生方案替代 Upstash', quickTags: ['工作参考'], daysAgo: 10 },
  { url: 'https://kentcdodds.com/blog/common-mistakes-with-react-testing-library', title: 'Common React Testing Mistakes', whySaved: '测试最佳实践，避免写出脆弱的 E2E 测试', quickTags: ['学习资料'], daysAgo: 9 },
  { url: 'https://web.dev/articles/vitals', title: 'Web Vitals - Google', whySaved: 'Core Web Vitals 指标定义，上线前需要跑一遍 Lighthouse', quickTags: ['工作参考'], daysAgo: 6 },
  { url: 'https://developer.chrome.com/docs/extensions/develop/concepts/service-workers', title: 'Chrome Extension Service Workers', whySaved: 'MV3 Service Worker 生命周期深入理解，离线同步的关键', quickTags: ['学习资料'], daysAgo: 4 },
  { url: 'https://ui.shadcn.com/', title: 'shadcn/ui - Re-usable Components', whySaved: 'V2 UI 重构可以考虑用 shadcn，和 Tailwind v4 兼容性最好', quickTags: ['灵感收藏'], daysAgo: 1 },

  // 聚类3: 产品思维 & 用户增长（8条）
  { url: 'https://www.lennysnewsletter.com/p/how-the-biggest-consumer-apps-got', title: 'How Consumer Apps Got Their First 1000 Users', whySaved: '冷启动策略合集，Thoughtmark 可以参考 Notion 的社区驱动模式', quickTags: ['灵感收藏'], daysAgo: 22 },
  { url: 'https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit', title: 'Superhuman PMF Engine', whySaved: 'Sean Ellis 测试 + NPS 的组合拳，我们的 MVP 验证可以直接套用', quickTags: ['工作参考'], daysAgo: 16 },
  { url: 'https://www.intercom.com/blog/the-dribbblisation-of-design', title: 'The Dribbblisation of Design', whySaved: '视觉炫酷 ≠ 好设计，提醒自己不要过度追求动效而忽略可用性', quickTags: ['灵感收藏'], daysAgo: 11 },
  { url: 'https://www.nngroup.com/articles/ten-usability-heuristics/', title: 'Nielsen 10 Heuristics', whySaved: '每次做 UI 评审前都要重温一遍，尤其是「系统状态可见性」', quickTags: ['学习资料'], daysAgo: 7 },
  { url: 'https://posthog.com/blog/startup-metrics-guide', title: 'Startup Metrics That Matter', whySaved: '埋点指标设计参考——注解填写率、WAU、留存率的计算方式', quickTags: ['工作参考'], daysAgo: 3 },
  { url: 'https://every.to/chain-of-thought/the-knowledge-graph-that-changed-my-life', title: 'The Knowledge Graph That Changed My Life', whySaved: '这就是 Thoughtmark 想解决的问题！认知演化图谱的真实用例', quickTags: ['灵感收藏'], daysAgo: 23 },
  { url: 'https://julian.digital/2023/07/06/multi-layered-calendars/', title: 'Multi-Layered Calendars', whySaved: '时间轴 UI 的灵感来源——分层视图让信息密度更高', quickTags: ['灵感收藏'], daysAgo: 15 },
  { url: 'https://readwise.io/reader', title: 'Readwise Reader', whySaved: '竞品分析：Reader 做得好的是 RSS + 稍后读 + 划线，缺的是「为什么存」', quickTags: ['工作参考'], daysAgo: 0 },
];

// ── 3 个 AI 聚类 ──────────────────────────
const DEMO_CLUSTERS = [
  { name: 'AI & 机器学习前沿', bookmarkIndices: [0, 1, 2, 3, 4, 5, 6, 7] },
  { name: 'Web 开发 & 系统架构', bookmarkIndices: [8, 9, 10, 11, 12, 13, 14, 15, 16] },
  { name: '产品思维 & 用户增长', bookmarkIndices: [17, 18, 19, 20, 21, 22, 23, 24] },
];

async function main() {
  // 优先找 mcp-test 用户（浏览器登录的用户），否则找第一个用户
  let user = await prisma.user.findFirst({
    where: { email: { contains: 'mcp' } },
  });
  if (!user) {
    user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  }
  if (!user) {
    console.error('❌ 没有找到用户，请先注册一个账户');
    process.exit(1);
  }
  console.log(`✅ 找到用户: ${user.email} (${user.id})`);

  // 清理现有 demo 数据（避免重复运行产生重复）
  const deleted = await prisma.bookmark.deleteMany({ where: { userId: user.id } });
  console.log(`🗑️  清理了 ${deleted.count} 条旧书签`);

  const deletedClusters = await prisma.cluster.deleteMany({ where: { userId: user.id } });
  console.log(`🗑️  清理了 ${deletedClusters.count} 个旧聚类`);

  // 创建书签
  const now = Date.now();
  const bookmarkIds: string[] = [];

  for (const bm of DEMO_BOOKMARKS) {
    const created = await prisma.bookmark.create({
      data: {
        url: bm.url,
        title: bm.title,
        whySaved: bm.whySaved,
        quickTags: bm.quickTags,
        userId: user.id,
        createdAt: new Date(now - bm.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
    bookmarkIds.push(created.id);
  }
  console.log(`📚 创建了 ${bookmarkIds.length} 条 Demo 书签`);

  // 创建聚类 + 关联书签
  for (const cl of DEMO_CLUSTERS) {
    const cluster = await prisma.cluster.create({
      data: {
        name: cl.name,
        userId: user.id,
      },
    });

    // 关联书签到聚类
    for (const idx of cl.bookmarkIndices) {
      await prisma.bookmarkCluster.create({
        data: {
          bookmarkId: bookmarkIds[idx],
          clusterId: cluster.id,
        },
      });
    }
    console.log(`🧠 聚类「${cl.name}」关联了 ${cl.bookmarkIndices.length} 条书签`);
  }

  // 创建一条通知
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'CLUSTER_READY',
      message: 'AI 已为你整理出 3 个知识主题，去看看吧！',
      read: false,
    },
  });
  console.log('🔔 创建了 1 条聚类完成通知');

  console.log('\n🎉 Demo 数据灌入完成！刷新页面查看效果。');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
