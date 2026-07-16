// scripts/check-chunks-table.ts
// 用于验证 bookmark_chunks 表是否已成功创建
import { prisma } from "../src/lib/prisma"

async function main() {
  const tableExists = await prisma.$queryRaw<{exists: boolean}[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'bookmark_chunks'
    ) as exists
  `
  console.log("bookmark_chunks table exists:", tableExists[0]?.exists)

  if (tableExists[0]?.exists) {
    const cols = await prisma.$queryRaw<{column_name: string, data_type: string}[]>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'bookmark_chunks'
      ORDER BY ordinal_position
    `
    console.log("columns:", cols.map(c => `${c.column_name}(${c.data_type})`).join(", "))
  }
  await prisma.$disconnect()
}
main().catch(e => { console.error(e.message); process.exit(1) })
