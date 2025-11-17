#!/usr/bin/env ts-node

/**
 * Script to manually trigger AMFI data ingestion
 * This will fetch and store real mutual fund NAV data from AMFI India
 *
 * Usage: ts-node src/scripts/ingest-amfi-data.ts
 */

import { amfiService } from '../services/amfiService';
import { prisma } from '../db';

async function main() {
  console.log('🚀 Starting AMFI data ingestion...');
  console.log('⏳ This may take several minutes for all funds...\n');

  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Trigger AMFI data ingestion
    // You can customize the date range by passing a custom URL
    const result = await amfiService.ingestNAVData();

    console.log('\n📊 AMFI Data Ingestion Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successfully processed: ${result.processed} records`);
    console.log(`❌ Errors encountered: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Error Details:');
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`... and ${result.errors.length - 10} more errors`);
      }
    }

    // Get fund count
    const fundCount = await prisma.fund.count();
    const navCount = await prisma.fundPerformance.count();

    console.log('\n📈 Database Statistics:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Funds: ${fundCount}`);
    console.log(`Total NAV Records: ${navCount}`);

    console.log('\n✅ AMFI data ingestion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during AMFI ingestion:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
