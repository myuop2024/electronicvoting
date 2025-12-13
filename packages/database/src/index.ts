import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export types
export * from '@prisma/client';

// Export utility types
export type {
  Organization,
  User,
  Session,
  OrgMember,
  Election,
  Contest,
  ContestOption,
  Voter,
  Ballot,
  Vote,
  Allowlist,
  AllowlistEntry,
  AccessCode,
  PaperBallot,
  Observer,
  AuditLog,
  ApiKey,
  Webhook,
  Notification,
} from '@prisma/client';

// Helper functions
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
