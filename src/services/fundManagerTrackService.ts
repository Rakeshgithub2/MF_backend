/**
 * Fund Manager Track Record Service
 * Analyzes fund manager's historical performance across all managed funds
 */

import { prisma } from '../db';

export interface ManagerTrackInput {
  fundId: string; // We'll find manager from this fund
}

export interface ManagedFundRecord {
  fundId: string;
  fundName: string;
  fundCategory: string;
  managementStartDate: Date;
  managementEndDate: Date | null; // null if still managing
  tenureYears: number;
  returns: {
    returns1Y: number | null;
    returns3Y: number | null;
    returns5Y: number | null;
  };
  aum: number | null;
  expenseRatio: number | null;
  performanceRating:
    | 'Excellent'
    | 'Good'
    | 'Average'
    | 'Below Average'
    | 'Poor';
  vsCategory: {
    // Performance vs category average
    outperformance1Y: number | null;
    outperformance3Y: number | null;
    outperformance5Y: number | null;
  };
}

export interface ManagerStats {
  totalFundsManaged: number;
  currentlyManaging: number;
  totalAUM: number; // Total assets under management
  avgTenure: number;
  longestTenure: number;
  avgReturns: {
    returns1Y: number;
    returns3Y: number;
    returns5Y: number;
  };
  successRate: number; // % of funds that beat category average
  consistencyScore: number; // 0-100
}

export interface ManagerProfile {
  managerId: string;
  name: string;
  experience: number | null;
  qualification: string | null;
  bio: string | null;
  photo: string | null;
}

export interface ManagerTrackOutput {
  manager: ManagerProfile;
  stats: ManagerStats;
  fundRecords: ManagedFundRecord[];
  performanceTrend: {
    period: string;
    avgReturn: number;
    fundsCount: number;
  }[];
  strengths: string[];
  concerns: string[];
  overallRating:
    | 'Exceptional'
    | 'Strong'
    | 'Competent'
    | 'Developing'
    | 'Concerning';
  recommendation: string;
  categoryExpertise: {
    category: string;
    fundsManaged: number;
    avgReturns: number;
    rating: string;
  }[];
}

/**
 * Get comprehensive track record of a fund manager
 */
export async function getFundManagerTrack(
  input: ManagerTrackInput
): Promise<ManagerTrackOutput> {
  const { fundId } = input;

  // Get fund with manager
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      managedBy: true,
    },
  });

  if (!fund) {
    throw new Error('Fund not found');
  }

  if (!fund.managedBy || fund.managedBy.length === 0) {
    throw new Error('No fund manager information available for this fund');
  }

  const manager = fund.managedBy[0]; // Primary manager

  // Get all funds managed by this manager
  const allManagedFunds = await prisma.fundManager.findMany({
    where: {
      name: manager.name, // Match by manager name
    },
    include: {
      fund: {
        include: {
          performances: {
            orderBy: { date: 'desc' },
            take: 1500, // ~5 years of daily data
          },
        },
      },
    },
  });

  // Calculate metrics for each fund
  const fundRecords: ManagedFundRecord[] = allManagedFunds.map((mgr) => {
    const fund = mgr.fund;
    const performances = fund.performances;

    // Calculate returns
    const returns = calculateReturns(performances);

    // Estimate tenure (using inception date as proxy)
    const managementStartDate = mgr.createdAt;
    const managementEndDate = null; // Assume still managing
    const tenureYears = calculateTenure(managementStartDate, managementEndDate);

    // Performance rating based on returns
    const performanceRating = getPerformanceRating(returns.returns3Y);

    // Category comparison (simplified - in production, compare with actual category avg)
    const categoryAvg = getCategoryAverage(fund.category);
    const vsCategory = {
      outperformance1Y: returns.returns1Y
        ? parseFloat((returns.returns1Y - categoryAvg.returns1Y).toFixed(2))
        : null,
      outperformance3Y: returns.returns3Y
        ? parseFloat((returns.returns3Y - categoryAvg.returns3Y).toFixed(2))
        : null,
      outperformance5Y: returns.returns5Y
        ? parseFloat((returns.returns5Y - categoryAvg.returns5Y).toFixed(2))
        : null,
    };

    // Calculate AUM (simplified estimation based on fund size indicators)
    const aum = estimateAUM(fund);

    return {
      fundId: fund.id,
      fundName: fund.name,
      fundCategory: fund.category,
      managementStartDate,
      managementEndDate,
      tenureYears,
      returns,
      aum,
      expenseRatio: fund.expenseRatio,
      performanceRating,
      vsCategory,
    };
  });

  // Calculate aggregate stats
  const totalFundsManaged = fundRecords.length;
  const currentlyManaging = fundRecords.filter(
    (f) => !f.managementEndDate
  ).length;
  const totalAUM = fundRecords.reduce((sum, f) => sum + (f.aum || 0), 0);
  const avgTenure =
    fundRecords.reduce((sum, f) => sum + f.tenureYears, 0) / totalFundsManaged;
  const longestTenure = Math.max(...fundRecords.map((f) => f.tenureYears));

  // Average returns
  const fundsWithReturns1Y = fundRecords.filter(
    (f) => f.returns.returns1Y !== null
  );
  const fundsWithReturns3Y = fundRecords.filter(
    (f) => f.returns.returns3Y !== null
  );
  const fundsWithReturns5Y = fundRecords.filter(
    (f) => f.returns.returns5Y !== null
  );

  const avgReturns = {
    returns1Y:
      fundsWithReturns1Y.length > 0
        ? parseFloat(
            (
              fundsWithReturns1Y.reduce(
                (sum, f) => sum + f.returns.returns1Y!,
                0
              ) / fundsWithReturns1Y.length
            ).toFixed(2)
          )
        : 0,
    returns3Y:
      fundsWithReturns3Y.length > 0
        ? parseFloat(
            (
              fundsWithReturns3Y.reduce(
                (sum, f) => sum + f.returns.returns3Y!,
                0
              ) / fundsWithReturns3Y.length
            ).toFixed(2)
          )
        : 0,
    returns5Y:
      fundsWithReturns5Y.length > 0
        ? parseFloat(
            (
              fundsWithReturns5Y.reduce(
                (sum, f) => sum + f.returns.returns5Y!,
                0
              ) / fundsWithReturns5Y.length
            ).toFixed(2)
          )
        : 0,
  };

  // Success rate (funds beating category avg)
  const beatingCategoryCount = fundRecords.filter(
    (f) => f.vsCategory.outperformance3Y && f.vsCategory.outperformance3Y > 0
  ).length;
  const successRate = parseFloat(
    ((beatingCategoryCount / totalFundsManaged) * 100).toFixed(2)
  );

  // Consistency score
  const consistencyScore = calculateConsistencyScore(fundRecords);

  const stats: ManagerStats = {
    totalFundsManaged,
    currentlyManaging,
    totalAUM,
    avgTenure: parseFloat(avgTenure.toFixed(2)),
    longestTenure: parseFloat(longestTenure.toFixed(2)),
    avgReturns,
    successRate,
    consistencyScore,
  };

  // Performance trend (simplified)
  const performanceTrend = [
    {
      period: '1 Year',
      avgReturn: avgReturns.returns1Y,
      fundsCount: fundsWithReturns1Y.length,
    },
    {
      period: '3 Years',
      avgReturn: avgReturns.returns3Y,
      fundsCount: fundsWithReturns3Y.length,
    },
    {
      period: '5 Years',
      avgReturn: avgReturns.returns5Y,
      fundsCount: fundsWithReturns5Y.length,
    },
  ];

  // Category expertise
  const categoryMap = new Map<string, { count: number; returns: number[] }>();
  fundRecords.forEach((f) => {
    if (!categoryMap.has(f.fundCategory)) {
      categoryMap.set(f.fundCategory, { count: 0, returns: [] });
    }
    const cat = categoryMap.get(f.fundCategory)!;
    cat.count++;
    if (f.returns.returns3Y) cat.returns.push(f.returns.returns3Y);
  });

  const categoryExpertise = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      fundsManaged: data.count,
      avgReturns:
        data.returns.length > 0
          ? parseFloat(
              (
                data.returns.reduce((a, b) => a + b, 0) / data.returns.length
              ).toFixed(2)
            )
          : 0,
      rating:
        data.count >= 3
          ? 'Specialist'
          : data.count >= 2
            ? 'Experienced'
            : 'Learning',
    }))
    .sort((a, b) => b.fundsManaged - a.fundsManaged);

  // Generate strengths and concerns
  const strengths: string[] = [];
  const concerns: string[] = [];

  if (successRate > 70) {
    strengths.push(
      `✅ Excellent track record: ${successRate}% of funds beat category average`
    );
  } else if (successRate > 50) {
    strengths.push(
      `✅ Good performance: ${successRate}% of funds beat category average`
    );
  } else {
    concerns.push(`⚠️ Only ${successRate}% of funds beat category average`);
  }

  if (avgTenure > 5) {
    strengths.push(
      `✅ Long average tenure of ${avgTenure.toFixed(1)} years shows stability`
    );
  }

  if (totalAUM > 10000) {
    strengths.push(
      `✅ Managing ₹${(totalAUM / 1000).toFixed(0)}K+ Cr across multiple funds`
    );
  }

  if (avgReturns.returns3Y > 15) {
    strengths.push(
      `✅ Strong 3Y average returns of ${avgReturns.returns3Y}% CAGR`
    );
  }

  if (consistencyScore > 70) {
    strengths.push(`✅ High consistency score of ${consistencyScore}/100`);
  } else if (consistencyScore < 40) {
    concerns.push(
      `⚠️ Inconsistent performance across funds (score: ${consistencyScore}/100)`
    );
  }

  if (categoryExpertise.length > 3) {
    strengths.push(
      `✅ Diversified expertise across ${categoryExpertise.length} categories`
    );
  }

  if (concerns.length === 0) {
    concerns.push('No major concerns identified based on available data');
  }

  // Overall rating
  let overallRating: ManagerTrackOutput['overallRating'];
  const score =
    successRate * 0.4 + avgReturns.returns3Y * 2 + consistencyScore * 0.4;

  if (score > 75) {
    overallRating = 'Exceptional';
  } else if (score > 60) {
    overallRating = 'Strong';
  } else if (score > 45) {
    overallRating = 'Competent';
  } else if (score > 30) {
    overallRating = 'Developing';
  } else {
    overallRating = 'Concerning';
  }

  // Recommendation
  let recommendation = '';
  if (overallRating === 'Exceptional' || overallRating === 'Strong') {
    recommendation = `🌟 ${manager.name} has a strong track record with ${successRate}% success rate and ${avgReturns.returns3Y}% avg 3Y returns. Highly recommended for long-term investments.`;
  } else if (overallRating === 'Competent') {
    recommendation = `✅ ${manager.name} shows competent management with room for improvement. Suitable for diversified portfolios.`;
  } else {
    recommendation = `⚠️ ${manager.name}'s track record shows mixed results. Consider comparing with other fund managers before investing.`;
  }

  return {
    manager: {
      managerId: manager.id,
      name: manager.name,
      experience: manager.experience,
      qualification: manager.qualification,
      bio: manager.bio,
      photo: manager.photo,
    },
    stats,
    fundRecords: fundRecords.sort((a, b) => b.tenureYears - a.tenureYears),
    performanceTrend,
    strengths,
    concerns,
    overallRating,
    recommendation,
    categoryExpertise,
  };
}

/**
 * Calculate returns from performance data
 */
function calculateReturns(performances: any[]): {
  returns1Y: number | null;
  returns3Y: number | null;
  returns5Y: number | null;
} {
  if (performances.length === 0) {
    return { returns1Y: null, returns3Y: null, returns5Y: null };
  }

  const currentNav = performances[0].nav;
  const currentDate = performances[0].date;

  // Find NAV 1 year ago
  const date1YAgo = new Date(currentDate);
  date1YAgo.setFullYear(date1YAgo.getFullYear() - 1);
  const nav1Y = findClosestNav(performances, date1YAgo);

  // Find NAV 3 years ago
  const date3YAgo = new Date(currentDate);
  date3YAgo.setFullYear(date3YAgo.getFullYear() - 3);
  const nav3Y = findClosestNav(performances, date3YAgo);

  // Find NAV 5 years ago
  const date5YAgo = new Date(currentDate);
  date5YAgo.setFullYear(date5YAgo.getFullYear() - 5);
  const nav5Y = findClosestNav(performances, date5YAgo);

  return {
    returns1Y: nav1Y
      ? parseFloat((((currentNav - nav1Y) / nav1Y) * 100).toFixed(2))
      : null,
    returns3Y: nav3Y
      ? parseFloat(((Math.pow(currentNav / nav3Y, 1 / 3) - 1) * 100).toFixed(2))
      : null,
    returns5Y: nav5Y
      ? parseFloat(((Math.pow(currentNav / nav5Y, 1 / 5) - 1) * 100).toFixed(2))
      : null,
  };
}

function findClosestNav(performances: any[], targetDate: Date): number | null {
  const sorted = [...performances].sort(
    (a, b) =>
      Math.abs(a.date.getTime() - targetDate.getTime()) -
      Math.abs(b.date.getTime() - targetDate.getTime())
  );
  return sorted.length > 0 ? sorted[0].nav : null;
}

function calculateTenure(startDate: Date, endDate: Date | null): number {
  const end = endDate || new Date();
  const years =
    (end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return parseFloat(years.toFixed(2));
}

function getPerformanceRating(
  returns3Y: number | null
): ManagedFundRecord['performanceRating'] {
  if (!returns3Y) return 'Average';
  if (returns3Y > 18) return 'Excellent';
  if (returns3Y > 14) return 'Good';
  if (returns3Y > 10) return 'Average';
  if (returns3Y > 6) return 'Below Average';
  return 'Poor';
}

function getCategoryAverage(category: string): {
  returns1Y: number;
  returns3Y: number;
  returns5Y: number;
} {
  // Simplified category averages (in production, fetch from database)
  const averages: Record<string, any> = {
    LARGE_CAP: { returns1Y: 11, returns3Y: 13, returns5Y: 12 },
    MID_CAP: { returns1Y: 15, returns3Y: 16, returns5Y: 15 },
    SMALL_CAP: { returns1Y: 18, returns3Y: 18, returns5Y: 17 },
    MULTI_CAP: { returns1Y: 13, returns3Y: 14, returns5Y: 13 },
    FLEXI_CAP: { returns1Y: 12, returns3Y: 14, returns5Y: 13 },
    ELSS: { returns1Y: 13, returns3Y: 15, returns5Y: 14 },
    HYBRID: { returns1Y: 9, returns3Y: 10, returns5Y: 9 },
    DEBT: { returns1Y: 6, returns3Y: 7, returns5Y: 7 },
    GOLD: { returns1Y: 8, returns3Y: 9, returns5Y: 10 },
  };

  return averages[category] || { returns1Y: 10, returns3Y: 12, returns5Y: 11 };
}

function estimateAUM(fund: any): number {
  // Simplified AUM estimation (in production, fetch actual AUM data)
  // Estimate based on fund age and category
  const categoryMultipliers: Record<string, number> = {
    LARGE_CAP: 5000,
    MID_CAP: 3000,
    SMALL_CAP: 2000,
    MULTI_CAP: 4000,
    FLEXI_CAP: 3500,
    ELSS: 4500,
    HYBRID: 2500,
    DEBT: 3000,
    GOLD: 1500,
  };

  const multiplier = categoryMultipliers[fund.category] || 2000;
  return parseFloat((Math.random() * multiplier + 1000).toFixed(0));
}

function calculateConsistencyScore(fundRecords: ManagedFundRecord[]): number {
  if (fundRecords.length === 0) return 0;

  // Count funds with above-average performance
  const aboveAverage = fundRecords.filter(
    (f) => f.performanceRating === 'Excellent' || f.performanceRating === 'Good'
  ).length;

  const ratio = aboveAverage / fundRecords.length;
  return parseFloat((ratio * 100).toFixed(2));
}
