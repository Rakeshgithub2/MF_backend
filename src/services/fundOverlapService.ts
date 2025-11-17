/**
 * Fund Overlap Analysis Service
 * Analyzes common holdings between multiple funds
 */

import { prisma } from '../db';

export interface OverlapAnalysisInput {
  fundIds: string[];
}

export interface StockOverlap {
  ticker: string;
  name: string;
  fundAllocations: {
    fundId: string;
    fundName: string;
    percentage: number;
  }[];
  totalOverlapScore: number; // How many funds hold this stock
}

export interface FundPairOverlap {
  fund1Id: string;
  fund1Name: string;
  fund2Id: string;
  fund2Name: string;
  overlapPercentage: number;
  commonHoldings: {
    ticker: string;
    name: string;
    fund1Percent: number;
    fund2Percent: number;
  }[];
  recommendation: string;
}

export interface FundUniqueHoldings {
  fundId: string;
  fundName: string;
  uniqueStocks: {
    ticker: string;
    name: string;
    percentage: number;
  }[];
  uniqueStocksCount: number;
  uniqueAllocationPercentage: number;
}

export interface OverlapAnalysisOutput {
  totalFunds: number;
  commonStocks: StockOverlap[];
  pairwiseOverlap: FundPairOverlap[];
  fundUniqueHoldings: FundUniqueHoldings[];
  overallOverlapScore: number; // 0-100, higher means more overlap
  diversificationRating:
    | 'Excellent'
    | 'Good'
    | 'Moderate'
    | 'Poor'
    | 'Very Poor';
  recommendations: string[];
  summary: {
    highlyOverlappingPairs: number;
    uniqueHoldings: number;
    totalUniqueStocks: number;
    averageOverlap: number;
  };
}

/**
 * Analyze overlap between multiple funds
 */
export async function analyzeFundOverlap(
  input: OverlapAnalysisInput
): Promise<OverlapAnalysisOutput> {
  const { fundIds } = input;

  if (fundIds.length < 2) {
    throw new Error('At least 2 funds are required for overlap analysis');
  }

  if (fundIds.length > 10) {
    throw new Error('Maximum 10 funds can be compared at once');
  }

  // Fetch funds with their holdings
  const funds = await prisma.fund.findMany({
    where: {
      id: { in: fundIds },
      isActive: true,
    },
    include: {
      holdings: {
        orderBy: { percent: 'desc' },
      },
    },
  });

  if (funds.length !== fundIds.length) {
    throw new Error('One or more funds not found');
  }

  // Build stock overlap map
  const stockMap = new Map<
    string,
    {
      ticker: string;
      name: string;
      funds: { fundId: string; fundName: string; percentage: number }[];
    }
  >();

  funds.forEach((fund) => {
    fund.holdings.forEach((holding) => {
      const key = holding.ticker;
      if (!stockMap.has(key)) {
        stockMap.set(key, {
          ticker: holding.ticker,
          name: holding.name,
          funds: [],
        });
      }
      stockMap.get(key)!.funds.push({
        fundId: fund.id,
        fundName: fund.name,
        percentage: holding.percent,
      });
    });
  });

  // Calculate common stocks (held by 2+ funds)
  const commonStocks: StockOverlap[] = Array.from(stockMap.values())
    .filter((stock) => stock.funds.length >= 2)
    .map((stock) => ({
      ticker: stock.ticker,
      name: stock.name,
      fundAllocations: stock.funds,
      totalOverlapScore: stock.funds.length,
    }))
    .sort((a, b) => b.totalOverlapScore - a.totalOverlapScore);

  // Calculate pairwise overlap
  const pairwiseOverlap: FundPairOverlap[] = [];

  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const fund1 = funds[i];
      const fund2 = funds[j];

      const fund1Holdings = new Map(fund1.holdings.map((h) => [h.ticker, h]));
      const fund2Holdings = new Map(fund2.holdings.map((h) => [h.ticker, h]));

      const commonHoldings: FundPairOverlap['commonHoldings'] = [];
      let overlapSum = 0;

      fund1Holdings.forEach((holding1, ticker) => {
        const holding2 = fund2Holdings.get(ticker);
        if (holding2) {
          commonHoldings.push({
            ticker,
            name: holding1.name,
            fund1Percent: holding1.percent,
            fund2Percent: holding2.percent,
          });
          // Overlap is the minimum of the two percentages
          overlapSum += Math.min(holding1.percent, holding2.percent);
        }
      });

      const overlapPercentage = parseFloat(overlapSum.toFixed(2));

      let recommendation = '';
      if (overlapPercentage > 50) {
        recommendation = `⚠️ Very High Overlap (${overlapPercentage}%). Consider replacing one fund to improve diversification.`;
      } else if (overlapPercentage > 30) {
        recommendation = `⚠️ High Overlap (${overlapPercentage}%). These funds have significant common holdings.`;
      } else if (overlapPercentage > 15) {
        recommendation = `✅ Moderate Overlap (${overlapPercentage}%). Acceptable level of diversification.`;
      } else {
        recommendation = `✅ Low Overlap (${overlapPercentage}%). Excellent diversification between these funds.`;
      }

      pairwiseOverlap.push({
        fund1Id: fund1.id,
        fund1Name: fund1.name,
        fund2Id: fund2.id,
        fund2Name: fund2.name,
        overlapPercentage,
        commonHoldings: commonHoldings.sort(
          (a, b) => b.fund1Percent - a.fund1Percent
        ),
        recommendation,
      });
    }
  }

  // Calculate overall metrics
  const totalUniqueStocks = stockMap.size;
  const averageOverlap =
    pairwiseOverlap.length > 0
      ? pairwiseOverlap.reduce((sum, pair) => sum + pair.overlapPercentage, 0) /
        pairwiseOverlap.length
      : 0;
  const highlyOverlappingPairs = pairwiseOverlap.filter(
    (pair) => pair.overlapPercentage > 30
  ).length;

  // Calculate overall overlap score (0-100)
  const overallOverlapScore = Math.min(
    100,
    Math.round(averageOverlap + (commonStocks.length / totalUniqueStocks) * 20)
  );

  // Determine diversification rating
  let diversificationRating: OverlapAnalysisOutput['diversificationRating'];
  if (overallOverlapScore < 20) {
    diversificationRating = 'Excellent';
  } else if (overallOverlapScore < 35) {
    diversificationRating = 'Good';
  } else if (overallOverlapScore < 50) {
    diversificationRating = 'Moderate';
  } else if (overallOverlapScore < 70) {
    diversificationRating = 'Poor';
  } else {
    diversificationRating = 'Very Poor';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (overallOverlapScore > 50) {
    recommendations.push(
      '🚨 Your portfolio has significant overlap. Consider replacing some funds.'
    );
  }

  if (highlyOverlappingPairs > 0) {
    recommendations.push(
      `⚠️ ${highlyOverlappingPairs} fund pair(s) have >30% overlap. Review these combinations.`
    );
  }

  if (commonStocks.length > totalUniqueStocks * 0.3) {
    recommendations.push(
      `📊 ${commonStocks.length} stocks are held by multiple funds. This reduces diversification benefits.`
    );
  }

  const stocksInAllFunds = commonStocks.filter(
    (s) => s.totalOverlapScore === funds.length
  );
  if (stocksInAllFunds.length > 0) {
    recommendations.push(
      `💡 ${stocksInAllFunds.length} stock(s) appear in ALL funds: ${stocksInAllFunds
        .slice(0, 3)
        .map((s) => s.name)
        .join(', ')}. Consider if this concentration is intentional.`
    );
  }

  if (
    diversificationRating === 'Excellent' ||
    diversificationRating === 'Good'
  ) {
    recommendations.push(
      '✅ Your fund selection shows good diversification with minimal overlap.'
    );
  }

  const uniqueHoldings = Array.from(stockMap.values()).filter(
    (s) => s.funds.length === 1
  ).length;

  recommendations.push(
    `📈 Portfolio has ${totalUniqueStocks} unique stocks with ${uniqueHoldings} holdings appearing in only one fund.`
  );

  // Calculate unique holdings per fund
  const fundUniqueHoldings: FundUniqueHoldings[] = funds.map((fund) => {
    const uniqueStocks = fund.holdings
      .filter((holding) => {
        const stock = stockMap.get(holding.ticker);
        return stock && stock.funds.length === 1;
      })
      .map((holding) => ({
        ticker: holding.ticker,
        name: holding.name,
        percentage: holding.percent,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const uniqueAllocationPercentage = uniqueStocks.reduce(
      (sum, stock) => sum + stock.percentage,
      0
    );

    return {
      fundId: fund.id,
      fundName: fund.name,
      uniqueStocks,
      uniqueStocksCount: uniqueStocks.length,
      uniqueAllocationPercentage: parseFloat(
        uniqueAllocationPercentage.toFixed(2)
      ),
    };
  });

  return {
    totalFunds: funds.length,
    commonStocks,
    pairwiseOverlap: pairwiseOverlap.sort(
      (a, b) => b.overlapPercentage - a.overlapPercentage
    ),
    fundUniqueHoldings,
    overallOverlapScore,
    diversificationRating,
    recommendations,
    summary: {
      highlyOverlappingPairs,
      uniqueHoldings,
      totalUniqueStocks,
      averageOverlap: parseFloat(averageOverlap.toFixed(2)),
    },
  };
}
