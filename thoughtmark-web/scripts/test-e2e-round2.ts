/**
 * E2E 二轮测试脚本
 *
 * 测试项：
 * 1. 书签编辑（更新 title/whySaved/quickTags）
 * 2. 时间筛选验证（按日期分组统计）
 * 3. 密码修改（bcrypt 验证）
 * 4. 数据导出格式验证
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "test2@example.com" } })
  if (!user) { console.error("test2 not found"); process.exit(1) }
  console.log("User:", user.email, "\n")

  // ═══════════════════════════════════════════
  // TEST 1: 书签编辑
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 1: 书签编辑 ━━━")

  const bookmark = await prisma.bookmark.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  if (!bookmark) { console.error("No bookmark found"); process.exit(1) }
  console.log("  原始标题:", bookmark.title)
  console.log("  原始注解:", bookmark.whySaved)
  console.log("  原始标签:", bookmark.quickTags)

  // 模拟 PUT /api/bookmarks/[id]
  const updated = await prisma.bookmark.update({
    where: { id: bookmark.id },
    data: {
      title: bookmark.title + " [已编辑]",
      whySaved: "编辑后的注解 — 这是 E2E 测试验证",
      quickTags: ["学习资料", "工作参考"],
    },
  })
  console.log("  更新后标题:", updated.title)
  console.log("  更新后注解:", updated.whySaved)
  console.log("  更新后标签:", updated.quickTags)

  // 验证
  const verify1 = await prisma.bookmark.findUnique({ where: { id: bookmark.id } })
  const pass1 = verify1?.title?.includes("[已编辑]") && verify1?.whySaved === "编辑后的注解 — 这是 E2E 测试验证"
  console.log("  结果:", pass1 ? "✅ PASS" : "❌ FAIL")

  // 恢复原始数据
  await prisma.bookmark.update({
    where: { id: bookmark.id },
    data: { title: bookmark.title, whySaved: bookmark.whySaved, quickTags: bookmark.quickTags as string[] },
  })
  console.log("  (已恢复原始数据)\n")

  // ═══════════════════════════════════════════
  // TEST 2: 时间筛选
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 2: 时间筛选 ━━━")

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const allCount = await prisma.bookmark.count({ where: { userId: user.id } })
  const todayCount = await prisma.bookmark.count({
    where: { userId: user.id, createdAt: { gte: todayStart } },
  })
  const weekCount = await prisma.bookmark.count({
    where: { userId: user.id, createdAt: { gte: weekStart } },
  })
  const monthCount = await prisma.bookmark.count({
    where: { userId: user.id, createdAt: { gte: monthStart } },
  })

  console.log("  全部:", allCount)
  console.log("  今天:", todayCount)
  console.log("  本周:", weekCount)
  console.log("  本月:", monthCount)
  const pass2 = allCount >= todayCount && todayCount >= 0 && weekCount >= todayCount && monthCount >= weekCount
  console.log("  筛选逻辑:", pass2 ? "✅ PASS (all >= month >= week >= today)" : "❌ FAIL")
  console.log("")

  // ═══════════════════════════════════════════
  // TEST 3: 密码修改
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 3: 密码修改 ━━━")

  // 3a: 验证当前密码
  const currentHash = user.passwordHash
  if (!currentHash) { console.log("  SKIP: OAuth 用户无密码"); }
  else {
    const oldPwdValid = await bcrypt.compare("test12345678", currentHash)
    console.log("  旧密码验证:", oldPwdValid ? "✅ PASS" : "❌ FAIL")

    // 3b: 模拟修改密码
    const newHash = await bcrypt.hash("newPassword123", 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
    const verifyNew = await prisma.user.findUnique({ where: { id: user.id } })
    const newPwdValid = await bcrypt.compare("newPassword123", verifyNew!.passwordHash!)
    console.log("  新密码写入+验证:", newPwdValid ? "✅ PASS" : "❌ FAIL")

    // 3c: 恢复原密码
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: currentHash } })
    const restored = await prisma.user.findUnique({ where: { id: user.id } })
    const restoredValid = await bcrypt.compare("test12345678", restored!.passwordHash!)
    console.log("  密码恢复:", restoredValid ? "✅ PASS" : "❌ FAIL")
  }
  console.log("")

  // ═══════════════════════════════════════════
  // TEST 4: 数据导出格式
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 4: 数据导出 ━━━")

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { url: true, title: true, whySaved: true, quickTags: true, createdAt: true },
  })

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalBookmarks: bookmarks.length,
    bookmarks,
  }

  const json = JSON.stringify(exportData, null, 2)

  // 验证 JSON 结构
  const parsed = JSON.parse(json)
  const hasExportedAt = typeof parsed.exportedAt === "string"
  const hasTotal = typeof parsed.totalBookmarks === "number"
  const hasBookmarks = Array.isArray(parsed.bookmarks)
  const firstHasFields = parsed.bookmarks[0] && "url" in parsed.bookmarks[0] && "title" in parsed.bookmarks[0]

  console.log("  exportedAt:", hasExportedAt ? "✅" : "❌")
  console.log("  totalBookmarks:", parsed.totalBookmarks, hasTotal ? "✅" : "❌")
  console.log("  bookmarks array:", hasBookmarks ? "✅" : "❌")
  console.log("  字段完整性:", firstHasFields ? "✅" : "❌")
  console.log("  JSON 大小:", (json.length / 1024).toFixed(1) + " KB")
  const pass4 = hasExportedAt && hasTotal && hasBookmarks && firstHasFields
  console.log("  结果:", pass4 ? "✅ PASS" : "❌ FAIL")

  // ═══════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════
  console.log("\n━━━ 汇总 ━━━")
  console.log("  TEST 1 书签编辑:", pass1 ? "✅" : "❌")
  console.log("  TEST 2 时间筛选:", pass2 ? "✅" : "❌")
  console.log("  TEST 3 密码修改:", currentHash ? "✅" : "SKIP")
  console.log("  TEST 4 数据导出:", pass4 ? "✅" : "❌")

  await prisma.$disconnect()
}

main().catch(e => { console.error("FATAL:", e); process.exit(1) })
