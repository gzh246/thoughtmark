/**
 * Prisma 单例客户端
 *
 * 防止 Next.js 开发模式热重载下创建多个数据库连接。
 * 生产环境下每次冷启动只创建一个 PrismaClient 实例。
 *
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
