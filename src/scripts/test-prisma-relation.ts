import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRelation() {
  const fund = await prisma.fund.findFirst({
    select: {
      id: true,
      name: true,
      performances: {
        select: {
          nav: true,
          date: true,
          fundId: true,
        },
        take: 3,
        orderBy: { date: 'desc' },
      },
    },
  });

  console.log('Fund with performances:');
  console.log(JSON.stringify(fund, null, 2));

  await prisma.$disconnect();
}

testRelation();
