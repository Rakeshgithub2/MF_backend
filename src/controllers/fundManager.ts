import { Request, Response } from 'express';
import { prisma } from '../db';
import RealFundManagerService from '../services/realFundManagerService';

function extractFundHouse(fundName: string): string {
  const name = fundName.toLowerCase();

  if (name.includes('icici')) return 'ICICI Prudential';
  if (name.includes('hdfc')) return 'HDFC';
  if (name.includes('sbi')) return 'SBI';
  if (name.includes('axis')) return 'Axis';
  if (name.includes('mirae')) return 'Mirae Asset';
  if (name.includes('kotak')) return 'Kotak';
  if (name.includes('nippon') || name.includes('reliance'))
    return 'Nippon India';
  if (name.includes('parag') || name.includes('parikh')) return 'Parag Parikh';
  if (name.includes('quant')) return 'Quant';
  if (name.includes('uti')) return 'UTI';
  if (name.includes('aditya') || name.includes('birla'))
    return 'Aditya Birla Sun Life';
  if (name.includes('dsp')) return 'DSP';
  if (name.includes('motilal')) return 'Motilal Oswal';
  if (name.includes('franklin')) return 'Franklin Templeton';
  if (name.includes('tata')) return 'Tata';

  // Extract first word as fallback
  const firstWord = fundName.split(' ')[0];
  return firstWord || 'Unknown';
}

export const populateAllManagersHandler = async (
  req: Request,
  res: Response
) => {
  try {
    console.log('🚀 Starting fund manager population...\n');

    // Get all funds
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
        amfiCode: true,
      },
    });

    console.log(`📊 Found ${funds.length} funds in database\n`);

    const results = [];

    for (const fund of funds) {
      try {
        const fundHouse = extractFundHouse(fund.name);

        // Get VERIFIED manager data
        const managerData = await RealFundManagerService.getFundManager(
          fund.name,
          fundHouse,
          fund.amfiCode
        );

        if (!managerData) {
          console.log(`⚠️ No verified manager found for ${fund.name}`);
          results.push({
            fund: fund.name,
            error: 'No verified manager data available',
            action: 'skipped',
          });
          continue;
        }

        // Check if manager exists
        const existing = await prisma.fundManager.findFirst({
          where: { fundId: fund.id },
        });

        if (existing) {
          // Update with verified data including bio and photo
          await prisma.fundManager.update({
            where: { id: existing.id },
            data: {
              name: managerData.name,
              experience: managerData.experience,
              qualification: managerData.qualification,
              bio: managerData.bio,
              photo: managerData.photo || null,
            },
          });
          results.push({
            fund: fund.name,
            manager: managerData.name,
            action: 'updated',
          });
        } else {
          // Create with verified data including bio and photo
          await prisma.fundManager.create({
            data: {
              fundId: fund.id,
              name: managerData.name,
              experience: managerData.experience,
              qualification: managerData.qualification,
              bio: managerData.bio,
              photo: managerData.photo || null,
            },
          });
          results.push({
            fund: fund.name,
            manager: managerData.name,
            action: 'created',
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${fund.name}:`, error);
        results.push({
          fund: fund.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'failed',
        });
      }
    }

    const created = results.filter((r) => r.action === 'created').length;
    const updated = results.filter((r) => r.action === 'updated').length;
    const failed = results.filter((r) => r.action === 'failed').length;

    res.json({
      success: true,
      message: 'Fund manager population completed',
      summary: {
        total: funds.length,
        created,
        updated,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('💥 Fatal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to populate fund managers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
