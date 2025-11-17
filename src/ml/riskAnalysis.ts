/**
 * Risk Analysis Module
 * Advanced risk metrics and portfolio risk calculations
 */

export interface RiskMetrics {
  volatility: number; // Standard deviation
  beta: number; // Market beta
  sharpeRatio: number; // Risk-adjusted return
  sortinoRatio: number; // Downside risk-adjusted return
  maxDrawdown: number; // Maximum peak-to-trough decline
  valueAtRisk: number; // VaR at 95% confidence
  conditionalVaR: number; // Expected shortfall
  informationRatio: number; // Active return / tracking error
  treynorRatio: number; // Return per unit of systematic risk
}

export interface RiskProfile {
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  riskScore: number; // 0-100
  suitableFor: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, sd) => sum + sd, 0) / returns.length;

  return Math.sqrt(variance);
}

/**
 * Calculate beta (correlation with market)
 */
export function calculateBeta(
  fundReturns: number[],
  marketReturns: number[]
): number {
  if (fundReturns.length !== marketReturns.length || fundReturns.length < 2) {
    return 1.0; // Default to market beta
  }

  const n = fundReturns.length;
  const fundMean = fundReturns.reduce((sum, r) => sum + r, 0) / n;
  const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (fundReturns[i] - fundMean) * (marketReturns[i] - marketMean);
    marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
  }

  covariance /= n;
  marketVariance /= n;

  return marketVariance > 0 ? covariance / marketVariance : 1.0;
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 6.5
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  const volatility = calculateVolatility(returns);

  return volatility > 0 ? excessReturn / volatility : 0;
}

/**
 * Calculate Sortino Ratio (uses only downside deviation)
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 6.5
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;

  // Calculate downside deviation (only negative returns)
  const downsideReturns = returns.filter((r) => r < riskFreeRate);
  if (downsideReturns.length === 0) return excessReturn > 0 ? 999 : 0;

  const downsideVariance =
    downsideReturns
      .map((r) => Math.pow(r - riskFreeRate, 2))
      .reduce((sum, sd) => sum + sd, 0) / returns.length;

  const downsideDeviation = Math.sqrt(downsideVariance);

  return downsideDeviation > 0 ? excessReturn / downsideDeviation : 0;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = 100; // Starting value
  let maxDrawdown = 0;
  let currentValue = 100;

  for (const ret of returns) {
    currentValue *= 1 + ret / 100;
    if (currentValue > peak) peak = currentValue;

    const drawdown = ((peak - currentValue) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

/**
 * Calculate Value at Risk (VaR) at 95% confidence
 */
export function calculateVaR(
  returns: number[],
  confidence: number = 0.95
): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);

  return Math.abs(sorted[index] || 0);
}

/**
 * Calculate Conditional VaR (Expected Shortfall)
 */
export function calculateConditionalVaR(
  returns: number[],
  confidence: number = 0.95
): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor((1 - confidence) * sorted.length);

  const worstReturns = sorted.slice(0, cutoffIndex);
  if (worstReturns.length === 0) return 0;

  const avgWorst =
    worstReturns.reduce((sum, r) => sum + r, 0) / worstReturns.length;

  return Math.abs(avgWorst);
}

/**
 * Calculate Information Ratio
 */
export function calculateInformationRatio(
  fundReturns: number[],
  benchmarkReturns: number[]
): number {
  if (
    fundReturns.length !== benchmarkReturns.length ||
    fundReturns.length === 0
  ) {
    return 0;
  }

  const activeReturns = fundReturns.map(
    (fr, i) => fr - (benchmarkReturns[i] || 0)
  );
  const avgActiveReturn =
    activeReturns.reduce((sum, ar) => sum + ar, 0) / activeReturns.length;
  const trackingError = calculateVolatility(activeReturns);

  return trackingError > 0 ? avgActiveReturn / trackingError : 0;
}

/**
 * Calculate Treynor Ratio
 */
export function calculateTreynorRatio(
  returns: number[],
  beta: number,
  riskFreeRate: number = 6.5
): number {
  if (returns.length === 0 || beta === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;

  return excessReturn / beta;
}

/**
 * Comprehensive risk analysis
 */
export function analyzeRisk(
  returns: number[],
  marketReturns: number[] = [],
  riskFreeRate: number = 6.5
): RiskMetrics {
  const volatility = calculateVolatility(returns);
  const beta =
    marketReturns.length > 0 ? calculateBeta(returns, marketReturns) : 1.0;
  const sharpeRatio = calculateSharpeRatio(returns, riskFreeRate);
  const sortinoRatio = calculateSortinoRatio(returns, riskFreeRate);
  const maxDrawdown = calculateMaxDrawdown(returns);
  const valueAtRisk = calculateVaR(returns);
  const conditionalVaR = calculateConditionalVaR(returns);
  const informationRatio =
    marketReturns.length > 0
      ? calculateInformationRatio(returns, marketReturns)
      : 0;
  const treynorRatio = calculateTreynorRatio(returns, beta, riskFreeRate);

  return {
    volatility,
    beta,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    valueAtRisk,
    conditionalVaR,
    informationRatio,
    treynorRatio,
  };
}

/**
 * Generate risk profile
 */
export function generateRiskProfile(metrics: RiskMetrics): RiskProfile {
  // Calculate risk score (0-100, lower is better)
  let riskScore = 0;
  riskScore += Math.min((metrics.volatility / 30) * 100, 100) * 0.3;
  riskScore += Math.min((metrics.maxDrawdown / 40) * 100, 100) * 0.3;
  riskScore += Math.min((metrics.valueAtRisk / 20) * 100, 100) * 0.2;
  riskScore += Math.max(0, (1.5 - metrics.beta) / 1.5) * 100 * 0.2;

  // Invert to make higher = better
  riskScore = 100 - riskScore;

  // Determine risk level
  let riskLevel: RiskProfile['riskLevel'];
  if (riskScore >= 80) riskLevel = 'Very Low';
  else if (riskScore >= 65) riskLevel = 'Low';
  else if (riskScore >= 45) riskLevel = 'Moderate';
  else if (riskScore >= 25) riskLevel = 'High';
  else riskLevel = 'Very High';

  // Suitable investor types
  const suitableFor: string[] = [];
  if (riskScore >= 65) {
    suitableFor.push('Conservative Investors', 'Retirees', 'Income Seekers');
  } else if (riskScore >= 45) {
    suitableFor.push('Balanced Investors', 'Long-term Goals');
  } else {
    suitableFor.push('Aggressive Investors', 'Young Investors', 'Risk Takers');
  }

  // Generate warnings
  const warnings: string[] = [];
  if (metrics.volatility > 20) {
    warnings.push('High volatility - expect significant price fluctuations');
  }
  if (metrics.maxDrawdown > 25) {
    warnings.push('Large historical drawdowns - prepare for potential losses');
  }
  if (metrics.sharpeRatio < 0.5) {
    warnings.push('Low risk-adjusted returns - consider alternatives');
  }
  if (metrics.beta > 1.3) {
    warnings.push('High market sensitivity - amplified market movements');
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (metrics.sharpeRatio > 1.5) {
    recommendations.push('Excellent risk-adjusted returns');
  }
  if (metrics.sortinoRatio > 2) {
    recommendations.push('Strong downside protection');
  }
  if (metrics.informationRatio > 0.5) {
    recommendations.push('Active management adding value');
  }

  return {
    riskLevel,
    riskScore: Math.round(riskScore),
    suitableFor,
    warnings,
    recommendations,
  };
}
