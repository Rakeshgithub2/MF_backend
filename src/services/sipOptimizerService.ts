/**
 * SIP Date Optimizer Service
 * Analyzes historical NAV data to find optimal SIP dates
 */

import { prisma } from '../db';

export interface SipOptimizerInput {
  fundId: string;
  analysisMonths?: number; // Default: 36 months (3 years)
}

export interface DayAnalysis {
  day: number; // 1-28
  avgNav: number;
  avgUnits: number; // Units purchased per ₹10,000
  frequency: number; // How many times this date appeared
  returnPercentage: number; // Relative to best day
  rank: number;
  recommendation: 'Best' | 'Good' | 'Average' | 'Below Average';
}

export interface SipOptimizerOutput {
  fundId: string;
  fundName: string;
  analysisStartDate: Date;
  analysisEndDate: Date;
  totalMonthsAnalyzed: number;

  bestDays: number[]; // Top 3 dates
  worstDays: number[]; // Bottom 3 dates

  dayWiseAnalysis: DayAnalysis[];

  // Insights
  insights: {
    optimalDate: number;
    potentialExtraReturns: number; // % improvement over worst date
    consistencyScore: number; // 0-100, how consistent the pattern is
    recommendation: string;
  };

  // Historical comparison
  comparisonData: {
    date5thSIP: {
      avgUnits: number;
      totalUnits: number;
      totalInvested: number;
      currentValue: number;
      returns: number;
    };
    date15thSIP: {
      avgUnits: number;
      totalUnits: number;
      totalInvested: number;
      currentValue: number;
      returns: number;
    };
    date25thSIP: {
      avgUnits: number;
      totalUnits: number;
      totalInvested: number;
      currentValue: number;
      returns: number;
    };
    bestDate: {
      date: number;
      avgUnits: number;
      totalUnits: number;
      totalInvested: number;
      currentValue: number;
      returns: number;
    };
  };

  summary: string;
}

/**
 * Calculate optimal SIP date based on historical NAV data
 */
export async function optimizeSipDate(
  input: SipOptimizerInput
): Promise<SipOptimizerOutput> {
  const { fundId, analysisMonths = 36 } = input;

  // Fetch fund details
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: { id: true, name: true },
  });

  if (!fund) {
    throw new Error('Fund not found');
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - analysisMonths);

  // Fetch historical NAV data
  const performances = await prisma.fundPerformance.findMany({
    where: {
      fundId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  if (performances.length < 30) {
    throw new Error(
      'Insufficient historical data. At least 30 data points required.'
    );
  }

  // Group NAV by day of month
  const dayWiseData = new Map<number, { navs: number[]; dates: Date[] }>();

  performances.forEach((perf) => {
    const day = perf.date.getDate();
    // Only consider days 1-28 (available in all months)
    if (day <= 28) {
      if (!dayWiseData.has(day)) {
        dayWiseData.set(day, { navs: [], dates: [] });
      }
      dayWiseData.get(day)!.navs.push(perf.nav);
      dayWiseData.get(day)!.dates.push(perf.date);
    }
  });

  // Calculate metrics for each day
  const dayWiseAnalysis: DayAnalysis[] = [];
  const sipAmount = 10000; // Standard ₹10,000 SIP

  Array.from(dayWiseData.entries()).forEach(([day, data]) => {
    const avgNav =
      data.navs.reduce((sum, nav) => sum + nav, 0) / data.navs.length;
    const avgUnits = sipAmount / avgNav;
    const frequency = data.navs.length;

    dayWiseAnalysis.push({
      day,
      avgNav: parseFloat(avgNav.toFixed(4)),
      avgUnits: parseFloat(avgUnits.toFixed(4)),
      frequency,
      returnPercentage: 0, // Will calculate after finding best
      rank: 0,
      recommendation: 'Average',
    });
  });

  // Sort by avg units (more units = better)
  dayWiseAnalysis.sort((a, b) => b.avgUnits - a.avgUnits);

  // Calculate ranks and return percentages
  const bestUnits = dayWiseAnalysis[0].avgUnits;
  dayWiseAnalysis.forEach((analysis, index) => {
    analysis.rank = index + 1;
    analysis.returnPercentage = parseFloat(
      (((analysis.avgUnits - bestUnits) / bestUnits) * 100).toFixed(2)
    );

    if (index < 3) {
      analysis.recommendation = 'Best';
    } else if (index < 8) {
      analysis.recommendation = 'Good';
    } else if (index < 20) {
      analysis.recommendation = 'Average';
    } else {
      analysis.recommendation = 'Below Average';
    }
  });

  const bestDays = dayWiseAnalysis.slice(0, 3).map((d) => d.day);
  const worstDays = dayWiseAnalysis.slice(-3).map((d) => d.day);
  const optimalDate = dayWiseAnalysis[0].day;
  const worstUnits = dayWiseAnalysis[dayWiseAnalysis.length - 1].avgUnits;
  const potentialExtraReturns = parseFloat(
    (((bestUnits - worstUnits) / worstUnits) * 100).toFixed(2)
  );

  // Calculate consistency score
  const avgUnitsDeviation =
    dayWiseAnalysis.reduce(
      (sum, d) => sum + Math.abs(d.avgUnits - bestUnits),
      0
    ) / dayWiseAnalysis.length;
  const consistencyScore = Math.max(
    0,
    Math.min(100, 100 - (avgUnitsDeviation / bestUnits) * 200)
  );

  // Generate recommendation
  let recommendation = '';
  if (potentialExtraReturns > 2) {
    recommendation = `🎯 SIP on ${ordinal(optimalDate)} can give you ${potentialExtraReturns}% more units over time compared to worst dates. High impact!`;
  } else if (potentialExtraReturns > 0.5) {
    recommendation = `✅ SIP on ${ordinal(optimalDate)} offers slight advantage (~${potentialExtraReturns}% more units). Moderate impact.`;
  } else {
    recommendation = `📊 Date selection has minimal impact (~${potentialExtraReturns}% difference). Focus on consistency rather than timing.`;
  }

  // Calculate historical comparison for common dates (5th, 15th, 25th)
  const currentNav = performances[performances.length - 1].nav;

  const comparisonData = {
    date5thSIP: calculateSipReturns(5, dayWiseData, sipAmount, currentNav),
    date15thSIP: calculateSipReturns(15, dayWiseData, sipAmount, currentNav),
    date25thSIP: calculateSipReturns(25, dayWiseData, sipAmount, currentNav),
    bestDate: {
      date: optimalDate,
      ...calculateSipReturns(optimalDate, dayWiseData, sipAmount, currentNav),
    },
  };

  // Generate summary
  const summary = `Over ${analysisMonths} months, investing on ${ordinal(
    optimalDate
  )} would have given you ${comparisonData.bestDate.returns.toFixed(
    2
  )}% returns vs ${comparisonData.date15thSIP.returns.toFixed(
    2
  )}% on 15th. Difference: ${(
    comparisonData.bestDate.returns - comparisonData.date15thSIP.returns
  ).toFixed(2)}%.`;

  return {
    fundId: fund.id,
    fundName: fund.name,
    analysisStartDate: startDate,
    analysisEndDate: endDate,
    totalMonthsAnalyzed: analysisMonths,
    bestDays,
    worstDays,
    dayWiseAnalysis: dayWiseAnalysis.sort((a, b) => a.day - b.day),
    insights: {
      optimalDate,
      potentialExtraReturns,
      consistencyScore: parseFloat(consistencyScore.toFixed(2)),
      recommendation,
    },
    comparisonData,
    summary,
  };
}

/**
 * Calculate SIP returns for a specific date
 */
function calculateSipReturns(
  day: number,
  dayWiseData: Map<number, { navs: number[]; dates: Date[] }>,
  sipAmount: number,
  currentNav: number
): {
  avgUnits: number;
  totalUnits: number;
  totalInvested: number;
  currentValue: number;
  returns: number;
} {
  const data = dayWiseData.get(day);

  if (!data || data.navs.length === 0) {
    return {
      avgUnits: 0,
      totalUnits: 0,
      totalInvested: 0,
      currentValue: 0,
      returns: 0,
    };
  }

  const totalUnits = data.navs.reduce((sum, nav) => sum + sipAmount / nav, 0);
  const avgUnits = totalUnits / data.navs.length;
  const totalInvested = sipAmount * data.navs.length;
  const currentValue = totalUnits * currentNav;
  const returns = ((currentValue - totalInvested) / totalInvested) * 100;

  return {
    avgUnits: parseFloat(avgUnits.toFixed(4)),
    totalUnits: parseFloat(totalUnits.toFixed(4)),
    totalInvested,
    currentValue: parseFloat(currentValue.toFixed(2)),
    returns: parseFloat(returns.toFixed(2)),
  };
}

/**
 * Helper function to convert number to ordinal string
 */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
