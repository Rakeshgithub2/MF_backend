import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import {
  formatResponse,
  formatPaginatedResponse,
  pagination,
  buildSortOrder,
} from '../utils/response';
import RealFundManagerService from '../services/realFundManagerService';

const getFundsSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  sort: z.string().optional(),
  // Advanced filters
  minExpenseRatio: z.coerce.number().min(0).optional(),
  maxExpenseRatio: z.coerce.number().min(0).optional(),
  minReturn1y: z.coerce.number().optional(),
  maxReturn1y: z.coerce.number().optional(),
  minReturn3y: z.coerce.number().optional(),
  maxReturn3y: z.coerce.number().optional(),
  minReturn5y: z.coerce.number().optional(),
  maxReturn5y: z.coerce.number().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  fundHouse: z.string().optional(),
  inceptionDateFrom: z.string().optional(),
  inceptionDateTo: z.string().optional(),
});

const getFundNavsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Helper function to extract fund house from fund name
function extractFundHouse(fundName: string): string {
  const fundHouses = [
    'ICICI Prudential',
    'HDFC',
    'SBI',
    'Axis',
    'Kotak',
    'Mirae Asset',
    'Nippon India',
    'Parag Parikh',
    'Quant',
    'UTI',
    'Aditya Birla Sun Life',
    'DSP',
    'Motilal Oswal',
    'Franklin Templeton',
    'Tata',
  ];

  for (const house of fundHouses) {
    if (fundName.toLowerCase().includes(house.toLowerCase())) {
      return house;
    }
  }

  // Extract first words as fund house
  const words = fundName.split(' ');
  return words.slice(0, 2).join(' ');
}

export const getFunds = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log('📥 GET /funds request received');
    const {
      type,
      category,
      q,
      page,
      limit,
      sort,
      minExpenseRatio,
      maxExpenseRatio,
      minReturn1y,
      maxReturn1y,
      minReturn3y,
      maxReturn3y,
      minReturn5y,
      maxReturn5y,
      riskLevel,
      fundHouse,
      inceptionDateFrom,
      inceptionDateTo,
    } = getFundsSchema.parse(req.query);

    console.log('✅ Request params validated:', {
      type,
      category,
      q,
      page,
      limit,
      sort,
      filters: {
        expenseRatio: { min: minExpenseRatio, max: maxExpenseRatio },
        return1y: { min: minReturn1y, max: maxReturn1y },
        return3y: { min: minReturn3y, max: maxReturn3y },
        return5y: { min: minReturn5y, max: maxReturn5y },
        riskLevel,
        fundHouse,
        inceptionDate: { from: inceptionDateFrom, to: inceptionDateTo },
      },
    });

    const { skip, take } = pagination(page, limit);
    const orderBy = buildSortOrder(sort);

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { amfiCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Advanced filters
    if (minExpenseRatio !== undefined || maxExpenseRatio !== undefined) {
      where.expenseRatio = {};
      if (minExpenseRatio !== undefined) {
        where.expenseRatio.gte = minExpenseRatio;
      }
      if (maxExpenseRatio !== undefined) {
        where.expenseRatio.lte = maxExpenseRatio;
      }
    }

    if (fundHouse) {
      where.name = { contains: fundHouse, mode: 'insensitive' };
    }

    if (inceptionDateFrom || inceptionDateTo) {
      where.inceptionDate = {};
      if (inceptionDateFrom) {
        where.inceptionDate.gte = new Date(inceptionDateFrom);
      }
      if (inceptionDateTo) {
        where.inceptionDate.lte = new Date(inceptionDateTo);
      }
    }

    console.log('🔍 Querying database with where:', where);

    // Get total count
    const total = await prisma.fund.count({ where });
    console.log('📊 Total funds found:', total);

    // Get funds with latest NAV and 15-year performance data
    const funds = await prisma.fund.findMany({
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        amfiCode: true,
        name: true,
        type: true,
        category: true,
        benchmark: true,
        expenseRatio: true,
        inceptionDate: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        performances: {
          orderBy: { date: 'desc' },
          take: 1, // Get only the latest NAV
          select: {
            nav: true,
            date: true,
          },
        },
      },
    });

    console.log('✅ Funds retrieved:', funds.length);

    const response = formatPaginatedResponse(
      funds,
      total,
      page,
      limit,
      'Funds retrieved successfully'
    );

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('❌ Get funds error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', message: String(error) });
  }
};

export const getFundById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    console.log('📥 GET /funds/:id request received for id:', id);

    // First try to find the fund
    const fund = await prisma.fund.findUnique({
      where: { id },
    });

    if (!fund) {
      console.log('❌ Fund not found:', id);
      return res.status(404).json({ error: 'Fund not found' });
    }

    console.log('✅ Fund found:', fund.name);

    // Now fetch related data separately to avoid issues with missing relations
    let [holdings, managers, performances] = await Promise.all([
      prisma.holding.findMany({
        where: { fundId: id },
        orderBy: { percent: 'desc' },
        take: 10,
      }),
      prisma.fundManager.findMany({
        where: { fundId: id },
      }),
      // Fetch 15 years of performance data
      prisma.fundPerformance.findMany({
        where: {
          fundId: id,
          date: {
            gte: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000), // 15 years
          },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    console.log(
      `✅ Retrieved ${holdings.length} holdings, ${managers.length} managers, ${performances.length} performance records`
    );

    // Fetch VERIFIED fund manager details - cross-checked with Google & AMC websites
    if (
      managers.length === 0 ||
      !managers[0]?.name ||
      managers[0].name === 'Default Manager'
    ) {
      console.log('🔄 Fetching VERIFIED fund manager details...');

      try {
        // Use fund.type as fund house if available, otherwise extract from name
        const fundHouse = extractFundHouse(fund.name);

        const managerData = await RealFundManagerService.getFundManager(
          fund.name,
          fundHouse,
          fund.amfiCode
        );

        if (managerData) {
          console.log(`✅ Found VERIFIED manager: ${managerData.name}`);
          console.log(`   Experience: ${managerData.experience} years`);
          console.log(`   Qualification: ${managerData.qualification}`);
          console.log(`   Source: ${managerData.source}`);

          // Update or create manager in DB with bio and photo
          if (managers.length > 0 && managers[0].id) {
            await prisma.fundManager.update({
              where: { id: managers[0].id },
              data: {
                name: managerData.name,
                experience: managerData.experience,
                qualification: managerData.qualification,
                bio: managerData.bio,
                photo: managerData.photo || null,
              },
            });
            managers[0].name = managerData.name;
            managers[0].experience = managerData.experience;
            managers[0].qualification = managerData.qualification;
            managers[0].bio = managerData.bio;
            managers[0].photo = managerData.photo || null;
          } else {
            const newManager = await prisma.fundManager.create({
              data: {
                fundId: fund.id,
                name: managerData.name,
                experience: managerData.experience,
                qualification: managerData.qualification,
                bio: managerData.bio,
                photo: managerData.photo || null,
              },
            });
            managers = [newManager];
          }
        } else {
          console.log(`⚠️ No verified manager found for ${fund.name}`);
          console.log(`   Please add manager details to verified database`);
        }
      } catch (error) {
        console.error('Error fetching manager details:', error);
      }
    } else {
      console.log(`✅ Using cached manager: ${managers[0].name}`);
    }

    // Combine the data
    const fundWithRelations = {
      ...fund,
      holdings,
      managedBy: managers,
      performances,
    };

    const response = formatResponse(
      fundWithRelations,
      'Fund retrieved successfully'
    );
    return res.json(response);
  } catch (error) {
    console.error('❌ Get fund by ID error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', message: String(error) });
  }
};

export const getFundNavs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { from, to } = getFundNavsSchema.parse(req.query);
    console.log('📥 GET /funds/:id/navs request received for id:', id);

    const dateFilter: any = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      dateFilter.lte = new Date(to);
    }

    const navs = await prisma.fundPerformance.findMany({
      where: {
        fundId: id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        nav: true,
      },
    });

    console.log('✅ NAVs retrieved:', navs.length);
    const response = formatResponse(navs, 'Fund NAVs retrieved successfully');
    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('❌ Get fund NAVs error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', message: String(error) });
  }
};
