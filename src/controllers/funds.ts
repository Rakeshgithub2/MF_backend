import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import {
  formatResponse,
  formatPaginatedResponse,
  pagination,
  buildSortOrder,
} from '../utils/response';
// import { cacheService, CacheService } from '../services/cacheService';

const getFundsSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(), // search query
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort: z.string().optional(), // field:direction (e.g., name:asc, createdAt:desc)
});

const getFundNavsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const getFunds = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log('📥 GET /funds request received (WITH NAV DATA)');
    const { type, category, q, page, limit, sort } = getFundsSchema.parse(
      req.query
    );
    console.log('✅ Request params validated:', {
      type,
      category,
      q,
      page,
      limit,
      sort,
    });

    // Create cache key for this query
    // const cacheKey = CacheService.keys.fundsList(
    //   JSON.stringify({ type, category, q, page, limit, sort })
    // );

    // Try to get from cache first
    // const cachedData = await cacheService.getJSON(cacheKey);
    // if (cachedData) {
    //   return res.json(cachedData);
    // }

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

    // Get total count
    const total = await prisma.fund.count({ where });

    // Get funds with latest NAV
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
          take: 1,
          select: {
            nav: true,
            date: true,
          },
        },
      },
    });

    // Transform to include NAV directly
    const fundsWithNav = funds.map((fund) => ({
      ...fund,
      nav: fund.performances[0]?.nav || 0,
      navDate: fund.performances[0]?.date || null,
      performances: undefined, // Remove nested performances from response
    }));

    const response = formatPaginatedResponse(
      fundsWithNav,
      total,
      page,
      limit,
      'Funds retrieved successfully'
    );

    // Cache the response
    // await cacheService.setJSON(cacheKey, response, CacheService.TTL.FUNDS_LIST);

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Get funds error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFundById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    console.log(`📥 GET /funds/${id} request received`);

    // Check cache first for unauthenticated requests
    // const cacheKey = CacheService.keys.fundDetail(id);
    // const cachedData = await cacheService.getJSON(cacheKey);
    // if (cachedData) {
    //   return res.json(cachedData);
    // }

    const fund = await prisma.fund.findUnique({
      where: { id },
      include: {
        holdings: {
          orderBy: { percent: 'desc' },
          take: 10, // Top 10 holdings
        },
        managedBy: {
          select: {
            id: true,
            name: true,
            experience: true,
            qualification: true,
            bio: true,
            photo: true,
          },
        },
        managementTeam: {
          orderBy: { order: 'asc' },
        },
        portfolioActions: {
          orderBy: { order: 'asc' },
        },
        performances: {
          where: {
            date: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 1 year
            },
          },
          orderBy: { date: 'desc' },
          take: 100, // Limit performance data
        },
      },
    });

    if (!fund) {
      console.log(`❌ Fund with ID ${id} not found`);
      return res.status(404).json({ error: 'Fund not found' });
    }

    console.log(`✅ Fund ${fund.name} retrieved successfully`);
    const response = formatResponse(fund, 'Fund retrieved successfully');

    // Cache the response
    // await cacheService.setJSON(
    //   cacheKey,
    //   response,
    //   CacheService.TTL.FUND_DETAIL
    // );

    return res.json(response);
  } catch (error) {
    console.error('❌ Get fund by ID error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getFundNavs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { from, to } = getFundNavsSchema.parse(req.query);

    // Create cache key for NAV data
    // const cacheKey = CacheService.keys.fundNavs(
    //   id + JSON.stringify({ from, to })
    // );
    // const cachedData = await cacheService.getJSON(cacheKey);
    // if (cachedData) {
    //   return res.json(cachedData);
    // }

    // Build date filter
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

    const response = formatResponse(navs, 'Fund NAVs retrieved successfully');

    // Cache the NAV data
    // await cacheService.setJSON(cacheKey, response, CacheService.TTL.FUND_NAVS);

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Get fund NAVs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
