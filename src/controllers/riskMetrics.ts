import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { formatResponse } from '../utils/response';
import { riskMetricsService } from '../services/riskMetrics';

const getRiskMetricsSchema = z.object({
  fundId: z.string().min(1, 'Fund ID is required'),
  period: z.enum(['1Y', '3Y', '5Y', '10Y']).optional().default('3Y'),
});

/**
 * Get risk metrics for a specific fund
 * GET /api/funds/:fundId/risk-metrics
 */
export const getFundRiskMetrics = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { fundId } = req.params;
    const { period } = getRiskMetricsSchema.parse({
      fundId,
      period: req.query.period,
    });

    console.log(
      `📊 Calculating risk metrics for fund ${fundId} over ${period}`
    );

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();

    switch (period) {
      case '1Y':
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        break;
      case '3Y':
        fromDate.setFullYear(fromDate.getFullYear() - 3);
        break;
      case '5Y':
        fromDate.setFullYear(fromDate.getFullYear() - 5);
        break;
      case '10Y':
        fromDate.setFullYear(fromDate.getFullYear() - 10);
        break;
    }

    // Fetch NAV history from database
    const navHistory = await prisma.fundPerformance.findMany({
      where: {
        fundId: fundId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        nav: true,
      },
    });

    if (navHistory.length < 20) {
      return res.status(400).json(
        formatResponse({
          success: false,
          message: `Insufficient data to calculate risk metrics. Need at least 20 data points, found ${navHistory.length}`,
        })
      );
    }

    // Calculate risk metrics
    const riskMetrics = riskMetricsService.calculateAllMetrics(navHistory);

    // Get fund details for context
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: {
        name: true,
        category: true,
        benchmark: true,
      },
    });

    // Interpretation guidelines
    const interpretation = {
      sharpeRatio: {
        value: riskMetrics.sharpeRatio,
        rating:
          riskMetrics.sharpeRatio > 2
            ? 'Excellent'
            : riskMetrics.sharpeRatio > 1
              ? 'Good'
              : riskMetrics.sharpeRatio > 0
                ? 'Average'
                : 'Poor',
        meaning:
          riskMetrics.sharpeRatio > 2
            ? 'Excellent risk-adjusted returns. Fund generates high returns relative to risk taken.'
            : riskMetrics.sharpeRatio > 1
              ? 'Good risk-adjusted returns. Fund is performing well for the risk level.'
              : riskMetrics.sharpeRatio > 0
                ? 'Average risk-adjusted returns. Returns barely compensate for risk.'
                : 'Poor risk-adjusted returns. High risk without adequate returns.',
      },
      beta: {
        value: riskMetrics.beta,
        rating:
          riskMetrics.beta > 1.2
            ? 'High Volatility'
            : riskMetrics.beta > 0.8
              ? 'Market-like'
              : 'Low Volatility',
        meaning:
          riskMetrics.beta > 1.2
            ? `Fund is ${Math.round(
                (riskMetrics.beta - 1) * 100
              )}% more volatile than market. Suitable for aggressive investors.`
            : riskMetrics.beta > 0.8
              ? 'Fund moves closely with market. Balanced risk profile.'
              : `Fund is ${Math.round(
                  (1 - riskMetrics.beta) * 100
                )}% less volatile than market. Suitable for conservative investors.`,
      },
      alpha: {
        value: riskMetrics.alpha,
        rating:
          riskMetrics.alpha > 2
            ? 'Excellent'
            : riskMetrics.alpha > 0
              ? 'Positive'
              : riskMetrics.alpha > -2
                ? 'Slight Underperformance'
                : 'Poor',
        meaning:
          riskMetrics.alpha > 2
            ? `Fund outperforms benchmark by ${riskMetrics.alpha.toFixed(
                1
              )}% annually. Excellent fund manager skill.`
            : riskMetrics.alpha > 0
              ? `Fund beats benchmark by ${riskMetrics.alpha.toFixed(
                  1
                )}% annually. Good value addition.`
              : riskMetrics.alpha > -2
                ? `Fund underperforms benchmark by ${Math.abs(
                    riskMetrics.alpha
                  ).toFixed(1)}% annually.`
                : 'Significant underperformance. Consider alternatives.',
      },
      volatility: {
        value: riskMetrics.volatility,
        rating:
          riskMetrics.volatility < 10
            ? 'Low Risk'
            : riskMetrics.volatility < 20
              ? 'Moderate Risk'
              : 'High Risk',
        meaning:
          riskMetrics.volatility < 10
            ? 'Low volatility. Stable, predictable returns suitable for conservative investors.'
            : riskMetrics.volatility < 20
              ? 'Moderate volatility. Balanced risk-reward profile.'
              : 'High volatility. Large swings in returns. Only for risk-tolerant investors.',
      },
      maxDrawdown: {
        value: riskMetrics.maxDrawdown,
        rating:
          riskMetrics.maxDrawdown < 15
            ? 'Resilient'
            : riskMetrics.maxDrawdown < 30
              ? 'Moderate Decline'
              : 'Severe Decline',
        meaning:
          riskMetrics.maxDrawdown < 15
            ? `Fund fell only ${riskMetrics.maxDrawdown.toFixed(
                1
              )}% from peak. Resilient during downturns.`
            : riskMetrics.maxDrawdown < 30
              ? `Maximum decline of ${riskMetrics.maxDrawdown.toFixed(
                  1
                )}% from peak. Moderate drawdown.`
              : `Severe ${riskMetrics.maxDrawdown.toFixed(
                  1
                )}% decline from peak. Be prepared for volatility.`,
      },
    };

    const response = {
      fundId,
      fundName: fund?.name,
      category: fund?.category,
      benchmark: fund?.benchmark,
      period,
      dataPoints: navHistory.length,
      metrics: riskMetrics,
      interpretation,
      riskProfile:
        riskMetrics.beta > 1.2 && riskMetrics.volatility > 20
          ? 'AGGRESSIVE'
          : riskMetrics.beta < 0.8 && riskMetrics.volatility < 15
            ? 'CONSERVATIVE'
            : 'MODERATE',
      investorSuitability:
        riskMetrics.sharpeRatio > 1 && riskMetrics.alpha > 0
          ? 'Recommended - Good risk-adjusted returns with outperformance'
          : riskMetrics.sharpeRatio > 1
            ? 'Consider - Decent risk-adjusted returns'
            : 'Review - May not offer adequate returns for risk taken',
    };

    return res.json(
      formatResponse({
        success: true,
        message: 'Risk metrics calculated successfully',
        data: response,
      })
    );
  } catch (error) {
    console.error('❌ Error calculating risk metrics:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json(
        formatResponse({
          success: false,
          message: 'Invalid request parameters',
          error: error.errors,
        })
      );
    }

    return res.status(500).json(
      formatResponse({
        success: false,
        message: 'Failed to calculate risk metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
};

/**
 * Compare risk metrics across multiple funds
 * POST /api/risk-metrics/compare
 */
export const compareRiskMetrics = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { fundIds, period = '3Y' } = req.body;

    if (!Array.isArray(fundIds) || fundIds.length < 2 || fundIds.length > 5) {
      return res.status(400).json(
        formatResponse({
          success: false,
          message: 'Please provide 2-5 fund IDs for comparison',
        })
      );
    }

    const comparisons = [];

    for (const fundId of fundIds) {
      // Calculate date range
      const toDate = new Date();
      const fromDate = new Date();

      switch (period) {
        case '1Y':
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        case '3Y':
          fromDate.setFullYear(fromDate.getFullYear() - 3);
          break;
        case '5Y':
          fromDate.setFullYear(fromDate.getFullYear() - 5);
          break;
        case '10Y':
          fromDate.setFullYear(fromDate.getFullYear() - 10);
          break;
      }

      const navHistory = await prisma.fundPerformance.findMany({
        where: {
          fundId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: 'asc' },
        select: { date: true, nav: true },
      });

      if (navHistory.length < 20) continue;

      const fund = await prisma.fund.findUnique({
        where: { id: fundId },
        select: { name: true, category: true },
      });

      const metrics = riskMetricsService.calculateAllMetrics(navHistory);

      comparisons.push({
        fundId,
        fundName: fund?.name,
        category: fund?.category,
        metrics,
      });
    }

    return res.json(
      formatResponse({
        success: true,
        message: 'Risk metrics comparison generated',
        data: {
          period,
          funds: comparisons,
          bestSharpeRatio: comparisons.reduce((prev, current) =>
            current.metrics.sharpeRatio > prev.metrics.sharpeRatio
              ? current
              : prev
          ),
          lowestVolatility: comparisons.reduce((prev, current) =>
            current.metrics.volatility < prev.metrics.volatility
              ? current
              : prev
          ),
          highestAlpha: comparisons.reduce((prev, current) =>
            current.metrics.alpha > prev.metrics.alpha ? current : prev
          ),
        },
      })
    );
  } catch (error) {
    console.error('❌ Error comparing risk metrics:', error);
    return res.status(500).json(
      formatResponse({
        success: false,
        message: 'Failed to compare risk metrics',
      })
    );
  }
};
