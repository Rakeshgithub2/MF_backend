import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Connect to the database
prisma
  .$connect()
  .then(() => console.log('✅ Prisma connected successfully'))
  .catch((err) => {
    console.error('❌ Prisma connection failed:', err);
  });

export default prisma;
