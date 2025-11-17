import { Response } from 'express';
import { z } from 'zod';
import { mongodb } from '../db/mongodb';
import { AuthRequest } from '../middlewares/auth';
import { formatResponse } from '../utils/response';
import { cacheService, CacheService } from '../services/cacheService';
import { WatchlistItem, Fund, FundPerformance } from '../types/mongodb';
import { ObjectId } from 'mongodb';
// import { emitWatchlistUpdate } from '../services/socket';

const addWatchlistSchema = z.object({
  fundId: z.string(),
});

export const addToWatchlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fundId } = addWatchlistSchema.parse(req.body);

    const fundsCollection = mongodb.getCollection<Fund>('funds');
    const watchlistCollection =
      mongodb.getCollection<WatchlistItem>('watchlist_items');

    // Check if fund exists
    const fund = await fundsCollection.findOne({ _id: new ObjectId(fundId) });

    if (!fund) {
      res.status(404).json({ error: 'Fund not found' });
      return;
    }

    // Check if already in watchlist
    const existingItem = await watchlistCollection.findOne({
      userId: new ObjectId(req.user!.id),
      fundId: fundId,
    });

    if (existingItem) {
      res.status(409).json({ error: 'Fund already in watchlist' });
      return;
    }

    // Add to watchlist
    const newWatchlistItem: WatchlistItem = {
      userId: new ObjectId(req.user!.id),
      fundId: fundId,
      createdAt: new Date(),
    };

    const result = await watchlistCollection.insertOne(newWatchlistItem);

    const watchlistItem = {
      ...newWatchlistItem,
      id: result.insertedId.toString(),
      fund: {
        id: fund._id?.toString(),
        amfiCode: fund.amfiCode,
        name: fund.name,
        type: fund.type,
        category: fund.category,
      },
    };

    // Invalidate user's watchlist cache
    const cacheKey = CacheService.keys.userWatchlist(req.user!.id);
    await cacheService.del(cacheKey);

    // Emit real-time update to user's socket (if Socket.IO is installed)
    try {
      // emitWatchlistUpdate(req.user!.id, {
      //   type: 'added',
      //   item: watchlistItem,
      //   timestamp: new Date(),
      // });
    } catch (error) {
      console.log('ℹ️ Socket.IO not available, skipping real-time update');
    }

    res
      .status(201)
      .json(
        formatResponse(
          watchlistItem,
          'Fund added to watchlist successfully',
          201
        )
      );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFromWatchlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const watchlistCollection =
      mongodb.getCollection<WatchlistItem>('watchlist_items');

    // Check if watchlist item exists and belongs to user
    const watchlistItem = await watchlistCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!watchlistItem || watchlistItem.userId.toString() !== req.user!.id) {
      res.status(404).json({ error: 'Watchlist item not found' });
      return;
    }

    // Remove from watchlist
    await watchlistCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Invalidate user's watchlist cache
    const cacheKey = CacheService.keys.userWatchlist(req.user!.id);
    await cacheService.del(cacheKey);

    // Emit real-time update to user's socket (if Socket.IO is installed)
    try {
      // emitWatchlistUpdate(req.user!.id, {
      //   type: 'removed',
      //   itemId: id,
      //   timestamp: new Date(),
      // });
    } catch (error) {
      console.log('ℹ️ Socket.IO not available, skipping real-time update');
    }

    res.json(formatResponse(null, 'Fund removed from watchlist successfully'));
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWatchlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check cache first
    const cacheKey = CacheService.keys.userWatchlist(req.user!.id);
    const cachedData = await cacheService.getJSON(cacheKey);
    if (cachedData) {
      res.json(cachedData);
      return;
    }

    const watchlistCollection =
      mongodb.getCollection<WatchlistItem>('watchlist_items');
    const fundsCollection = mongodb.getCollection<Fund>('funds');
    const performancesCollection =
      mongodb.getCollection<FundPerformance>('fund_performances');

    const watchlistItems = await watchlistCollection
      .find({ userId: new ObjectId(req.user!.id) })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with fund data
    const enrichedItems = await Promise.all(
      watchlistItems.map(async (item) => {
        const fund = await fundsCollection.findOne({
          _id: new ObjectId(item.fundId),
        });
        const latestPerf = await performancesCollection
          .find({ fundId: item.fundId })
          .sort({ date: -1 })
          .limit(1)
          .toArray();

        return {
          ...item,
          id: item._id?.toString(),
          fund: fund
            ? {
                id: fund._id?.toString(),
                amfiCode: fund.amfiCode,
                name: fund.name,
                type: fund.type,
                category: fund.category,
                expenseRatio: fund.expenseRatio,
                performances: latestPerf.map((p) => ({
                  nav: p.nav,
                  date: p.date,
                })),
              }
            : null,
        };
      })
    );

    const response = formatResponse(
      enrichedItems,
      'Watchlist retrieved successfully'
    );

    // Cache the response
    await cacheService.setJSON(
      cacheKey,
      response,
      CacheService.TTL.USER_WATCHLIST
    );

    res.json(response);
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
