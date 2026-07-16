/**
 * 为演示用户手动触发深度聚类
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 找到 demo 用户
  const user = await prisma.user.findUnique({ where: { email: process.env.DEMO_EMAIL || 'demo.user@example.com' } });
  if (!user) { console.error('Demo user not found'); return; }
  console.log('User ID:', user.id);

  // 先检查现有聚类
  const existingClusters = await prisma.cluster.count({ where: { userId: user.id } });
  console.log('Existing clusters:', existingClusters);

  // 获取该用户所有带注解的书签
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id, whySaved: { not: '' } },
    select: { id: true, title: true, whySaved: true, quickTags: true, pageContent: true },
  });
  console.log('Bookmarks with annotations:', bookmarks.length);

  if (bookmarks.length < 5) {
    console.log('Not enough bookmarks for clustering');
    return;
  }

  // 手动做简单的主题聚类（基于 quickTags 分组）
  const topicMap = {};
  for (const bm of bookmarks) {
    // 从 URL 或标题推断主题
    let topic = 'General';
    const text = (bm.title + ' ' + bm.whySaved).toLowerCase();
    if (text.includes('ai') || text.includes('llm') || text.includes('gpt') || text.includes('embedding') || text.includes('transformer') || text.includes('rag')) topic = 'AI 与机器学习';
    else if (text.includes('react') || text.includes('next') || text.includes('tailwind') || text.includes('typescript') || text.includes('css') || text.includes('前端') || text.includes('frontend') || text.includes('framer') || text.includes('zustand') || text.includes('web vital')) topic = '前端开发技术';
    else if (text.includes('prisma') || text.includes('redis') || text.includes('bull') || text.includes('postgres') || text.includes('pgvector') || text.includes('node') || text.includes('auth') || text.includes('后端') || text.includes('backend') || text.includes('nodemailer')) topic = '后端与数据库';
    else if (text.includes('docker') || text.includes('nginx') || text.includes('deploy') || text.includes('ci') || text.includes('github action') || text.includes('ssl') || text.includes('pm2') || text.includes('部署')) topic = 'DevOps 与部署';
    else if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('font') || text.includes('color') || text.includes('svg') || text.includes('设计') || text.includes('灵感') || text.includes('dribbble')) topic = '设计与用户体验';

    if (!topicMap[topic]) topicMap[topic] = [];
    topicMap[topic].push(bm.id);
  }

  console.log('Topics found:', Object.keys(topicMap));

  // 为每个主题创建聚类
  for (const [topic, bmIds] of Object.entries(topicMap)) {
    const cluster = await prisma.cluster.create({
      data: {
        userId: user.id,
        name: topic,
        source: 'deep',
      },
    });

    // 关联书签到聚类
    for (const bmId of bmIds) {
      await prisma.bookmarkCluster.create({
        data: { bookmarkId: bmId, clusterId: cluster.id },
      });
    }
    console.log(`Created cluster "${topic}" with ${bmIds.length} bookmarks`);
  }

  const totalClusters = await prisma.cluster.count({ where: { userId: user.id } });
  console.log('Total clusters for demo user:', totalClusters);
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma['$disconnect']());
