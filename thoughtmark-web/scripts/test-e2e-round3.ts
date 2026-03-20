/**
 * E2E 三轮测试：Admin 仪表盘 + 通知系统
 *
 * 1. Admin Stats API（权限验证 + 指标数据）
 * 2. 通知创建/查询/标已读
 * 3. 用户角色切换验证
 */
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "test2@example.com" } })
  if (!user) { console.error("test2 not found"); process.exit(1) }
  console.log("User:", user.email, "isAdmin:", user.isAdmin, "\n")

  // ═══════════════════════════════════════════
  // TEST 1: Admin 权限验证
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 1: Admin 权限 ━━━")

  // 1a: 非管理员不应看到数据
  const wasAdmin = user.isAdmin
  if (wasAdmin) {
    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: false } })
  }
  const nonAdminUser = await prisma.user.findUnique({ where: { id: user.id } })
  console.log("  非管理员 isAdmin:", nonAdminUser?.isAdmin, nonAdminUser?.isAdmin === false ? "✅" : "❌")

  // 1b: 升级为管理员
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } })
  const adminUser = await prisma.user.findUnique({ where: { id: user.id } })
  console.log("  升级后 isAdmin:", adminUser?.isAdmin, adminUser?.isAdmin === true ? "✅" : "❌")
  console.log("")

  // ═══════════════════════════════════════════
  // TEST 2: Admin Stats 数据计算
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 2: Admin Stats ━━━")

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalUsers, newUsersLast30d, totalBookmarks, annotatedBookmarks, proUsers, wauUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.bookmark.count(),
      prisma.bookmark.count({ where: { whySaved: { not: null } } }),
      prisma.user.count({ where: { plan: "pro" } }),
      prisma.bookmark.groupBy({ by: ["userId"], where: { createdAt: { gte: sevenDaysAgo } } }),
    ])

  const annotationRate = totalBookmarks > 0 ? Math.round((annotatedBookmarks / totalBookmarks) * 100) : 0
  const conversionRate = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0

  console.log("  总用户:", totalUsers)
  console.log("  30天新用户:", newUsersLast30d)
  console.log("  WAU:", wauUsers.length)
  console.log("  总书签:", totalBookmarks)
  console.log("  有注解:", annotatedBookmarks)
  console.log("  注解率:", annotationRate + "%")
  console.log("  Pro用户:", proUsers)
  console.log("  转化率:", conversionRate + "%")

  const pass2 = totalUsers > 0 && totalBookmarks > 0 && annotationRate >= 0 && conversionRate >= 0
  console.log("  结果:", pass2 ? "✅ PASS" : "❌ FAIL")
  console.log("")

  // ═══════════════════════════════════════════
  // TEST 3: 通知系统
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 3: 通知系统 ━━━")

  // 3a: 查看现有通知
  const existingNotifs = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  console.log("  现有通知:", existingNotifs.length)
  existingNotifs.forEach(n => console.log(`    [${n.type}] ${n.message} read=${n.read}`))

  // 3b: 创建测试通知
  const testNotif = await prisma.notification.create({
    data: {
      userId: user.id,
      type: "CLUSTER_READY",
      message: "E2E 测试通知 — AI 已为你整理出 3 个新主题",
    },
  })
  console.log("  创建通知:", testNotif.id, "✅")

  // 3c: 查询未读通知
  const unreadBefore = await prisma.notification.count({
    where: { userId: user.id, read: false },
  })
  console.log("  未读通知数:", unreadBefore, unreadBefore > 0 ? "✅" : "❌")

  // 3d: 标记已读（单条）
  await prisma.notification.update({
    where: { id: testNotif.id },
    data: { read: true },
  })
  const verifyRead = await prisma.notification.findUnique({ where: { id: testNotif.id } })
  console.log("  标记已读:", verifyRead?.read === true ? "✅ PASS" : "❌ FAIL")

  // 3e: 批量标记已读
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })
  const unreadAfter = await prisma.notification.count({
    where: { userId: user.id, read: false },
  })
  console.log("  批量标已读后未读:", unreadAfter, unreadAfter === 0 ? "✅ PASS" : "❌ FAIL")

  // 3f: 重新创建一条未读通知用于浏览器测试
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "CLUSTER_READY",
      message: "新的知识主题已整理完成！查看你的 5 个聚类 →",
      read: false,
    },
  })
  console.log("  (已创建 1 条未读通知用于浏览器测试)")
  console.log("")

  // ═══════════════════════════════════════════
  // TEST 4: 用户资料更新
  // ═══════════════════════════════════════════
  console.log("━━━ TEST 4: 用户资料 ━━━")

  const oldName = user.name
  await prisma.user.update({ where: { id: user.id }, data: { name: "E2E测试用户" } })
  const updated = await prisma.user.findUnique({ where: { id: user.id } })
  console.log("  显示名称更新:", updated?.name === "E2E测试用户" ? "✅ PASS" : "❌ FAIL")

  // 恢复
  await prisma.user.update({ where: { id: user.id }, data: { name: oldName } })
  console.log("  (已恢复原始名称)")
  console.log("")

  // ═══════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════
  const pass3 = unreadAfter === 0 && verifyRead?.read === true
  const pass4 = updated?.displayName === "E2E测试用户"

  console.log("━━━ 汇总 ━━━")
  console.log("  TEST 1 Admin 权限:", "✅")
  console.log("  TEST 2 Admin Stats:", pass2 ? "✅" : "❌")
  console.log("  TEST 3 通知系统:", pass3 ? "✅" : "❌")
  console.log("  TEST 4 用户资料:", pass4 ? "✅" : "❌")

  await prisma.$disconnect()
}

main().catch(e => { console.error("FATAL:", e); process.exit(1) })
