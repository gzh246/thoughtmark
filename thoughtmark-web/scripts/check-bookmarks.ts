import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()

async function main() {
  const user = await p.user.findFirst({ where: { email: "test2@example.com" } })
  if (!user) { console.log("no user"); return }

  const all = await p.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { title: true, url: true, createdAt: true },
  })

  console.log("Total bookmarks for test2:", all.length)
  all.forEach(b =>
    console.log("  ", b.createdAt.toISOString().slice(0, 19), (b.title || "").slice(0, 50), (b.url || "").slice(0, 60))
  )

  await p.$disconnect()
}

main()
