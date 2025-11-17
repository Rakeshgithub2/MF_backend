/**
 * Performance Prediction Module
 * Time series forecasting and trend analysis
 */

export interface PredictionResult {
  predicted: {
    returns1M: number;
    returns3M: number;
    returns6M: number;
    returns1Y: number;
  };
  confidence: number; // 0-100
  trend:
    | 'Strong Uptrend'
    | 'Uptrend'
    | 'Sideways'
    | 'Downtrend'
    | 'Strong Downtrend';
  momentum: number; // -100 to 100
  support: number; // Support level
  resistance: number; // Resistance level
  signals: string[];
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }

  return sma;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));

  // Calculate subsequent EMAs
  for (let i = 1; i < data.length; i++) {
    const emaValue = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(emaValue);
  }

  return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate smoothed RS
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const macdHistory = ema12
    .map((val, i) => val - ema26[i])
    .filter((val) => !isNaN(val));

  const signalLine = calculateEMA(macdHistory, 9);
  const signal = signalLine[signalLine.length - 1];
  const histogram = macdLine - signal;

  return { macd: macdLine, signal, histogram };
}

/**
 * Detect trend using linear regression
 */
function detectTrend(prices: number[]): {
  slope: number;
  trend:
    | 'Strong Uptrend'
    | 'Uptrend'
    | 'Sideways'
    | 'Downtrend'
    | 'Strong Downtrend';
} {
  const n = prices.length;
  const xMean = (n - 1) / 2;
  const yMean = prices.reduce((sum, p) => sum + p, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (prices[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = numerator / denominator;
  const normalizedSlope = (slope / yMean) * 100; // As percentage

  let trend: PredictionResult['trend'];
  if (normalizedSlope > 2) trend = 'Strong Uptrend';
  else if (normalizedSlope > 0.5) trend = 'Uptrend';
  else if (normalizedSlope > -0.5) trend = 'Sideways';
  else if (normalizedSlope > -2) trend = 'Downtrend';
  else trend = 'Strong Downtrend';

  return { slope, trend };
}

/**
 * Calculate support and resistance levels
 */
function calculateLevels(prices: number[]): {
  support: number;
  resistance: number;
} {
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(prices.length * 0.25)];
  const q3 = sorted[Math.floor(prices.length * 0.75)];

  return {
    support: q1,
    resistance: q3,
  };
}

/**
 * Simple linear extrapolation for future returns
 */
function predictReturns(
  returns: number[],
  slope: number
): PredictionResult['predicted'] {
  const latestReturn = returns[returns.length - 1] || 0;
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Weight recent performance more
  const weightedAvg = avgReturn * 0.3 + latestReturn * 0.7;

  // Add trend component
  const trendFactor = slope * 0.1;

  return {
    returns1M: weightedAvg * 0.3 + trendFactor,
    returns3M: weightedAvg * 0.8 + trendFactor * 2,
    returns6M: weightedAvg * 1.5 + trendFactor * 3,
    returns1Y: weightedAvg * 3 + trendFactor * 5,
  };
}

/**
 * Calculate momentum score
 */
function calculateMomentum(
  prices: number[],
  rsi: number,
  macd: { histogram: number }
): number {
  // Combine multiple momentum indicators
  const priceChange =
    ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
  const rsiMomentum = (rsi - 50) * 2; // -100 to 100
  const macdMomentum = macd.histogram > 0 ? 20 : -20;

  const momentum = priceChange * 0.5 + rsiMomentum * 0.3 + macdMomentum * 0.2;

  return Math.max(-100, Math.min(100, momentum));
}

/**
 * Generate trading signals
 */
function generateSignals(
  rsi: number,
  macd: { histogram: number },
  trend: string,
  momentum: number
): string[] {
  const signals: string[] = [];

  // RSI signals
  if (rsi > 70) signals.push('⚠️ Overbought (RSI > 70) - Potential reversal');
  else if (rsi < 30)
    signals.push('✅ Oversold (RSI < 30) - Potential buying opportunity');

  // MACD signals
  if (macd.histogram > 0) signals.push('✅ MACD Bullish - Upward momentum');
  else signals.push('⚠️ MACD Bearish - Downward momentum');

  // Trend signals
  if (trend.includes('Uptrend'))
    signals.push('✅ Strong upward trend detected');
  else if (trend.includes('Downtrend'))
    signals.push('⚠️ Downward trend - Exercise caution');

  // Momentum signals
  if (momentum > 50) signals.push('✅ Strong positive momentum');
  else if (momentum < -50) signals.push('⚠️ Strong negative momentum');

  return signals;
}

/**
 * Main prediction function
 */
export function predictPerformance(
  navHistory: Array<{ date: string; nav: number }>
): PredictionResult {
  if (navHistory.length < 30) {
    // Insufficient data
    return {
      predicted: { returns1M: 0, returns3M: 0, returns6M: 0, returns1Y: 0 },
      confidence: 0,
      trend: 'Sideways',
      momentum: 0,
      support: 0,
      resistance: 0,
      signals: ['⚠️ Insufficient historical data for accurate prediction'],
    };
  }

  // Extract prices
  const prices = navHistory.map((h) => h.nav);

  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100);
  }

  // Technical indicators
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const { slope, trend } = detectTrend(prices);
  const { support, resistance } = calculateLevels(prices);
  const momentum = calculateMomentum(prices, rsi, macd);

  // Predictions
  const predicted = predictReturns(returns, slope);

  // Confidence calculation
  const volatility = calculateVolatility(returns);
  const dataQuality = Math.min(navHistory.length / 252, 1); // 1 year = 252 trading days
  const confidence = Math.round(
    (1 - Math.min(volatility / 30, 1)) * 50 + dataQuality * 50
  );

  // Generate signals
  const signals = generateSignals(rsi, macd, trend, momentum);

  return {
    predicted,
    confidence,
    trend,
    momentum: Math.round(momentum),
    support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100,
    signals,
  };
}

/**
 * Calculate volatility helper
 */
function calculateVolatility(returns: number[]): number {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.map((r) => Math.pow(r - mean, 2)).reduce((sum, sq) => sum + sq, 0) /
    returns.length;
  return Math.sqrt(variance);
}

/**
 * Batch predictions for multiple funds
 */
export function predictPerformanceBatch(
  funds: Array<{ id: string; navHistory: Array<{ date: string; nav: number }> }>
): Array<{ fundId: string; prediction: PredictionResult }> {
  return funds.map((fund) => ({
    fundId: fund.id,
    prediction: predictPerformance(fund.navHistory),
  }));
}
