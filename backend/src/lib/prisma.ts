// Prisma singleton - tránh quá nhiều connection trong dev (hot reload)

import { PrismaClient } from '@prisma/client';
import { isProd } from '@/config/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
