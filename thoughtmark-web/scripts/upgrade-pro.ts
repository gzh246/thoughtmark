import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.update({ where: { email: 'mcp-test@example.com' }, data: { plan: 'pro' } })
  .then(u => console.log(`${u.email} → plan: ${u.plan}`))
  .finally(() => p.$disconnect());
