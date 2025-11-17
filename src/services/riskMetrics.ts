/**
 * Risk Metrics Calculation Service
 * Calculates Sharpe Ratio, Beta, Alpha, and other risk-adjusted metrics
 */

interface PerformanceData {
  date: Date;
  nav: number;
  returns?: number;
}

interface RiskMetrics {
  sharpeRatio: number;
  beta: number;
  alpha: number;
  volatility: number;
  sortinoRatio: number;
  maxDrawdown: number;
  informationRatio: number;
}

export class RiskMetricsService {
  private readonly RISK_FREE_RATE = 6.5; // 6.5% per annum (approximate Indian T-bill rate)
  private readonly MARKET_RETURN = 12; // 12% per annum (approximate Nifty 50 return)
  private readonly TRADING_DAYS_PER_YEAR = 252;

  /**
   * Calculate Sharpe Ratio
   * Formula: (Portfolio Return - Risk Free Rate) / Portfolio Volatility
   * Higher is better (>1 is good, >2 is very good, >3 is excellent)
   */
  calculateSharpeRatio(
    returns: number[],
    riskFreeRate: number = this.RISK_FREE_RATE
  ): number {
    if (returns.length === 0) return 0;

    const avgReturn = this.calculateMean(returns);
    const volatility = this.calculateVolatility(returns);

    if (volatility === 0) return 0;

    // Annualize returns
    const annualizedReturn = avgReturn * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    const annualizedVolatility =
      volatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR);

    const sharpeRatio =
      (annualizedReturn - riskFreeRate) / annualizedVolatility;

    return Number(sharpeRatio.toFixed(2));
  }

  /**
   * Calculate Beta
   * Formula: Covariance(Portfolio, Market) / Variance(Market)
   * Beta = 1: moves with market, >1: more volatile, <1: less volatile
   */
  calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
    if (
      portfolioReturns.length === 0 ||
      marketReturns.length === 0 ||
      portfolioReturns.length !== marketReturns.length
    ) {
      return 1; // Default to market beta
    }

    const covariance = this.calculateCovariance(
      portfolioReturns,
      marketReturns
    );
    const marketVariance = this.calculateVariance(marketReturns);

    if (marketVariance === 0) return 1;

    const beta = covariance / marketVariance;

    return Number(beta.toFixed(2));
  }

  /**
   * Calculate Alpha (Jensen's Alpha)
   * Formula: Portfolio Return - [Risk Free Rate + Beta * (Market Return - Risk Free Rate)]
   * Positive alpha means outperformance, negative means underperformance
   */
  calculateAlpha(
    portfolioReturn: number,
    beta: number,
    marketReturn: number = this.MARKET_RETURN,
    riskFreeRate: number = this.RISK_FREE_RATE
  ): number {
    const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    const alpha = portfolioReturn - expectedReturn;

    return Number(alpha.toFixed(2));
  }

  /**
   * Calculate Volatility (Standard Deviation)
   * Measures how much returns deviate from average
   */
  calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = this.calculateMean(returns);
    const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate Sortino Ratio
   * Similar to Sharpe but only considers downside volatility
   * Better measure as it doesn't penalize upside volatility
   */
  calculateSortinoRatio(
    returns: number[],
    riskFreeRate: number = this.RISK_FREE_RATE
  ): number {
    if (returns.length === 0) return 0;

    const avgReturn = this.calculateMean(returns);
    const downsideReturns = returns.filter((r) => r < 0);

    if (downsideReturns.length === 0) return 999; // No downside = infinite Sortino

    const downsideVolatility = this.calculateVolatility(downsideReturns);

    if (downsideVolatility === 0) return 0;

    const annualizedReturn = avgReturn * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    const annualizedDownsideVol =
      downsideVolatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR);

    const sortinoRatio =
      (annualizedReturn - riskFreeRate) / annualizedDownsideVol;

    return Number(sortinoRatio.toFixed(2));
  }

  /**
   * Calculate Maximum Drawdown
   * Largest peak-to-trough decline in portfolio value
   */
  calculateMaxDrawdown(navData: number[]): number {
    if (navData.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = navData[0];

    for (const nav of navData) {
      if (nav > peak) {
        peak = nav;
      }

      const drawdown = ((peak - nav) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return Number(maxDrawdown.toFixed(2));
  }

  /**
   * Calculate Information Ratio
   * Measures excess return per unit of tracking error
   * Formula: (Portfolio Return - Benchmark Return) / Tracking Error
   */
  calculateInformationRatio(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): number {
    if (
      portfolioReturns.length === 0 ||
      benchmarkReturns.length === 0 ||
      portfolioReturns.length !== benchmarkReturns.length
    ) {
      return 0;
    }

    const excessReturns = portfolioReturns.map(
      (pr, i) => pr - benchmarkReturns[i]
    );
    const avgExcessReturn = this.calculateMean(excessReturns);
    const trackingError = this.calculateVolatility(excessReturns);

    if (trackingError === 0) return 0;

    const informationRatio = avgExcessReturn / trackingError;

    return Number(informationRatio.toFixed(2));
  }

  /**
   * Calculate all risk metrics at once
   */
  calculateAllMetrics(
    navData: PerformanceData[],
    marketReturns?: number[]
  ): RiskMetrics {
    // Calculate daily returns
    const returns = this.calculateReturns(navData);

    // Use default market returns if not provided (simulate Nifty 50)
    const defaultMarketReturns =
      marketReturns || this.generateMarketReturns(returns.length);

    // Calculate annual return
    const totalReturn = this.calculateTotalReturn(navData);
    const years = navData.length / this.TRADING_DAYS_PER_YEAR;
    const annualizedReturn =
      (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;

    // Calculate metrics
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const beta = this.calculateBeta(returns, defaultMarketReturns);
    const alpha = this.calculateAlpha(annualizedReturn, beta);
    const volatility =
      this.calculateVolatility(returns) * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(navData.map((d) => d.nav));
    const informationRatio = this.calculateInformationRatio(
      returns,
      defaultMarketReturns
    );

    return {
      sharpeRatio,
      beta,
      alpha,
      volatility: Number(volatility.toFixed(2)),
      sortinoRatio,
      maxDrawdown,
      informationRatio,
    };
  }

  // ========== HELPER FUNCTIONS ==========

  private calculateMean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = this.calculateMean(numbers);
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateCovariance(arr1: number[], arr2: number[]): number {
    if (arr1.length === 0 || arr1.length !== arr2.length) return 0;

    const mean1 = this.calculateMean(arr1);
    const mean2 = this.calculateMean(arr2);

    let covariance = 0;
    for (let i = 0; i < arr1.length; i++) {
      covariance += (arr1[i] - mean1) * (arr2[i] - mean2);
    }

    return covariance / arr1.length;
  }

  private calculateReturns(navData: PerformanceData[]): number[] {
    const returns: number[] = [];

    for (let i = 1; i < navData.length; i++) {
      const prevNav = navData[i - 1].nav;
      const currentNav = navData[i].nav;

      if (prevNav > 0) {
        const dailyReturn = ((currentNav - prevNav) / prevNav) * 100;
        returns.push(dailyReturn);
      }
    }

    return returns;
  }

  private calculateTotalReturn(navData: PerformanceData[]): number {
    if (navData.length < 2) return 0;

    const startNav = navData[0].nav;
    const endNav = navData[navData.length - 1].nav;

    return ((endNav - startNav) / startNav) * 100;
  }

  /**
   * Generate simulated market returns (Nifty 50 approximation)
   * Uses random walk with drift matching historical Nifty performance
   */
  private generateMarketReturns(length: number): number[] {
    const dailyReturn = this.MARKET_RETURN / this.TRADING_DAYS_PER_YEAR;
    const volatility = 15 / Math.sqrt(this.TRADING_DAYS_PER_YEAR); // 15% annual volatility

    const returns: number[] = [];

    for (let i = 0; i < length; i++) {
      // Random walk with drift
      const randomShock = (Math.random() - 0.5) * 2; // -1 to 1
      const dailyRet = dailyReturn + randomShock * volatility;
      returns.push(dailyRet);
    }

    return returns;
  }
}

// Export singleton instance
export const riskMetricsService = new RiskMetricsService();
