import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllNav() {
  console.log('Deleting all NAV data...');

  const result = await prisma.fundPerformance.deleteMany({});

  console.log(`✅ Deleted ${result.count} performance records`);

  await prisma.$disconnect();
}

deleteAllNav().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
