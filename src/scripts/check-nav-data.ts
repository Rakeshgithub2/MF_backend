import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkNavData() {
  console.log('Checking NAV data across all funds...\n');

  // Count funds
  const fundCount = await prisma.fund.count();
  console.log(`Total funds: ${fundCount}`);

  // Count performance records
  const perfCount = await prisma.fundPerformance.count();
  console.log(`Total performance records: ${perfCount}\n`);

  // Get a few funds with their performance counts
  const funds = await prisma.fund.findMany({
    take: 10,
    select: {
      name: true,
      amfiCode: true,
      performances: {
        select: {
          nav: true,
          date: true,
        },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });

  console.log('Sample funds with latest NAV:');
  for (const fund of funds) {
    console.log(
      `  ${fund.name}: ${fund.performances[0]?.nav || 'NO DATA'} (${fund.performances[0]?.date || 'N/A'})`
    );
  }

  await prisma.$disconnect();
}

checkNavData();
