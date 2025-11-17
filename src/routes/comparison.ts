import { Router, Request, Response } from 'express';
import { formatResponse } from '../utils/response';
import { prisma } from '../db';

const router = Router();

// Compare multiple funds side-by-side
router.post('/funds', async (req: Request, res: Response) => {
  try {
    const { fundIds } = req.body;

    if (!fundIds || !Array.isArray(fundIds) || fundIds.length < 2) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Please provide at least 2 fund IDs to compare',
      });
    }

    if (fundIds.length > 5) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Maximum 5 funds can be compared at once',
      });
    }

    // Fetch funds with their details
    const funds = await prisma.fund.findMany({
      where: {
        id: { in: fundIds },
      },
      include: {
        performances: {
          orderBy: { date: 'desc' },
          take: 365, // Last 1 year of data
        },
      },
    });

    if (funds.length !== fundIds.length) {
      return res.status(404).json({
        statusCode: 404,
        message: 'One or more funds not found',
      });
    }

    // Calculate returns for each fund
    const comparison = funds.map((fund) => {
      const navHistory = fund.performances;
      const currentNAV = navHistory.length > 0 ? navHistory[0].nav : 0;

      // Calculate returns
      const returns = {
        '1M': calculateReturn(navHistory, currentNAV, 30),
        '3M': calculateReturn(navHistory, currentNAV, 90),
        '6M': calculateReturn(navHistory, currentNAV, 180),
        '1Y': calculateReturn(navHistory, currentNAV, 365),
      };

      // Calculate volatility (standard deviation of returns)
      const volatility = calculateVolatility(navHistory);

      // Calculate Sharpe ratio (assuming 6% risk-free rate for India)
      const sharpeRatio = calculateSharpeRatio(returns['1Y'], volatility, 6);

      return {
        id: fund.id,
        name: fund.name,
        category: fund.category,
        type: fund.type,
        currentNav: currentNAV,
        expenseRatio: fund.expenseRatio || 0,
        benchmark: fund.benchmark,
        inceptionDate: fund.inceptionDate,
        returns,
        riskMetrics: {
          volatility: volatility.toFixed(2),
          sharpeRatio: sharpeRatio.toFixed(2),
          riskLevel: getRiskLevel(volatility),
        },
      };
    });

    // Determine best performer in each metric
    const insights = {
      highestReturn1Y: comparison.reduce((max, f) =>
        f.returns['1Y'] > max.returns['1Y'] ? f : max
      ).name,
      lowestExpenseRatio: comparison.reduce((min, f) =>
        f.expenseRatio < min.expenseRatio ? f : min
      ).name,
      bestSharpeRatio: comparison.reduce((max, f) =>
        parseFloat(f.riskMetrics.sharpeRatio) >
        parseFloat(max.riskMetrics.sharpeRatio)
          ? f
          : max
      ).name,
      lowestVolatility: comparison.reduce((min, f) =>
        parseFloat(f.riskMetrics.volatility) <
        parseFloat(min.riskMetrics.volatility)
          ? f
          : min
      ).name,
    };

    return res.json(
      formatResponse(
        {
          comparison,
          insights,
          comparedAt: new Date().toISOString(),
        },
        'Funds compared successfully'
      )
    );
  } catch (error) {
    console.error('Fund comparison error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to compare funds',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper function to calculate returns
function calculateReturn(
  navHistory: Array<{ date: Date; nav: number }>,
  currentNAV: number,
  days: number
): number {
  if (!navHistory || navHistory.length === 0) return 0;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);

  // Find closest NAV to target date
  const historicalNAV = navHistory.reduce((closest, nav) => {
    const navDate = new Date(nav.date);
    const closestDate = new Date(closest.date);
    return Math.abs(navDate.getTime() - targetDate.getTime()) <
      Math.abs(closestDate.getTime() - targetDate.getTime())
      ? nav
      : closest;
  });

  if (!historicalNAV) return 0;

  const returnPercentage =
    ((currentNAV - historicalNAV.nav) / historicalNAV.nav) * 100;
  return parseFloat(returnPercentage.toFixed(2));
}

// Calculate volatility (standard deviation of daily returns)
function calculateVolatility(
  navHistory: Array<{ date: Date; nav: number }>
): number {
  if (!navHistory || navHistory.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 0; i < navHistory.length - 1; i++) {
    const dailyReturn =
      (navHistory[i].nav - navHistory[i + 1].nav) / navHistory[i + 1].nav;
    returns.push(dailyReturn);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance) * Math.sqrt(252); // Annualized

  return stdDev * 100; // Return as percentage
}

// Calculate Sharpe Ratio
function calculateSharpeRatio(
  annualReturn: number,
  volatility: number,
  riskFreeRate: number
): number {
  if (volatility === 0) return 0;
  return (annualReturn - riskFreeRate) / volatility;
}

// Determine risk level based on volatility
function getRiskLevel(volatility: number): string {
  if (volatility < 10) return 'Low';
  if (volatility < 20) return 'Moderate';
  if (volatility < 30) return 'High';
  return 'Very High';
}

export default router;
