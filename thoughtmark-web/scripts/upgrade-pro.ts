import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const u = await p.user.update({
    where: { email: "test2@example.com" },
    data: { plan: "pro" },
  })
  console.log("Updated:", u.email, "plan:", u.plan)
  await p.$disconnect()
}
main()
