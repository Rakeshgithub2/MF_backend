import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '../db';
import { formatResponse, formatPaginatedResponse } from '../utils/response';

const router = Router();

// Get latest news
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;

    const where: any = {};
    if (category) {
      where.category = category;
    }

    const news = await prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        source: true,
        category: true,
        tags: true,
        publishedAt: true,
      },
    });

    return res.json(formatResponse(news, 'News retrieved successfully'));
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get news by fund ID
router.get('/fund/:fundId', async (req: Request, res: Response) => {
  try {
    const { fundId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    // Get fund details first to search relevant news
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { name: true, category: true },
    });

    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Fund not found',
      });
    }

    // Search news related to fund category or name
    const news = await prisma.news.findMany({
      where: {
        OR: [
          { tags: { has: fund.category } },
          { title: { contains: fund.name, mode: 'insensitive' } },
          { content: { contains: fund.category, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        source: true,
        category: true,
        tags: true,
        publishedAt: true,
      },
    });

    return res.json(formatResponse(news, 'Fund news retrieved successfully'));
  } catch (error) {
    console.error('Error fetching fund news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch fund news',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
