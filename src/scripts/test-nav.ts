import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testNav() {
  console.log('Testing NAV data retrieval...\n');

  const fund = await prisma.fund.findFirst({
    where: { amfiCode: 'FRANK009' },
    select: {
      id: true,
      name: true,
      amfiCode: true,
      performances: {
        orderBy: { date: 'desc' },
        take: 1,
        select: {
          nav: true,
          date: true,
        },
      },
    },
  });

  console.log('Fund:', fund);
  console.log('\nPerformances array:', fund?.performances);
  console.log('First performance:', fund?.performances[0]);
  console.log('NAV:', fund?.performances[0]?.nav);

  await prisma.$disconnect();
}

testNav();
