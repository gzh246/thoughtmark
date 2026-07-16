const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const bookmarks = await p.bookmark.count();
  const users = await p.user.count();
  const clusters = await p.cluster.count();
  const withAnnotation = await p.bookmark.count({ where: { whySaved: { not: '' } } });
  console.log(JSON.stringify({ bookmarks, users, clusters, withAnnotation }, null, 2));
  await p['$disconnect']();
}

main().catch(e => { console.error(e.message); process.exit(1); });
