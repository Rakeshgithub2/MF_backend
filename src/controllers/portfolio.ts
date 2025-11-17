import { Response } from 'express';
import { z } from 'zod';
import { mongodb } from '../db/mongodb';
import { AuthRequest } from '../middlewares/auth';
import { formatResponse } from '../utils/response';
import {
  Portfolio,
  PortfolioItem,
  Fund,
  FundPerformance,
} from '../types/mongodb';
import { ObjectId } from 'mongodb';

const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
});

const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Get all portfolios for logged-in user
export const getPortfolios = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');
    const portfolioItemsCollection =
      mongodb.getCollection<PortfolioItem>('portfolio_items');
    const fundsCollection = mongodb.getCollection<Fund>('funds');
    const performancesCollection =
      mongodb.getCollection<FundPerformance>('fund_performances');

    const portfolios = await portfoliosCollection
      .find({ userId: new ObjectId(req.user!.id) })
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate current values for each portfolio
    const portfoliosWithValues = await Promise.all(
      portfolios.map(async (portfolio) => {
        let totalInvested = 0;
        let totalCurrent = 0;

        // Get portfolio items
        const items = await portfolioItemsCollection
          .find({ portfolioId: portfolio._id })
          .toArray();

        const itemsWithValues = await Promise.all(
          items.map(async (item) => {
            // Get fund details
            const fund = await fundsCollection.findOne({
              _id: new ObjectId(item.fundId),
            });

            // Get latest NAV
            const latestPerformance = await performancesCollection
              .find({ fundId: item.fundId })
              .sort({ date: -1 })
              .limit(1)
              .toArray();

            const latestNav = latestPerformance[0]?.nav || 0;
            const currentValue = item.units * latestNav;
            totalInvested += item.investedAmount;
            totalCurrent += currentValue;

            return {
              ...item,
              id: item._id?.toString(),
              fund: {
                ...fund,
                id: fund?._id?.toString(),
              },
              currentValue,
              returns: currentValue - item.investedAmount,
              returnsPercent:
                item.investedAmount > 0
                  ? ((currentValue - item.investedAmount) /
                      item.investedAmount) *
                    100
                  : 0,
            };
          })
        );

        return {
          ...portfolio,
          id: portfolio._id?.toString(),
          items: itemsWithValues,
          totalInvested,
          totalValue: totalCurrent,
          totalReturns: totalCurrent - totalInvested,
          totalReturnsPercent:
            totalInvested > 0
              ? ((totalCurrent - totalInvested) / totalInvested) * 100
              : 0,
        };
      })
    );

    res.json(
      formatResponse(portfoliosWithValues, 'Portfolios fetched successfully')
    );
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get portfolio by ID
export const getPortfolioById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');
    const portfolioItemsCollection =
      mongodb.getCollection<PortfolioItem>('portfolio_items');
    const fundsCollection = mongodb.getCollection<Fund>('funds');
    const performancesCollection =
      mongodb.getCollection<FundPerformance>('fund_performances');

    const portfolio = await portfoliosCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    // Get portfolio items
    const items = await portfolioItemsCollection
      .find({ portfolioId: portfolio._id })
      .toArray();

    let totalInvested = 0;
    let totalCurrent = 0;

    const itemsWithValues = await Promise.all(
      items.map(async (item) => {
        // Get fund details
        const fund = await fundsCollection.findOne({
          _id: new ObjectId(item.fundId),
        });

        // Get latest NAV
        const latestPerformance = await performancesCollection
          .find({ fundId: item.fundId })
          .sort({ date: -1 })
          .limit(1)
          .toArray();

        const latestNav = latestPerformance[0]?.nav || 0;
        const currentValue = item.units * latestNav;
        totalInvested += item.investedAmount;
        totalCurrent += currentValue;

        return {
          ...item,
          id: item._id?.toString(),
          fund: {
            ...fund,
            id: fund?._id?.toString(),
          },
          currentValue,
          returns: currentValue - item.investedAmount,
          returnsPercent:
            item.investedAmount > 0
              ? ((currentValue - item.investedAmount) / item.investedAmount) *
                100
              : 0,
        };
      })
    );

    const portfolioWithValues = {
      ...portfolio,
      id: portfolio._id?.toString(),
      items: itemsWithValues,
      totalInvested,
      totalValue: totalCurrent,
      totalReturns: totalCurrent - totalInvested,
      totalReturnsPercent:
        totalInvested > 0
          ? ((totalCurrent - totalInvested) / totalInvested) * 100
          : 0,
    };

    res.json(
      formatResponse(portfolioWithValues, 'Portfolio fetched successfully')
    );
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new portfolio
export const createPortfolio = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createPortfolioSchema.parse(req.body);

    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');
    const newPortfolio: Portfolio = {
      userId: new ObjectId(req.user!.id),
      name: validatedData.name,
      totalValue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await portfoliosCollection.insertOne(newPortfolio);
    const portfolio = { ...newPortfolio, id: result.insertedId.toString() };

    res
      .status(201)
      .json(formatResponse(portfolio, 'Portfolio created successfully', 201));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Create portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update portfolio
export const updatePortfolio = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = updatePortfolioSchema.parse(req.body);

    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');

    // Check if portfolio exists and belongs to user
    const existingPortfolio = await portfoliosCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!existingPortfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    const updateData: any = { updatedAt: new Date() };
    if (validatedData.name) updateData.name = validatedData.name;

    await portfoliosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const portfolio = await portfoliosCollection.findOne({
      _id: new ObjectId(id),
    });
    const portfolioWithId = { ...portfolio, id: portfolio?._id?.toString() };

    res.json(formatResponse(portfolioWithId, 'Portfolio updated successfully'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete portfolio
export const deletePortfolio = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');
    const portfolioItemsCollection =
      mongodb.getCollection<PortfolioItem>('portfolio_items');

    // Check if portfolio exists and belongs to user
    const existingPortfolio = await portfoliosCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!existingPortfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    // Delete portfolio items first
    await portfolioItemsCollection.deleteMany({
      portfolioId: new ObjectId(id),
    });

    // Delete portfolio
    await portfoliosCollection.deleteOne({ _id: new ObjectId(id) });

    res.json(formatResponse(null, 'Portfolio deleted successfully'));
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get portfolio summary (aggregated data)
export const getPortfolioSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const portfoliosCollection = mongodb.getCollection<Portfolio>('portfolios');
    const portfolioItemsCollection =
      mongodb.getCollection<PortfolioItem>('portfolio_items');
    const fundsCollection = mongodb.getCollection<Fund>('funds');
    const performancesCollection =
      mongodb.getCollection<FundPerformance>('fund_performances');

    // Get all portfolios with items
    const portfolios = await portfoliosCollection
      .find({ userId: new ObjectId(req.user!.id) })
      .toArray();

    let totalInvested = 0;
    let totalCurrent = 0;
    const categoryAllocation: { [key: string]: number } = {};
    const holdings: any[] = [];

    for (const portfolio of portfolios) {
      const items = await portfolioItemsCollection
        .find({ portfolioId: portfolio._id })
        .toArray();

      for (const item of items) {
        const fund = await fundsCollection.findOne({
          _id: new ObjectId(item.fundId),
        });

        const latestPerformance = await performancesCollection
          .find({ fundId: item.fundId })
          .sort({ date: -1 })
          .limit(1)
          .toArray();

        const latestNav = latestPerformance[0]?.nav || 0;
        const currentValue = item.units * latestNav;

        totalInvested += item.investedAmount;
        totalCurrent += currentValue;

        // Category allocation
        const category = fund?.category || 'OTHER';
        categoryAllocation[category] =
          (categoryAllocation[category] || 0) + currentValue;

        // Add to holdings
        holdings.push({
          id: item._id?.toString(),
          fundId: item.fundId,
          fundName: fund?.name,
          category: fund?.category,
          units: item.units,
          nav: latestNav,
          invested: item.investedAmount,
          current: currentValue,
          returns: currentValue - item.investedAmount,
          returnsPercent:
            item.investedAmount > 0
              ? ((currentValue - item.investedAmount) / item.investedAmount) *
                100
              : 0,
        });
      }
    }

    // Calculate allocation percentages
    const allocation = Object.entries(categoryAllocation).map(
      ([category, value]) => ({
        category,
        value,
        percentage: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
      })
    );

    const summary = {
      totalValue: totalCurrent,
      totalInvested,
      totalReturns: totalCurrent - totalInvested,
      totalReturnsPercent:
        totalInvested > 0
          ? ((totalCurrent - totalInvested) / totalInvested) * 100
          : 0,
      portfolioCount: portfolios.length,
      holdingsCount: holdings.length,
      allocation,
      holdings: holdings.sort((a, b) => b.current - a.current), // Sort by value
    };

    res.json(formatResponse(summary, 'Portfolio summary fetched successfully'));
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
