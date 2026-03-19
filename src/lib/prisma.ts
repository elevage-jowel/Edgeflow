import { PrismaClient } from '../generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const url = process.env.DATABASE_URL || 'file:./dev.db'

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url })
  return new PrismaClient({ adapter })
}

type PrismaInstance = ReturnType<typeof createClient>

const globalForPrisma = globalThis as unknown as { prisma: PrismaInstance }

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
