/**
 * ML Module - Smart Score Calculator
 * Computes AI-based fund rating using multiple financial metrics
 */

export interface SmartScoreInput {
  alpha?: number; // Alpha ratio (excess return)
  beta?: number; // Beta ratio (market volatility)
  stdDev?: number; // Standard deviation (volatility)
  returns1Y?: number; // 1-year returns (%)
  returns3Y?: number; // 3-year returns (%)
  returns5Y?: number; // 5-year returns (%)
  sharpeRatio?: number; // Sharpe ratio
  sortinoRatio?: number; // Sortino ratio
  expenseRatio?: number; // Expense ratio (%)
  aum?: number; // Assets under management (Cr)
  consistencyIndex?: number; // Consistency of returns (0-100)
  maxDrawdown?: number; // Maximum drawdown (%)
  informationRatio?: number; // Information ratio
}

export interface SmartScoreOutput {
  score: number; // Overall score (0-100)
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
  summary: string;
  breakdown: {
    returnScore: number;
    riskScore: number;
    consistencyScore: number;
    costScore: number;
    alphaScore: number;
  };
  insights: string[];
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

/**
 * Normalize value to 0-100 scale
 */
function normalize(
  value: number,
  min: number,
  max: number,
  inverse = false
): number {
  const normalized = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return inverse ? 100 - clamped : clamped;
}

/**
 * Calculate weighted average returns score
 */
function calculateReturnScore(input: SmartScoreInput): number {
  const weights = { returns1Y: 0.3, returns3Y: 0.4, returns5Y: 0.3 };
  let score = 0;
  let totalWeight = 0;

  if (input.returns1Y !== undefined) {
    // Normalize 1Y returns: -20% to 50%
    score += normalize(input.returns1Y, -20, 50) * weights.returns1Y;
    totalWeight += weights.returns1Y;
  }

  if (input.returns3Y !== undefined) {
    // Normalize 3Y returns: 0% to 30%
    score += normalize(input.returns3Y, 0, 30) * weights.returns3Y;
    totalWeight += weights.returns3Y;
  }

  if (input.returns5Y !== undefined) {
    // Normalize 5Y returns: 5% to 25%
    score += normalize(input.returns5Y, 5, 25) * weights.returns5Y;
    totalWeight += weights.returns5Y;
  }

  return totalWeight > 0 ? score / totalWeight : 50; // Default to neutral
}

/**
 * Calculate risk-adjusted score
 */
function calculateRiskScore(input: SmartScoreInput): number {
  let score = 0;
  let count = 0;

  // Beta score (lower is better for risk): 0.5 to 1.5
  if (input.beta !== undefined) {
    const betaScore = normalize(input.beta, 0.5, 1.5, true);
    score += betaScore;
    count++;
  }

  // Volatility score (lower is better): 5% to 30%
  if (input.stdDev !== undefined) {
    const volatilityScore = normalize(input.stdDev, 5, 30, true);
    score += volatilityScore;
    count++;
  }

  // Sharpe ratio (higher is better): -0.5 to 2.5
  if (input.sharpeRatio !== undefined) {
    const sharpeScore = normalize(input.sharpeRatio, -0.5, 2.5);
    score += sharpeScore;
    count++;
  }

  // Max drawdown (lower is better): 5% to 40%
  if (input.maxDrawdown !== undefined) {
    const drawdownScore = normalize(Math.abs(input.maxDrawdown), 5, 40, true);
    score += drawdownScore;
    count++;
  }

  return count > 0 ? score / count : 50;
}

/**
 * Calculate consistency score
 */
function calculateConsistencyScore(input: SmartScoreInput): number {
  let score = 0;
  let count = 0;

  // Direct consistency index
  if (input.consistencyIndex !== undefined) {
    score += input.consistencyIndex;
    count++;
  }

  // Sortino ratio (higher is better): 0 to 3
  if (input.sortinoRatio !== undefined) {
    const sortinoScore = normalize(input.sortinoRatio, 0, 3);
    score += sortinoScore;
    count++;
  }

  // Information ratio (higher is better): -0.5 to 1.5
  if (input.informationRatio !== undefined) {
    const infoScore = normalize(input.informationRatio, -0.5, 1.5);
    score += infoScore;
    count++;
  }

  return count > 0 ? score / count : 50;
}

/**
 * Calculate cost efficiency score
 */
function calculateCostScore(input: SmartScoreInput): number {
  let score = 0;
  let count = 0;

  // Expense ratio (lower is better): 0.5% to 3%
  if (input.expenseRatio !== undefined) {
    const expenseScore = normalize(input.expenseRatio, 0.5, 3, true);
    score += expenseScore;
    count++;
  }

  // AUM score (higher is better for liquidity): 100 Cr to 10000 Cr
  if (input.aum !== undefined) {
    const aumScore = normalize(input.aum, 100, 10000);
    score += aumScore * 0.5; // Lower weight
    count++;
  }

  return count > 0 ? score / count : 50;
}

/**
 * Calculate alpha-based outperformance score
 */
function calculateAlphaScore(input: SmartScoreInput): number {
  if (input.alpha === undefined) return 50;

  // Alpha: -5% to 10%
  return normalize(input.alpha, -5, 10);
}

/**
 * Generate grade based on score
 */
function getGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'D';
}

/**
 * Generate recommendation
 */
function getRecommendation(
  score: number
): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
  if (score >= 85) return 'Strong Buy';
  if (score >= 70) return 'Buy';
  if (score >= 50) return 'Hold';
  if (score >= 35) return 'Sell';
  return 'Strong Sell';
}

/**
 * Generate insights based on breakdown
 */
function generateInsights(
  breakdown: SmartScoreOutput['breakdown'],
  input: SmartScoreInput
): string[] {
  const insights: string[] = [];

  // Return insights
  if (breakdown.returnScore >= 75) {
    insights.push('✅ Exceptional historical returns across all timeframes');
  } else if (breakdown.returnScore >= 60) {
    insights.push('✅ Strong historical returns');
  } else if (breakdown.returnScore < 40) {
    insights.push('⚠️ Below-average returns compared to peers');
  }

  // Risk insights
  if (breakdown.riskScore >= 75) {
    insights.push('✅ Low volatility with excellent risk-adjusted returns');
  } else if (breakdown.riskScore < 40) {
    insights.push('⚠️ High volatility - suitable for risk-tolerant investors');
  }

  // Consistency insights
  if (breakdown.consistencyScore >= 75) {
    insights.push('✅ Highly consistent performance with minimal fluctuations');
  } else if (breakdown.consistencyScore < 40) {
    insights.push(
      '⚠️ Inconsistent returns - may experience periods of underperformance'
    );
  }

  // Cost insights
  if (breakdown.costScore >= 75) {
    insights.push('✅ Low expense ratio - cost-efficient investment');
  } else if (breakdown.costScore < 50) {
    insights.push('⚠️ Higher expense ratio may impact long-term returns');
  }

  // Alpha insights
  if (breakdown.alphaScore >= 70) {
    insights.push('✅ Strong alpha indicates superior fund management');
  } else if (breakdown.alphaScore < 40) {
    insights.push('⚠️ Negative alpha - consider index funds as alternative');
  }

  // Sharpe ratio specific
  if (input.sharpeRatio !== undefined) {
    if (input.sharpeRatio > 2) {
      insights.push(
        '✅ Excellent Sharpe ratio - outstanding risk-adjusted performance'
      );
    } else if (input.sharpeRatio < 0.5) {
      insights.push('⚠️ Low Sharpe ratio - returns may not justify the risk');
    }
  }

  return insights;
}

/**
 * Generate summary text
 */
function generateSummary(
  score: number,
  grade: string,
  recommendation: string,
  input: SmartScoreInput
): string {
  const performance =
    score >= 75
      ? 'exceptional'
      : score >= 60
        ? 'strong'
        : score >= 50
          ? 'moderate'
          : 'weak';

  const riskLevel =
    input.stdDev && input.stdDev < 10
      ? 'low'
      : input.stdDev && input.stdDev > 20
        ? 'high'
        : 'moderate';

  return (
    `This fund has demonstrated ${performance} performance with a grade of ${grade}. ` +
    `Risk profile is ${riskLevel} with ` +
    `${input.returns3Y ? `${input.returns3Y.toFixed(1)}% 3-year returns` : 'historical returns'} ` +
    `and ${input.expenseRatio ? `${input.expenseRatio.toFixed(2)}% expense ratio` : 'competitive costs'}. ` +
    `Investment recommendation: ${recommendation}.`
  );
}

/**
 * Main function to compute smart score
 */
export function computeSmartScore(input: SmartScoreInput): SmartScoreOutput {
  // Calculate individual component scores
  const breakdown = {
    returnScore: calculateReturnScore(input),
    riskScore: calculateRiskScore(input),
    consistencyScore: calculateConsistencyScore(input),
    costScore: calculateCostScore(input),
    alphaScore: calculateAlphaScore(input),
  };

  // Weighted composite score
  const weights = {
    returnScore: 0.35, // 35% weight on returns
    riskScore: 0.25, // 25% weight on risk metrics
    consistencyScore: 0.2, // 20% weight on consistency
    costScore: 0.1, // 10% weight on costs
    alphaScore: 0.1, // 10% weight on alpha
  };

  const score =
    breakdown.returnScore * weights.returnScore +
    breakdown.riskScore * weights.riskScore +
    breakdown.consistencyScore * weights.consistencyScore +
    breakdown.costScore * weights.costScore +
    breakdown.alphaScore * weights.alphaScore;

  const grade = getGrade(score);
  const recommendation = getRecommendation(score);
  const insights = generateInsights(breakdown, input);
  const summary = generateSummary(score, grade, recommendation, input);

  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    grade,
    summary,
    breakdown,
    insights,
    recommendation,
  };
}

/**
 * Batch compute smart scores for multiple funds
 */
export function computeSmartScoreBatch(
  inputs: SmartScoreInput[]
): SmartScoreOutput[] {
  return inputs.map((input) => computeSmartScore(input));
}

/**
 * Compare two funds based on smart scores
 */
export function compareFunds(
  fund1: SmartScoreInput,
  fund2: SmartScoreInput
): {
  winner: 'fund1' | 'fund2' | 'tie';
  score1: SmartScoreOutput;
  score2: SmartScoreOutput;
  comparison: string;
} {
  const score1 = computeSmartScore(fund1);
  const score2 = computeSmartScore(fund2);

  let winner: 'fund1' | 'fund2' | 'tie';
  if (Math.abs(score1.score - score2.score) < 2) {
    winner = 'tie';
  } else {
    winner = score1.score > score2.score ? 'fund1' : 'fund2';
  }

  const comparison =
    winner === 'tie'
      ? 'Both funds have similar overall scores and risk-return profiles.'
      : winner === 'fund1'
        ? `Fund 1 outperforms with ${(score1.score - score2.score).toFixed(1)} points higher score.`
        : `Fund 2 outperforms with ${(score2.score - score1.score).toFixed(1)} points higher score.`;

  return { winner, score1, score2, comparison };
}
